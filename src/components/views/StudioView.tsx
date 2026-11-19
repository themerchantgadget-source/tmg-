import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Disc3,
  Heart,
  ListMusic,
  Lock,
  Maximize2,
  Minimize2,
  Moon,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  EqPresetId,
  VaultItem,
  WorkspaceSettings,
} from '../../types/workspace';
import {
  attachVideoCanvasContainer,
  captureVideoFramePng,
  cycleRepeat,
  EQ_LABELS,
  EQ_PRESETS,
  extractWaveformPeaks,
  fallbackWaveform,
  getAnalyserBars,
  moveQueueItem,
  nextTrack,
  playVaultItem,
  prevTrack,
  removeFromQueue,
  seekBy,
  seekTo,
  setBoost,
  setEqBands,
  setSleepMinutes,
  setSpeed,
  setTheaterMode,
  setVolume,
  setVolumeLeveler,
  type StudioPlaybackState,
  toggleABLoop,
  toggleMute,
  togglePlay,
  toggleShuffle,
  toggleTheaterRotation,
  toggleVideoFitMode,
} from '../../utils/audioEngine';
import { formatMediaClock } from '../../utils/vaultUtils';
import { IconButton, ModalShell, ToggleSwitch, VaultThumb } from '../ui/Controls';

interface StudioViewProps {
  playback: StudioPlaybackState;
  vaultItems: VaultItem[];
  settings: WorkspaceSettings;
  onUpdateSettings: (next: WorkspaceSettings) => void;
  onUpdateItem: (id: string, patch: Partial<VaultItem>) => void;
  onSaveQueueAsCollection: (name: string, ids: string[]) => void;
  onImportMedia: () => void;
  onLoadSampleMedia: () => void;
  onToast: (msg: string) => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function StudioView({
  playback,
  vaultItems,
  settings,
  onUpdateSettings,
  onUpdateItem,
  onSaveQueueAsCollection,
  onImportMedia,
  onLoadSampleMedia,
  onToast,
}: StudioViewProps) {
  const [showEq, setShowEq] = React.useState(false);
  const [showQueue, setShowQueue] = React.useState(false);
  const [showSleep, setShowSleep] = React.useState(false);
  const [showNotes, setShowNotes] = React.useState(false);
  const [vizMode, setVizMode] = React.useState<'art' | 'viz'>('art');
  const [peaks, setPeaks] = React.useState<number[]>(() =>
    fallbackWaveform('studio-default', 72)
  );
  const [vizBars, setVizBars] = React.useState<number[]>(() =>
    Array.from({ length: 18 }, () => 0.18)
  );
  const [theaterLocked, setTheaterLocked] = React.useState(false);
  const [savePlaylistName, setSavePlaylistName] = React.useState('');

  const videoStageRef = React.useRef<HTMLDivElement | null>(null);
  const theaterStageRef = React.useRef<HTMLDivElement | null>(null);

  const playableItems = React.useMemo(
    () => vaultItems.filter((item) => item.kind === 'audio' || item.kind === 'video'),
    [vaultItems]
  );

  const activeItem =
    vaultItems.find((item) => item.id === playback.activeId) ||
    playableItems[0] ||
    null;

  // Load 72-bar waveform peaks for current audio track
  React.useEffect(() => {
    let alive = true;
    if (!activeItem) {
      setPeaks(fallbackWaveform('empty', 72));
      return;
    }
    setPeaks(fallbackWaveform(activeItem.id, 72));
    if (activeItem.kind === 'audio') {
      extractWaveformPeaks(activeItem.id, 72)
        .then((res) => {
          if (alive) setPeaks(res);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [activeItem?.id, activeItem?.kind]);

  // Attach video element into active stage container
  React.useEffect(() => {
    if (playback.kind !== 'video') return;
    if (playback.theater && theaterStageRef.current) {
      attachVideoCanvasContainer(theaterStageRef.current);
    } else if (videoStageRef.current) {
      attachVideoCanvasContainer(videoStageRef.current);
    }
  }, [playback.kind, playback.theater, playback.activeId]);

  // Live analyser animation loop when visualizer is visible and playing
  React.useEffect(() => {
    if (!playback.playing || vizMode !== 'viz') return;
    let raf = 0;
    const tick = () => {
      setVizBars(getAnalyserBars(18));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playback.playing, vizMode]);

  const progressRatio =
    playback.duration > 0
      ? Math.min(1, Math.max(0, playback.time / playback.duration))
      : 0;

  const loopARatio =
    playback.loopA !== null && playback.duration > 0
      ? playback.loopA / playback.duration
      : null;
  const loopBRatio =
    playback.loopB !== null && playback.duration > 0
      ? playback.loopB / playback.duration
      : null;

  const handleScrubBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeItem) return;
    if (!playback.activeId) {
      void playVaultItem(activeItem.id, playableItems.map((i) => i.id));
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(pct * (playback.duration || activeItem.duration || 0));
  };

  const handleSaveFrame = () => {
    const dataUrl = captureVideoFramePng();
    if (!dataUrl) {
      onToast('Play a video frame first to capture');
      return;
    }
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${activeItem?.title || 'frame'}.png`;
    link.click();
    onToast('Saved video frame PNG');
  };

  const applyPreset = (preset: EqPresetId) => {
    const bands = EQ_PRESETS[preset];
    setEqBands(bands);
    onUpdateSettings({ ...settings, eqPreset: preset, eqBands: bands });
  };

  if (!activeItem) {
    return (
      <section className="fade-up space-y-6">
        <div>
          <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.15] font-bold tracking-tight">
            Studio
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Private audio &amp; video player with 5-band EQ, waveform scrubber, A–B loop, and theater mode
          </p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[22px] p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--card-alt)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--accent)]">
            <Disc3 size={28} />
          </div>
          <h2 className="text-lg font-semibold mt-4">No media loaded yet</h2>
          <p className="text-sm text-[var(--muted)] mt-1.5 max-w-[420px] mx-auto">
            Import MP3, WAV, M4A, MP4, or WebM files into your local IndexedDB vault, or load an offline Studio demo track.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
            <button
              type="button"
              onClick={onImportMedia}
              className="h-10 px-4 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-sm font-medium flex items-center gap-2"
            >
              <Upload size={16} />
              <span>Import media</span>
            </button>
            <button
              type="button"
              onClick={onLoadSampleMedia}
              className="h-10 px-4 rounded-xl border border-[var(--border)] bg-[var(--card-alt)] text-sm font-medium flex items-center gap-2 hover:bg-[var(--hover)]"
            >
              <Sparkles size={16} className="text-[var(--accent)]" />
              <span>Load sample audio</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  const isPlayingThis = playback.activeId === activeItem.id && playback.playing;
  const isLoadedThis = playback.activeId === activeItem.id;

  return (
    <section className="fade-up space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.15] font-bold tracking-tight">
            Studio
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1 tabular-nums">
            {playableItems.length} playable {playableItems.length === 1 ? 'track' : 'tracks'} · EQ: {settings.eqPreset}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton
            label={activeItem.favorite ? 'Remove favorite' : 'Favorite track'}
            active={Boolean(activeItem.favorite)}
            onClick={() =>
              onUpdateItem(activeItem.id, { favorite: !activeItem.favorite })
            }
          >
            <Heart
              size={18}
              className={activeItem.favorite ? 'fill-current' : ''}
            />
          </IconButton>
          <IconButton
            label="Equalizer & Audio"
            active={showEq}
            onClick={() => setShowEq(true)}
          >
            <SlidersHorizontal size={18} />
          </IconButton>
          <IconButton
            label="Playback queue"
            active={showQueue}
            onClick={() => setShowQueue(true)}
          >
            <ListMusic size={18} />
          </IconButton>
          <IconButton
            label="Sleep timer"
            active={playback.sleepUntil > 0}
            onClick={() => setShowSleep(true)}
          >
            <Moon size={18} />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-[22px] p-5 sm:p-6 space-y-5">
          {/* Stage: Video OR Artwork / Visualizer */}
          {activeItem.kind === 'video' && isLoadedThis ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-[var(--border)]">
              <div ref={videoStageRef} className="w-full h-full" />
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTheaterMode(true)}
                  aria-label="Enter theater mode"
                  className="h-9 px-3 rounded-xl bg-black/65 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm"
                >
                  <Maximize2 size={14} />
                  <span>Theater</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              <div className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-[24px] bg-[var(--card-alt)] border border-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
                {vizMode === 'viz' ? (
                  <div className="flex items-end gap-1.5 h-24 px-4 w-full">
                    {vizBars.map((val, idx) => (
                      <div
                        key={idx}
                        className="flex-1 rounded-sm bg-[var(--accent)] transition-[height] duration-75"
                        style={{ height: `${Math.round(val * 100)}%` }}
                      />
                    ))}
                  </div>
                ) : activeItem.thumb ? (
                  <img
                    src={activeItem.thumb}
                    alt=""
                    className={`w-full h-full object-cover ${
                      isPlayingThis ? 'scale-[1.03]' : ''
                    } transition-transform duration-500`}
                  />
                ) : (
                  <div
                    className={`w-28 h-28 rounded-full border-4 border-[var(--border)] bg-[var(--page)] flex items-center justify-center ${
                      isPlayingThis ? 'spin-slow' : ''
                    }`}
                  >
                    <Disc3 size={42} className="text-[var(--accent)]" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--muted)]">
                  {activeItem.kind} · {activeItem.ext.toUpperCase()}
                </p>
                <h2 className="text-2xl font-bold tracking-tight mt-1 truncate">
                  {activeItem.title || activeItem.name}
                </h2>
                <p className="text-sm text-[var(--muted)] mt-0.5 truncate">
                  {activeItem.artist || 'Local Vault'} · {activeItem.playCount}{' '}
                  {activeItem.playCount === 1 ? 'play' : 'plays'}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setVizMode((m) => (m === 'art' ? 'viz' : 'art'))
                    }
                    className="h-8 px-3 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--card-alt)] transition-colors"
                  >
                    {vizMode === 'art' ? 'Live visualizer' : 'Show artwork'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNotes((n) => !n)}
                    className={`h-8 px-3 rounded-xl border text-xs font-medium transition-colors ${
                      showNotes
                        ? 'bg-[var(--dark-btn)] text-[var(--page)] border-[var(--dark-btn)]'
                        : 'border-[var(--border)] hover:bg-[var(--card-alt)]'
                    }`}
                  >
                    Track notes
                  </button>
                  <button
                    type="button"
                    onClick={toggleABLoop}
                    className={`h-8 px-3 rounded-xl border text-xs font-mono font-medium transition-colors ${
                      playback.loopA !== null
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'border-[var(--border)] hover:bg-[var(--card-alt)]'
                    }`}
                  >
                    {playback.loopA === null
                      ? 'Loop A–B'
                      : playback.loopB === null
                      ? 'Set B'
                      : 'A–B On'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 72-bar interactive waveform scrubber */}
          <div className="space-y-1.5">
            <div
              role="slider"
              aria-label="Audio waveform scrubber"
              aria-valuemin={0}
              aria-valuemax={Math.round(playback.duration || 100)}
              aria-valuenow={Math.round(playback.time)}
              tabIndex={0}
              onClick={handleScrubBarClick}
              className="h-12 flex items-end gap-[2px] cursor-pointer px-1 select-none"
            >
              {peaks.map((peak, idx) => {
                const pos = idx / peaks.length;
                const isPlayed = isLoadedThis && pos <= progressRatio;
                const isInLoop =
                  loopARatio !== null &&
                  loopBRatio !== null &&
                  pos >= loopARatio &&
                  pos <= loopBRatio;
                return (
                  <span
                    key={idx}
                    className={`waveform-bar ${
                      isInLoop ? 'loop' : isPlayed ? 'played' : ''
                    }`}
                    style={{ height: `${Math.round(peak * 100)}%` }}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[var(--muted)]">
              <span>{formatMediaClock(isLoadedThis ? playback.time : 0)}</span>
              <span>
                {formatMediaClock(
                  isLoadedThis
                    ? playback.duration || activeItem.duration || 0
                    : activeItem.duration || 0
                )}
              </span>
            </div>
          </div>

          {playback.error && (
            <p className="text-xs text-[var(--danger)]">{playback.error}</p>
          )}

          {/* Transport Bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <IconButton
              label="Shuffle queue"
              active={playback.shuffle}
              onClick={toggleShuffle}
            >
              <Shuffle size={17} />
            </IconButton>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <IconButton label="Seek back 10 seconds" onClick={() => seekBy(-10)}>
                <RotateCcw size={17} />
              </IconButton>
              <IconButton label="Previous track" onClick={() => void prevTrack()}>
                <SkipBack size={18} />
              </IconButton>
              <button
                type="button"
                aria-label={isPlayingThis ? 'Pause' : 'Play'}
                onClick={() => {
                  if (isLoadedThis) {
                    void togglePlay();
                  } else {
                    void playVaultItem(
                      activeItem.id,
                      playableItems.map((i) => i.id)
                    );
                  }
                }}
                className="w-12 h-12 rounded-2xl bg-[var(--dark-btn)] text-[var(--page)] flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
              >
                {isPlayingThis ? <Pause size={21} /> : <Play size={21} />}
              </button>
              <IconButton
                label="Next track"
                onClick={() => void nextTrack(false)}
              >
                <SkipForward size={18} />
              </IconButton>
              <IconButton
                label="Seek forward 10 seconds"
                onClick={() => seekBy(10)}
              >
                <RotateCw size={17} />
              </IconButton>
            </div>

            <IconButton
              label={`Repeat: ${playback.repeat}`}
              active={playback.repeat !== 'off'}
              onClick={cycleRepeat}
            >
              {playback.repeat === 'one' ? (
                <Repeat1 size={17} />
              ) : (
                <Repeat size={17} />
              )}
            </IconButton>
          </div>

          {/* Volume + Speed bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border-2)]">
            <button
              type="button"
              aria-label={playback.muted ? 'Unmute' : 'Mute'}
              onClick={toggleMute}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-alt)]"
            >
              {playback.muted || playback.volume === 0 ? (
                <VolumeX size={17} />
              ) : (
                <Volume2 size={17} />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={playback.muted ? 0 : playback.volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="studio-range flex-1 min-w-[100px]"
            />
            <div className="flex items-center gap-1 bg-[var(--card-alt)] border border-[var(--border-2)] rounded-xl p-1">
              {SPEEDS.map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => {
                    setSpeed(spd);
                    onUpdateSettings({ ...settings, playbackSpeed: spd });
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-mono tabular-nums transition-colors ${
                    playback.speed === spd
                      ? 'bg-[var(--dark-btn)] text-[var(--page)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {showNotes && (
            <div className="pt-3 border-t border-[var(--border-2)] space-y-2 fade-up">
              <label
                htmlFor="studio-track-notes"
                className="block text-xs font-medium text-[var(--muted)]"
              >
                Notes for {activeItem.title}
              </label>
              <textarea
                id="studio-track-notes"
                rows={3}
                value={activeItem.notes || ''}
                onChange={(e) =>
                  onUpdateItem(activeItem.id, { notes: e.target.value })
                }
                placeholder="Write timestamps, mix feedback, or cues..."
                className="w-full rounded-xl bg-[var(--card-alt)] border border-[var(--border)] p-3 text-sm outline-none resize-y"
              />
            </div>
          )}
        </div>

        {/* Up Next / Vault Library Rail */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[22px] overflow-hidden divide-y divide-[var(--border-2)]">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">
              Media Library
            </span>
            <button
              type="button"
              onClick={onImportMedia}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              + Import
            </button>
          </div>
          {playableItems.map((item) => {
            const active = item.id === activeItem.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  void playVaultItem(
                    item.id,
                    playableItems.map((i) => i.id)
                  )
                }
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  active ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--hover)]'
                }`}
              >
                <VaultThumb item={item} size={38} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.title || item.name}
                  </p>
                  <p className="text-xs text-[var(--muted)] truncate font-mono tabular-nums">
                    {item.ext.toUpperCase()}
                    {item.duration ? ` · ${formatMediaClock(item.duration)}` : ''}
                  </p>
                </div>
                {active && playback.playing && (
                  <Music size={15} className="text-[var(--accent)] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Equalizer & Boost Modal */}
      <ModalShell
        open={showEq}
        title="5-Band Equalizer &amp; Audio"
        onClose={() => setShowEq(false)}
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(EQ_PRESETS) as EqPresetId[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  settings.eqPreset === preset
                    ? 'bg-[var(--dark-btn)] text-[var(--page)] border-[var(--dark-btn)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2 py-2 bg-[var(--card-alt)] rounded-2xl p-4 border border-[var(--border-2)]">
            {EQ_LABELS.map((label, idx) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className="text-xs font-mono tabular-nums text-[var(--muted)]">
                  {playback.eq[idx] > 0 ? `+${playback.eq[idx]}` : playback.eq[idx]}dB
                </span>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  aria-label={`${label} band`}
                  value={playback.eq[idx]}
                  onChange={(e) => {
                    const next = [...playback.eq] as [
                      number,
                      number,
                      number,
                      number,
                      number
                    ];
                    next[idx] = Number(e.target.value);
                    setEqBands(next);
                    onUpdateSettings({ ...settings, eqBands: next });
                  }}
                  className="studio-eq"
                />
                <span className="text-[11px] font-mono text-[var(--muted)]">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Gain boost</p>
              <p className="text-xs text-[var(--muted)]">
                Amplify quiet recordings up to 200%
              </p>
            </div>
            <div className="flex bg-[var(--card-alt)] border border-[var(--border)] rounded-xl p-1">
              {([1, 1.5, 2] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBoost(b)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono ${
                    playback.boost === b
                      ? 'bg-[var(--dark-btn)] text-[var(--page)]'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  {Math.round(b * 100)}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Volume leveler</p>
              <p className="text-xs text-[var(--muted)]">
                Dynamic range compression across tracks
              </p>
            </div>
            <ToggleSwitch
              label="Volume leveler"
              on={playback.leveler}
              onChange={(val) => {
                setVolumeLeveler(val);
                onUpdateSettings({ ...settings, volumeLeveler: val });
              }}
            />
          </div>
        </div>
      </ModalShell>

      {/* Queue Modal */}
      <ModalShell
        open={showQueue}
        title="Playback Queue"
        onClose={() => setShowQueue(false)}
      >
        <div className="space-y-4">
          <div className="divide-y divide-[var(--border-2)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {playback.queue.map((id, idx) => {
              const item = vaultItems.find((v) => v.id === id);
              if (!item) return null;
              const isCurrent = id === playback.activeId;
              return (
                <div
                  key={`${id}-${idx}`}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 ${
                    isCurrent ? 'bg-[var(--accent-soft)]' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void playVaultItem(id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm font-medium truncate">
                      {item.title || item.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {item.ext.toUpperCase()}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={idx === 0}
                    onClick={() => moveQueueItem(idx, idx - 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--card-alt)] disabled:opacity-30"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={idx === playback.queue.length - 1}
                    onClick={() => moveQueueItem(idx, idx + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--card-alt)] disabled:opacity-30"
                  >
                    <ChevronDown size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove from queue"
                    onClick={() => removeFromQueue(id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--danger)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            {playback.queue.length === 0 && (
              <p className="p-6 text-center text-sm text-[var(--muted)]">
                Queue is empty.
              </p>
            )}
          </div>

          {playback.queue.length > 0 && (
            <div className="flex gap-2">
              <input
                value={savePlaylistName}
                onChange={(e) => setSavePlaylistName(e.target.value)}
                placeholder="Save queue as collection..."
                className="flex-1 min-w-0 bg-[var(--card-alt)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                disabled={!savePlaylistName.trim()}
                onClick={() => {
                  onSaveQueueAsCollection(
                    savePlaylistName.trim(),
                    playback.queue
                  );
                  setSavePlaylistName('');
                }}
                className="px-4 py-2 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-xs font-medium disabled:opacity-40"
              >
                Save list
              </button>
            </div>
          )}
        </div>
      </ModalShell>

      {/* Sleep Timer Modal */}
      <ModalShell
        open={showSleep}
        title="Sleep Timer"
        onClose={() => setShowSleep(false)}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[0, 5, 15, 30, 45, 60].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => {
                setSleepMinutes(mins);
                setShowSleep(false);
                onToast(
                  mins === 0
                    ? 'Sleep timer cleared'
                    : `Playback stops in ${mins} min`
                );
              }}
              className="py-3 px-4 rounded-xl border border-[var(--border)] bg-[var(--card-alt)] hover:bg-[var(--hover)] text-sm font-medium"
            >
              {mins === 0 ? 'Off' : `${mins} min`}
            </button>
          ))}
        </div>
      </ModalShell>

      {/* Video Theater Overlay */}
      {playback.theater && (
        <div className="fixed inset-0 z-[70] bg-black text-white flex flex-col">
          <div
            ref={theaterStageRef}
            onDoubleClick={(e) => {
              if (theaterLocked) return;
              const rect = e.currentTarget.getBoundingClientRect();
              seekBy(e.clientX - rect.left < rect.width / 2 ? -10 : 10);
            }}
            className={`flex-1 flex items-center justify-center overflow-hidden ${
              playback.rotated ? 'theater-rotated' : ''
            }`}
          />
          <div className="p-4 bg-gradient-to-t from-black/85 to-transparent flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void togglePlay()}
                className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"
                aria-label={playback.playing ? 'Pause' : 'Play'}
              >
                {playback.playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <span className="text-xs font-mono tabular-nums">
                {formatMediaClock(playback.time)} /{' '}
                {formatMediaClock(playback.duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!theaterLocked && (
                <>
                  <button
                    type="button"
                    onClick={toggleVideoFitMode}
                    className="h-9 px-3 rounded-xl bg-white/15 text-xs font-medium"
                  >
                    {playback.fitMode === 'fit' ? 'Fit' : 'Fill'}
                  </button>
                  <button
                    type="button"
                    onClick={toggleTheaterRotation}
                    className="h-9 px-3 rounded-xl bg-white/15 text-xs font-medium"
                  >
                    Rotate 90°
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveFrame}
                    className="h-9 px-3 rounded-xl bg-white/15 text-xs font-medium"
                  >
                    Save frame
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setTheaterLocked((l) => !l)}
                className="h-9 px-3 rounded-xl bg-white/15 text-xs font-medium flex items-center gap-1.5"
              >
                {theaterLocked ? <Lock size={14} /> : <Unlock size={14} />}
                <span>{theaterLocked ? 'Unlock' : 'Lock'}</span>
              </button>
              <button
                type="button"
                onClick={() => setTheaterMode(false)}
                className="h-9 px-3 rounded-xl bg-white text-black text-xs font-semibold flex items-center gap-1.5"
              >
                <Minimize2 size={14} />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
