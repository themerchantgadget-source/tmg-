import type { EqPresetId, VaultItem } from '../types/workspace';
import { getVaultBlob } from './vaultDb';

export const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000] as const;
export const EQ_LABELS = ['60Hz', '230Hz', '910Hz', '3.6k', '14k'] as const;

export const EQ_PRESETS: Record<
  EqPresetId,
  [number, number, number, number, number]
> = {
  Flat: [0, 0, 0, 0, 0],
  Bass: [6, 4, 0, -1, 1],
  Vocal: [-2, 1, 5, 4, 1],
  Treble: [-1, 0, 2, 5, 6],
  Rock: [5, 2, -1, 3, 5],
  Chill: [3, 2, 0, -2, 2],
};

export interface StudioPlaybackState {
  activeId: string | null;
  kind: 'audio' | 'video' | null;
  playing: boolean;
  buffering: boolean;
  time: number;
  duration: number;
  speed: number;
  volume: number;
  muted: boolean;
  boost: 1 | 1.5 | 2;
  repeat: 'off' | 'all' | 'one';
  shuffle: boolean;
  loopA: number | null;
  loopB: number | null;
  sleepUntil: number;
  queue: string[];
  eq: [number, number, number, number, number];
  leveler: boolean;
  theater: boolean;
  rotated: boolean;
  fitMode: 'fit' | 'fill';
  error: string;
}

type Listener = (state: StudioPlaybackState) => void;

const state: StudioPlaybackState = {
  activeId: null,
  kind: null,
  playing: false,
  buffering: false,
  time: 0,
  duration: 0,
  speed: 1,
  volume: 1,
  muted: false,
  boost: 1,
  repeat: 'off',
  shuffle: false,
  loopA: null,
  loopB: null,
  sleepUntil: 0,
  queue: [],
  eq: [0, 0, 0, 0, 0],
  leveler: false,
  theater: false,
  rotated: false,
  fitMode: 'fit',
  error: '',
};

const listeners = new Set<Listener>();
let audioEl: HTMLAudioElement | null = null;
let videoEl: HTMLVideoElement | null = null;
let currentObjectUrl: string | null = null;
let loadToken = 0;

let audioCtx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;
let analyserNode: AnalyserNode | null = null;
let filterNodes: BiquadFilterNode[] = [];
const wiredMedia = new WeakSet<HTMLMediaElement>();

let resolver:
  | ((
      id: string
    ) => Promise<{ item: VaultItem; blob: Blob } | null>)
  | null = null;
let onPlayedCb: ((id: string) => void) | null = null;
let onProgressCb: ((id: string, time: number, dur?: number) => void) | null =
  null;

function emit() {
  const snapshot: StudioPlaybackState = {
    ...state,
    queue: [...state.queue],
    eq: [...state.eq] as [number, number, number, number, number],
  };
  listeners.forEach((fn) => fn(snapshot));
}

function getActiveMedia(): HTMLMediaElement | null {
  if (state.kind === 'video') return ensureMedia('video');
  if (state.kind === 'audio') return ensureMedia('audio');
  return null;
}

function applyAudioGraphParams() {
  const el = getActiveMedia();
  if (el) {
    el.muted = state.muted;
    if (!audioCtx) {
      el.volume = state.muted ? 0 : state.volume;
    }
  }
  if (gainNode) {
    gainNode.gain.value = state.muted ? 0 : state.volume * state.boost;
  }
  filterNodes.forEach((node, idx) => {
    node.gain.value = state.eq[idx] ?? 0;
  });
  if (compressorNode) {
    compressorNode.threshold.value = state.leveler ? -20 : 0;
    compressorNode.ratio.value = state.leveler ? 6 : 1;
  }
}

function ensureWebAudio(el: HTMLMediaElement) {
  if (typeof window === 'undefined' || wiredMedia.has(el)) return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) {
      audioCtx = new Ctx();
      filterNodes = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = audioCtx!.createBiquadFilter();
        filter.type =
          idx === 0 ? 'lowshelf' : idx === 4 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = state.eq[idx] ?? 0;
        return filter;
      });
      compressorNode = audioCtx.createDynamicsCompressor();
      gainNode = audioCtx.createGain();
      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 64;
      analyserNode.smoothingTimeConstant = 0.78;

      let tail: AudioNode = filterNodes[0];
      for (let i = 1; i < filterNodes.length; i++) {
        tail.connect(filterNodes[i]);
        tail = filterNodes[i];
      }
      tail.connect(compressorNode);
      compressorNode.connect(gainNode);
      gainNode.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);
    }

    const source = audioCtx.createMediaElementSource(el);
    source.connect(filterNodes[0]);
    wiredMedia.add(el);
    applyAudioGraphParams();
  } catch {
    // Fallback to native element volume if MediaElementSource cannot attach
  }
}

