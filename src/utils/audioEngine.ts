import type { EqPresetId, VaultItem } from '../types/workspace';
import { getVaultBlob } from './vaultDb';

export const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000] as const;
export const EQ_LABELS = ['60Hz', '230Hz', '910Hz', '3.6k', '14k'] as const;
export const EQ_PRESETS: Record<EqPresetId, [number, number, number, number, number]> = {
  Flat: [0, 0, 0, 0, 0], Bass: [6, 4, 0, -1, 1], Vocal: [-2, 1, 5, 4, 1],
  Treble: [-1, 0, 2, 5, 6], Rock: [5, 2, -1, 3, 5], Chill: [3, 2, 0, -2, 2],
};

export interface StudioPlaybackState {
  activeId: string | null; kind: 'audio' | 'video' | null; playing: boolean; buffering: boolean;
  time: number; duration: number; speed: number; volume: number; muted: boolean;
  boost: 1 | 1.5 | 2; repeat: 'off' | 'all' | 'one'; shuffle: boolean;
  loopA: number | null; loopB: number | null; sleepUntil: number; queue: string[];
  eq: [number, number, number, number, number]; leveler: boolean; theater: boolean;
  rotated: boolean; fitMode: 'fit' | 'fill'; error: string;
}
type Listener = (state: StudioPlaybackState) => void;
const state: StudioPlaybackState = {
  activeId: null, kind: null, playing: false, buffering: false, time: 0, duration: 0,
  speed: 1, volume: 1, muted: false, boost: 1, repeat: 'off', shuffle: false,
  loopA: null, loopB: null, sleepUntil: 0, queue: [], eq: [0, 0, 0, 0, 0],
  leveler: false, theater: false, rotated: false, fitMode: 'fit', error: '',
};
const listeners = new Set<Listener>();
let audioEl: HTMLAudioElement | null = null;
let videoEl: HTMLVideoElement | null = null;
let currentObjectUrl: string | null = null;
let loadToken = 0;
let lastUiTime = 0;
let lastPersistTime = 0;
const UI_TICK_MS = 400;
const PROGRESS_SAVE_MS = 5000;
let audioCtx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;
let analyserNode: AnalyserNode | null = null;
let filterNodes: BiquadFilterNode[] = [];
const wiredMedia = new WeakSet<HTMLMediaElement>();
let resolver: ((id: string) => Promise<{ item: VaultItem; blob: Blob } | null>) | null = null;
let onPlayedCb: ((id: string) => void) | null = null;
let onProgressCb: ((id: string, time: number, dur?: number) => void) | null = null;

