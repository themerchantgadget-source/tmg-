import React from 'react';
import { Maximize2, Pause, Play, SkipForward, X } from 'lucide-react';
import type { VaultItem } from '../types/workspace';
import {
  attachVideoCanvasContainer,
  seekTo,
  setTheaterMode,
  type StudioPlaybackState,
} from '../utils/audioEngine';
import { formatMediaClock } from '../utils/vaultUtils';
import { VaultThumb } from './ui/Controls';

interface MiniPlayerProps {
  playback: StudioPlaybackState;
  item: VaultItem | null;
  onOpenStudio: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onStop: () => void;
}

export function MiniPlayer({
  playback,
  item,
  onOpenStudio,
  onTogglePlay,
  onNext,
  onStop,
}: MiniPlayerProps) {
  const videoRef = React.useRef<HTMLDivElement | null>(null);

  // Keep the single app-owned video element mounted and visible when the user
  // navigates away from Studio. This is the same media element used by Studio,
  // not a second player that can drift out of sync.
  React.useEffect(() => {
    if (playback.kind === 'video' && videoRef.current) {
      attachVideoCanvasContainer(videoRef.current);
    }
  }, [playback.kind, playback.activeId]);

  if (!item || !playback.activeId) return null;

  const pct = playback.duration > 0
    ? Math.min(100, Math.max(0, (playback.time / playback.duration) * 100))
    : 0;
  const isVideo = playback.kind === 'video' && item.kind === 'video';

  return (
    <div className="fixed bottom-[64px] md:bottom-4 left-3 right-3 md:left-[244px] md:right-6 z-35 pointer-events-none">
      <div className="max-w-[720px] mx-auto bg-[var(--card)]/95 backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden pointer-events-auto">
        {isVideo && (
          <div className="relative w-full aspect-video max-h-[34dvh] bg-black overflow-hidden">
            <div ref={videoRef} className="w-full h-full" />
            <button
              type="button"
              onClick={() => {
                onOpenStudio();
                setTheaterMode(true);
              }}
              aria-label="Open video in app theater mode"
              title="Open in app theater mode"
              className="absolute right-2 top-2 h-9 px-3 rounded-xl bg-black/70 text-white text-xs font-medium inline-flex items-center gap-1.5 backdrop-blur-sm"
            >
              <Maximize2 size={14} />
              <span>Expand</span>
            </button>
          </div>
        )}
        <div className="h-[3px] bg-[var(--track)]">
          <div
            className="h-full bg-[var(--accent)] transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-3 px-3 py-2">
          <button
            type="button"
            onClick={onOpenStudio}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
            aria-label={`Open ${item.title || item.name} in Studio`}
          >
            {!isVideo && <VaultThumb item={item} size={38} />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{item.title || item.name}</p>
              <p className="text-xs text-[var(--muted)] truncate font-mono tabular-nums">
                {formatMediaClock(playback.time)} / {formatMediaClock(playback.duration)}
                {item.artist ? ` · ${item.artist}` : ''}
                {playback.buffering ? ' · Buffering…' : ''}
              </p>
            </div>
          </button>

          {playback.duration > 0 && (
            <input
              type="range"
              min={0}
              max={playback.duration}
              step={0.1}
              value={Math.min(playback.time, playback.duration)}
              onChange={(event) => seekTo(Number(event.target.value))}
              aria-label="Seek playback"
              className="hidden sm:block w-24 accent-[var(--accent)]"
            />
          )}

          <button
            type="button"
            aria-label={playback.playing ? 'Pause playback' : 'Play playback'}
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] flex items-center justify-center shrink-0"
          >
            {playback.playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            type="button"
            aria-label="Next track"
            onClick={onNext}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text)] hover:bg-[var(--card-alt)] shrink-0"
          >
            <SkipForward size={17} />
          </button>
          <button
            type="button"
            aria-label="Stop playback"
            onClick={onStop}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-alt)] shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