function attachMediaEvents(el: HTMLMediaElement, kind: 'audio' | 'video') {
  el.addEventListener('timeupdate', () => {
    if (state.kind !== kind) return;
    state.time = el.currentTime || 0;
    if (
      state.loopA !== null &&
      state.loopB !== null &&
      el.currentTime >= state.loopB
    ) {
      el.currentTime = state.loopA;
    }
    if (state.sleepUntil > 0 && Date.now() >= state.sleepUntil) {
      state.sleepUntil = 0;
      el.pause();
    }
    emit();
  });

  el.addEventListener('durationchange', () => {
    if (state.kind !== kind) return;
    if (Number.isFinite(el.duration) && el.duration > 0) {
      state.duration = el.duration;
      if (state.activeId) {
        onProgressCb?.(state.activeId, el.currentTime || 0, el.duration);
      }
      emit();
    }
  });

  el.addEventListener('playing', () => {
    if (state.kind !== kind) return;
    state.playing = true;
    state.buffering = false;
    state.error = '';
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    emit();
  });

  el.addEventListener('pause', () => {
    if (state.kind !== kind) return;
    state.playing = false;
    state.buffering = false;
    if (state.activeId) {
      onProgressCb?.(state.activeId, el.currentTime || 0, state.duration);
    }
    emit();
  });

  el.addEventListener('waiting', () => {
    if (state.kind !== kind) return;
    state.buffering = true;
    emit();
  });

  el.addEventListener('ended', () => {
    if (state.kind !== kind) return;
    state.playing = false;
    void nextTrack(true);
  });

  el.addEventListener('error', () => {
    if (state.kind !== kind) return;
    state.playing = false;
    state.buffering = false;
    state.error = 'Playback failed for this file format';
    emit();
  });
}

export function ensureMedia(kind: 'audio' | 'video'): HTMLMediaElement | null {
  if (typeof document === 'undefined') return null;
  if (kind === 'audio') {
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.preload = 'auto';
      attachMediaEvents(audioEl, 'audio');
    }
    return audioEl;
  }
  if (!videoEl) {
    videoEl = document.createElement('video');
    videoEl.preload = 'auto';
    videoEl.playsInline = true;
    attachMediaEvents(videoEl, 'video');
  }
  return videoEl;
}

export function attachVideoCanvasContainer(container: HTMLDivElement | null) {
  const v = ensureMedia('video') as HTMLVideoElement | null;
  if (!v || !container) return;
  if (v.parentElement !== container) {
    v.className = `w-full h-full ${
      state.fitMode === 'fill' ? 'object-cover' : 'object-contain'
    }`;
    container.innerHTML = '';
    container.appendChild(v);
  }
}

export function configureStudioEngine(hooks: {
  resolveItem: (id: string) => Promise<{ item: VaultItem; blob: Blob } | null>;
  onPlayed?: (id: string) => void;
  onProgress?: (id: string, time: number, dur?: number) => void;
}) {
  resolver = hooks.resolveItem;
  onPlayedCb = hooks.onPlayed ?? null;
  onProgressCb = hooks.onProgress ?? null;
}

export function subscribeStudio(listener: Listener): () => void {
  listeners.add(listener);
  listener({
    ...state,
    queue: [...state.queue],
    eq: [...state.eq] as [number, number, number, number, number],
  });
  return () => listeners.delete(listener);
}

export function getAnalyserBars(count = 18): number[] {
  if (!analyserNode || !state.playing) {
    return Array.from({ length: count }, (_, i) => 0.14 + (i % 3) * 0.04);
  }
  try {
    const buf = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(buf);
    const bars: number[] = [];
    const step = Math.max(1, Math.floor(buf.length / count));
    for (let i = 0; i < count; i++) {
      const val = buf[Math.min(buf.length - 1, i * step)] / 255;
      bars.push(Math.max(0.12, val));
    }
    return bars;
  } catch {
    return Array.from({ length: count }, (_, i) => 0.14 + (i % 3) * 0.04);
  }
}