function snapshot(): StudioPlaybackState {
  return { ...state, queue: [...state.queue], eq: [...state.eq] as [number, number, number, number, number] };
}
function emit() { const value = snapshot(); listeners.forEach((fn) => fn(value)); }
function getActiveMedia(): HTMLMediaElement | null {
  if (state.kind === 'video') return ensureMedia('video');
  if (state.kind === 'audio') return ensureMedia('audio');
  return null;
}
function saveProgress(el: HTMLMediaElement, force = false) {
  if (!state.activeId) return;
  const now = Date.now();
  if (!force && now - lastPersistTime < PROGRESS_SAVE_MS) return;
  lastPersistTime = now;
  onProgressCb?.(state.activeId, el.currentTime || 0, Number.isFinite(el.duration) ? el.duration : state.duration);
}
function applyAudioGraphParams() {
  const el = getActiveMedia();
  if (el) {
    el.muted = state.muted;
    if (!wiredMedia.has(el)) el.volume = state.muted ? 0 : state.volume;
  }
  if (gainNode && audioCtx) gainNode.gain.setTargetAtTime(state.muted ? 0 : state.volume * state.boost, audioCtx.currentTime, 0.015);
  filterNodes.forEach((node, idx) => {
    if (audioCtx) node.gain.setTargetAtTime(state.eq[idx] ?? 0, audioCtx.currentTime, 0.015);
  });
  if (compressorNode && audioCtx) {
    compressorNode.threshold.setTargetAtTime(state.leveler ? -20 : 0, audioCtx.currentTime, 0.015);
    compressorNode.ratio.setTargetAtTime(state.leveler ? 6 : 1, audioCtx.currentTime, 0.015);
  }
}
function ensureWebAudio(el: HTMLMediaElement) {
  if (typeof window === 'undefined' || wiredMedia.has(el)) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) {
      audioCtx = new Ctx();
      filterNodes = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = audioCtx!.createBiquadFilter();
        filter.type = idx === 0 ? 'lowshelf' : idx === 4 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq; filter.Q.value = 1; filter.gain.value = state.eq[idx] ?? 0;
        return filter;
      });
      compressorNode = audioCtx.createDynamicsCompressor();
      gainNode = audioCtx.createGain();
      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 64; analyserNode.smoothingTimeConstant = 0.78;
      let tail: AudioNode = filterNodes[0];
      for (let i = 1; i < filterNodes.length; i++) { tail.connect(filterNodes[i]); tail = filterNodes[i]; }
      tail.connect(compressorNode); compressorNode.connect(gainNode); gainNode.connect(analyserNode); analyserNode.connect(audioCtx.destination);
    }
    const source = audioCtx.createMediaElementSource(el);
    source.connect(filterNodes[0]); wiredMedia.add(el); applyAudioGraphParams();
  } catch {
    // Native media playback remains available if Web Audio is unsupported.
  }
}
function attachMediaEvents(el: HTMLMediaElement, kind: 'audio' | 'video') {
  const isCurrent = () => state.kind === kind && getActiveMedia() === el;
  el.addEventListener('timeupdate', () => {
    if (!isCurrent()) return;
    const time = el.currentTime || 0;
    if (state.loopA !== null && state.loopB !== null && time >= state.loopB) el.currentTime = state.loopA;
    if (state.sleepUntil > 0 && Date.now() >= state.sleepUntil) { state.sleepUntil = 0; el.pause(); }
    const now = Date.now();
    if (now - lastUiTime >= UI_TICK_MS) {
      state.time = time; lastUiTime = now; emit();
    }
    saveProgress(el);
  });
  el.addEventListener('durationchange', () => {
    if (!isCurrent()) return;
    if (Number.isFinite(el.duration) && el.duration > 0) {
      state.duration = el.duration; onProgressCb?.(state.activeId || '', el.currentTime || 0, el.duration); emit();
    }
  });
  el.addEventListener('playing', () => {
    if (!isCurrent()) return;
    state.playing = true; state.buffering = false; state.error = '';
    if (audioCtx?.state === 'suspended') void audioCtx.resume().catch(() => {});
    emit();
  });
  el.addEventListener('pause', () => {
    if (!isCurrent()) return;
    state.playing = false; state.buffering = false; state.time = el.currentTime || 0;
    saveProgress(el, true); emit();
  });
  el.addEventListener('waiting', () => { if (isCurrent() && !state.buffering) { state.buffering = true; emit(); } });
  el.addEventListener('canplay', () => { if (isCurrent() && state.buffering) { state.buffering = false; emit(); } });
  el.addEventListener('ended', () => { if (isCurrent()) { state.playing = false; state.time = el.currentTime || state.duration; emit(); void nextTrack(true); } });
  el.addEventListener('error', () => {
    if (!isCurrent()) return;
    state.playing = false; state.buffering = false;
    state.error = el.error?.message || 'Playback failed. This file format may not be supported by this browser.';
    emit();
  });
}
export function ensureMedia(kind: 'audio' | 'video'): HTMLMediaElement | null {
  if (typeof document === 'undefined') return null;
  if (kind === 'audio') {
    if (!audioEl) { audioEl = document.createElement('audio'); audioEl.preload = 'metadata'; audioEl.setAttribute('playsinline', ''); attachMediaEvents(audioEl, 'audio'); }
    return audioEl;
  }
  if (!videoEl) { videoEl = document.createElement('video'); videoEl.preload = 'metadata'; videoEl.playsInline = true; videoEl.setAttribute('playsinline', ''); videoEl.disablePictureInPicture = true; attachMediaEvents(videoEl, 'video'); }
  return videoEl;
}
export function attachVideoCanvasContainer(container: HTMLDivElement | null) {
  const video = ensureMedia('video') as HTMLVideoElement | null;
  if (!video || !container) return;
  if (video.parentElement !== container) {
    video.className = `w-full h-full ${state.fitMode === 'fill' ? 'object-cover' : 'object-contain'}`;
    video.controls = false;
    container.replaceChildren(video);
  }
}
export function configureStudioEngine(hooks: {
  resolveItem: (id: string) => Promise<{ item: VaultItem; blob: Blob } | null>;
  onPlayed?: (id: string) => void; onProgress?: (id: string, time: number, dur?: number) => void;
}) { resolver = hooks.resolveItem; onPlayedCb = hooks.onPlayed ?? null; onProgressCb = hooks.onProgress ?? null; }
export function subscribeStudio(listener: Listener): () => void { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); }
export function getAnalyserBars(count = 18): number[] {
  if (!analyserNode || !state.playing) return Array.from({ length: count }, (_, i) => 0.14 + (i % 3) * 0.04);
  try {
    const buf = new Uint8Array(analyserNode.frequencyBinCount); analyserNode.getByteFrequencyData(buf);
    return Array.from({ length: count }, (_, i) => Math.max(0.12, buf[Math.min(buf.length - 1, i * Math.max(1, Math.floor(buf.length / count)))] / 255));
  } catch { return Array.from({ length: count }, () => 0.16); }
}
const waveformCache = new Map<string, number[]>();
export async function extractWaveformPeaks(itemId: string, barCount = 72): Promise<number[]> {
  const cacheKey = `${itemId}:${barCount}`;
  const cached = waveformCache.get(cacheKey); if (cached) return cached;
  let ctx: AudioContext | null = null;
  try {
    const blob = await getVaultBlob(itemId);
    // Decoding large media just to draw a waveform competes with playback and can exhaust memory.
    if (!blob || blob.size > 12 * 1024 * 1024) return fallbackWaveform(itemId, barCount);
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return fallbackWaveform(itemId, barCount);
    ctx = new Ctx(); const audioBuf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const channel = audioBuf.getChannelData(0); const block = Math.max(1, Math.floor(channel.length / barCount));
    const peaks = Array.from({ length: barCount }, (_, i) => {
      const start = i * block; let peak = 0; const stride = Math.max(1, Math.floor(block / 32));
      for (let j = 0; j < block; j += stride) peak = Math.max(peak, Math.abs(channel[start + j] || 0));
      return Math.max(0.14, Math.min(1, peak));
    });
    waveformCache.set(cacheKey, peaks); return peaks;
  } catch { return fallbackWaveform(itemId, barCount); }
  finally { if (ctx) void ctx.close().catch(() => {}); }
}
export function fallbackWaveform(seed: string, barCount = 72): number[] {
  let hash = 2166136261; for (let i = 0; i < seed.length; i++) { hash ^= seed.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return Array.from({ length: barCount }, (_, idx) => 0.22 + (Math.sin(idx * 0.43 + (hash % 17)) * 0.5 + 0.5) * 0.72);
}
function clearMediaSource(el: HTMLMediaElement | null) {
  if (!el) return;
  el.pause(); el.removeAttribute('src'); el.load();
}
function releaseCurrentUrl() {
  if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
}
export async function playVaultItem(id: string, queue?: string[]) {
  if (!resolver) return;
  const myToken = ++loadToken;
  // Stop the previous item immediately, rather than letting it play while the new blob loads.
  const previous = getActiveMedia();
  if (previous) { previous.pause(); saveProgress(previous, true); }
  state.playing = false; state.buffering = true; state.error = ''; state.activeId = id;
  state.time = 0; state.duration = 0; state.loopA = null; state.loopB = null;
  if (queue) state.queue = [...queue]; else if (!state.queue.includes(id)) state.queue = [id, ...state.queue];
  emit();
  try {
    const resolved = await resolver(id);
    if (!resolved || myToken !== loadToken) return;
    const { item, blob } = resolved;
    const kind = item.kind === 'video' ? 'video' : 'audio';
    state.kind = kind; state.time = item.progress || 0; state.duration = item.duration || 0;
    const el = ensureMedia(kind);
    if (!el) throw new Error('Media playback is unavailable in this browser.');
    // Clear both elements before revoking their old URL to avoid stale decoder reads.
    clearMediaSource(audioEl); clearMediaSource(videoEl); releaseCurrentUrl();
    ensureWebAudio(el);
    const url = URL.createObjectURL(blob); currentObjectUrl = url;
    el.preload = 'auto'; el.src = url; el.playbackRate = state.speed; el.defaultPlaybackRate = state.speed;
    el.addEventListener('loadedmetadata', () => {
      if (myToken !== loadToken) return;
      if (Number.isFinite(el.duration) && el.duration > 0) state.duration = el.duration;
      if (item.progress > 1 && item.progress < (state.duration || 0) - 2) {
        try { el.currentTime = item.progress; } catch { /* Wait for seekable metadata. */ }
      }
      emit();
    }, { once: true });
    applyAudioGraphParams();
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: item.title || item.name, artist: item.artist || 'tmg Studio', album: 'tmg Workspace' });
        navigator.mediaSession.setActionHandler('play', () => { void togglePlay(); });
        navigator.mediaSession.setActionHandler('pause', () => { pausePlayback(); });
        navigator.mediaSession.setActionHandler('previoustrack', () => { void prevTrack(); });
        navigator.mediaSession.setActionHandler('nexttrack', () => { void nextTrack(false); });
      } catch { /* Media Session is optional. */ }
    }
    await el.play();
    if (myToken !== loadToken) return;
    onPlayedCb?.(id);
  } catch (error) {
    if (myToken !== loadToken) return;
    state.buffering = false; state.playing = false;
    state.error = error instanceof Error ? (error.name === 'NotAllowedError' ? 'Tap play to allow media playback.' : error.message) : 'Could not start playback';
    emit();
  }
}
function pausePlayback() { const el = getActiveMedia(); if (el && !el.paused) el.pause(); }
export async function togglePlay() {
  const el = getActiveMedia(); if (!el || !state.activeId) return;
  if (el.paused) {
    try { if (audioCtx?.state === 'suspended') await audioCtx.resume(); await el.play(); }
    catch (error) { state.error = error instanceof Error ? error.message : 'Could not start playback'; emit(); }
  } else pausePlayback();
}
export function stopPlayback() {
  loadToken++; clearMediaSource(audioEl); clearMediaSource(videoEl); releaseCurrentUrl();
  state.activeId = null; state.kind = null; state.playing = false; state.buffering = false;
  state.time = 0; state.duration = 0; state.theater = false; state.rotated = false; state.error = ''; emit();
}
export function seekTo(seconds: number) {
  const el = getActiveMedia(); if (!el || !Number.isFinite(seconds)) return;
  const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : state.duration;
  const target = Math.max(0, Math.min(seconds, duration || seconds));
  try { el.currentTime = target; } catch { return; }
  state.time = target; lastUiTime = Date.now(); emit(); saveProgress(el, true);
}
export function seekBy(delta: number) { const el = getActiveMedia(); seekTo((el?.currentTime ?? state.time) + delta); }
export async function nextTrack(fromEnded = false) {
  if (!state.queue.length) return;
  if (fromEnded && state.repeat === 'one' && state.activeId) { seekTo(0); await togglePlay(); return; }
  if (state.shuffle && state.queue.length > 1) {
    const pool = state.queue.filter((id) => id !== state.activeId); const picked = pool[Math.floor(Math.random() * pool.length)];
    if (picked) await playVaultItem(picked); return;
  }
  const index = state.activeId ? state.queue.indexOf(state.activeId) : -1; const nextIndex = index + 1;
  if (nextIndex >= state.queue.length) {
    if (state.repeat === 'all' || !fromEnded) await playVaultItem(state.queue[0]);
    else seekTo(0);
    return;
  }
  await playVaultItem(state.queue[nextIndex]);
}
export async function prevTrack() {
  if (state.time > 3) { seekTo(0); return; }
  if (!state.queue.length) return;
  const index = state.activeId ? state.queue.indexOf(state.activeId) : 0;
  await playVaultItem(state.queue[index <= 0 ? state.queue.length - 1 : index - 1]);
}
export function setSpeed(speed: number) { state.speed = Math.max(0.25, Math.min(3, speed)); if (audioEl) audioEl.playbackRate = state.speed; if (videoEl) videoEl.playbackRate = state.speed; emit(); }
export function setVolume(vol: number) { state.volume = Math.max(0, Math.min(1, vol)); if (state.volume > 0) state.muted = false; applyAudioGraphParams(); emit(); }
export function toggleMute() { state.muted = !state.muted; applyAudioGraphParams(); emit(); }
export function setBoost(boost: 1 | 1.5 | 2) { state.boost = boost; applyAudioGraphParams(); emit(); }
export function setEqBands(bands: [number, number, number, number, number]) { state.eq = [...bands] as [number, number, number, number, number]; applyAudioGraphParams(); emit(); }
export function setVolumeLeveler(on: boolean) { state.leveler = on; applyAudioGraphParams(); emit(); }
export function cycleRepeat() { state.repeat = state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off'; emit(); }
export function toggleShuffle() { state.shuffle = !state.shuffle; emit(); }
export function toggleABLoop() {
  if (state.loopA === null) state.loopA = state.time;
  else if (state.loopB === null) state.loopB = state.time > state.loopA + 0.5 ? state.time : null;
  else { state.loopA = null; state.loopB = null; }
  emit();
}
export function setSleepMinutes(mins: number) { state.sleepUntil = mins > 0 ? Date.now() + mins * 60_000 : 0; emit(); }
export function setTheaterMode(on: boolean) { state.theater = on; if (!on) state.rotated = false; emit(); }
export function toggleTheaterRotation() { state.rotated = !state.rotated; emit(); }
export function toggleVideoFitMode() {
  state.fitMode = state.fitMode === 'fit' ? 'fill' : 'fit';
  if (videoEl) videoEl.className = `w-full h-full ${state.fitMode === 'fill' ? 'object-cover' : 'object-contain'}`;
  emit();
}
export function setQueue(queue: string[]) { state.queue = [...queue]; emit(); }
export function queuePlayNext(id: string) {
  const next = state.queue.filter((item) => item !== id); const index = state.activeId ? next.indexOf(state.activeId) : -1;
  next.splice(index >= 0 ? index + 1 : 0, 0, id); state.queue = next; emit();
}
export function moveQueueItem(fromIndex: number, toIndex: number) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= state.queue.length || toIndex >= state.queue.length) return;
  const next = [...state.queue]; const [item] = next.splice(fromIndex, 1); next.splice(toIndex, 0, item); state.queue = next; emit();
}
export function removeFromQueue(id: string) { state.queue = state.queue.filter((item) => item !== id); emit(); }
export function captureVideoFramePng(): string | null {
  if (!videoEl || videoEl.videoWidth <= 0) return null;
  try { const canvas = document.createElement('canvas'); canvas.width = videoEl.videoWidth; canvas.height = videoEl.videoHeight; const ctx = canvas.getContext('2d'); if (!ctx) return null; ctx.drawImage(videoEl, 0, 0); return canvas.toDataURL('image/png'); }
  catch { return null; }
}