export async function extractWaveformPeaks(
  itemId: string,
  barCount = 72
): Promise<number[]> {
  let ctx: AudioContext | null = null;
  try {
    const blob = await getVaultBlob(itemId);
    if (!blob || blob.size > 40 * 1024 * 1024) {
      return fallbackWaveform(itemId, barCount);
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return fallbackWaveform(itemId, barCount);
    ctx = new Ctx();
    const buf = await blob.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(buf);
    const channel = audioBuf.getChannelData(0);
    const block = Math.max(1, Math.floor(channel.length / barCount));
    const peaks: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const start = i * block;
      let peak = 0;
      for (let j = 0; j < block; j += Math.max(1, Math.floor(block / 40))) {
        const v = Math.abs(channel[start + j] || 0);
        if (v > peak) peak = v;
      }
      peaks.push(Math.max(0.14, Math.min(1, peak)));
    }
    return peaks;
  } catch {
    return fallbackWaveform(itemId, barCount);
  } finally {
    if (ctx) {
      ctx.close().catch(() => {});
    }
  }
}

export function fallbackWaveform(seed: string, barCount = 72): number[] {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Array.from({ length: barCount }, (_, idx) => {
    const x = Math.sin(idx * 0.43 + (hash % 17)) * 0.5 + 0.5;
    return 0.22 + x * 0.72;
  });
}

export async function playVaultItem(id: string, queue?: string[]) {
  if (!resolver) return;
  const myToken = ++loadToken;
  try {
    const resolved = await resolver(id);
    if (!resolved || myToken !== loadToken) return;

    const { item, blob } = resolved;
    const kind = item.kind === 'video' ? 'video' : 'audio';

    if (queue) {
      state.queue = [...queue];
    } else if (!state.queue.includes(id)) {
      state.queue = [id, ...state.queue];
    }

    // Stop previous active element cleanly
    audioEl?.pause();
    videoEl?.pause();
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }

    state.activeId = id;
    state.kind = kind;
    state.playing = false;
    state.buffering = true;
    state.time = item.progress || 0;
    state.duration = item.duration || 0;
    state.loopA = null;
    state.loopB = null;
    state.error = '';
    emit();

    const el = ensureMedia(kind);
    if (!el) return;
    ensureWebAudio(el);

    const objectUrl = URL.createObjectURL(blob);
    currentObjectUrl = objectUrl;
    el.src = objectUrl;
    el.playbackRate = state.speed;
    el.defaultPlaybackRate = state.speed;

    el.addEventListener(
      'loadedmetadata',
      () => {
        if (myToken !== loadToken) return;
        if (Number.isFinite(el.duration) && el.duration > 0) {
          state.duration = el.duration;
        }
        if (item.progress > 1 && item.progress < (state.duration || 0) - 2) {
          try {
            el.currentTime = item.progress;
          } catch {
            // Ignore seek fail
          }
        }
        emit();
      },
      { once: true }
    );

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: item.title || item.name,
          artist: item.artist || 'tmg Studio',
          album: 'tmg Workspace',
        });
        navigator.mediaSession.setActionHandler('play', () => void togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => void togglePlay());
        navigator.mediaSession.setActionHandler('previoustrack', () =>
          void prevTrack()
        );
        navigator.mediaSession.setActionHandler('nexttrack', () =>
          void nextTrack(false)
        );
      } catch {
        // Ignore unsupported mediaSession
      }
    }

    await el.play();
    if (myToken !== loadToken) return;
    onPlayedCb?.(id);
  } catch (err) {
    if (myToken !== loadToken) return;
    state.buffering = false;
    state.playing = false;
    if (err instanceof Error && err.name !== 'NotAllowedError') {
      state.error = err.message || 'Could not start playback';
    }
    emit();
  }
}

export async function togglePlay() {
  const el = getActiveMedia();
  if (!el || !state.activeId) return;
  if (el.paused) {
    if (audioCtx && audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
    }
    await el.play().catch(() => {});
  } else {
    el.pause();
  }
}

export function stopPlayback() {
  loadToken++;
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute('src');
    audioEl.load();
  }
  if (videoEl) {
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
  state.activeId = null;
  state.kind = null;
  state.playing = false;
  state.time = 0;
  state.duration = 0;
  state.theater = false;
  state.rotated = false;
  emit();
}

export function seekTo(seconds: number) {
  const el = getActiveMedia();
  if (!el || !Number.isFinite(seconds)) return;
  const maxDur =
    Number.isFinite(el.duration) && el.duration > 0
      ? el.duration
      : state.duration || seconds;
  const clamped = Math.max(0, Math.min(seconds, maxDur));
  try {
    el.currentTime = clamped;
  } catch {
    // Ignore
  }
  state.time = clamped;
  emit();
}

export function seekBy(delta: number) {
  const el = getActiveMedia();
  const cur = el && Number.isFinite(el.currentTime) ? el.currentTime : state.time;
  seekTo(cur + delta);
}

export async function nextTrack(fromEnded = false) {
  if (state.queue.length === 0) return;
  if (fromEnded && state.repeat === 'one' && state.activeId) {
    seekTo(0);
    await togglePlay();
    return;
  }
  if (state.shuffle && state.queue.length > 1) {
    const pool = state.queue.filter((id) => id !== state.activeId);
    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (picked) await playVaultItem(picked);
    return;
  }
  const idx = state.activeId ? state.queue.indexOf(state.activeId) : -1;
  const nextIdx = idx + 1;
  if (nextIdx >= state.queue.length) {
    if (state.repeat === 'all' || !fromEnded) {
      await playVaultItem(state.queue[0]);
    } else {
      seekTo(0);
    }
    return;
  }
  await playVaultItem(state.queue[nextIdx]);
}

export async function prevTrack() {
  if (state.time > 3) {
    seekTo(0);
    return;
  }
  if (state.queue.length === 0) return;
  const idx = state.activeId ? state.queue.indexOf(state.activeId) : 0;
  const prevIdx = idx <= 0 ? state.queue.length - 1 : idx - 1;
  await playVaultItem(state.queue[prevIdx]);
}

export function setSpeed(speed: number) {
  state.speed = speed;
  if (audioEl) audioEl.playbackRate = speed;
  if (videoEl) videoEl.playbackRate = speed;
  emit();
}

export function setVolume(vol: number) {
  state.volume = Math.max(0, Math.min(1, vol));
  if (state.volume > 0) state.muted = false;
  applyAudioGraphParams();
  emit();
}

export function toggleMute() {
  state.muted = !state.muted;
  applyAudioGraphParams();
  emit();
}

export function setBoost(boost: 1 | 1.5 | 2) {
  state.boost = boost;
  applyAudioGraphParams();
  emit();
}

export function setEqBands(bands: [number, number, number, number, number]) {
  state.eq = [...bands] as [number, number, number, number, number];
  applyAudioGraphParams();
  emit();
}

export function setVolumeLeveler(on: boolean) {
  state.leveler = on;
  applyAudioGraphParams();
  emit();
}

export function cycleRepeat() {
  state.repeat =
    state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
  emit();
}

export function toggleShuffle() {
  state.shuffle = !state.shuffle;
  emit();
}

export function toggleABLoop() {
  if (state.loopA === null) {
    state.loopA = state.time;
  } else if (state.loopB === null) {
    if (state.time > state.loopA + 0.5) {
      state.loopB = state.time;
    } else {
      state.loopA = null;
    }
  } else {
    state.loopA = null;
    state.loopB = null;
  }
  emit();
}

export function setSleepMinutes(mins: number) {
  state.sleepUntil = mins > 0 ? Date.now() + mins * 60_000 : 0;
  emit();
}

export function setTheaterMode(on: boolean) {
  state.theater = on;
  if (!on) state.rotated = false;
  emit();
}

export function toggleTheaterRotation() {
  state.rotated = !state.rotated;
  emit();
}

export function toggleVideoFitMode() {
  state.fitMode = state.fitMode === 'fit' ? 'fill' : 'fit';
  if (videoEl) {
    videoEl.className = `w-full h-full ${
      state.fitMode === 'fill' ? 'object-cover' : 'object-contain'
    }`;
  }
  emit();
}

export function setQueue(queue: string[]) {
  state.queue = [...queue];
  emit();
}

export function queuePlayNext(id: string) {
  const filtered = state.queue.filter((q) => q !== id);
  const idx = state.activeId ? filtered.indexOf(state.activeId) : -1;
  if (idx >= 0) {
    filtered.splice(idx + 1, 0, id);
  } else {
    filtered.unshift(id);
  }
  state.queue = filtered;
  emit();
}

export function moveQueueItem(fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= state.queue.length ||
    toIndex >= state.queue.length
  ) {
    return;
  }
  const next = [...state.queue];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  state.queue = next;
  emit();
}

export function removeFromQueue(id: string) {
  state.queue = state.queue.filter((q) => q !== id);
  emit();
}

export function captureVideoFramePng(): string | null {
  if (!videoEl || videoEl.videoWidth <= 0) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoEl, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
