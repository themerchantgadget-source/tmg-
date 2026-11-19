import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { VaultItem } from '../types/workspace';
import { getVaultBlob } from '../utils/vaultDb';

interface PhotoViewerModalProps {
  photos: VaultItem[];
  activePhotoId: string | null;
  onSelectPhoto: (id: string | null) => void;
  onToggleFavorite: (id: string) => void;
  onToast: (msg: string) => void;
}

export function PhotoViewerModal({
  photos,
  activePhotoId,
  onSelectPhoto,
  onToggleFavorite,
  onToast,
}: PhotoViewerModalProps) {
  const [srcUrl, setSrcUrl] = React.useState<string>('');
  const [zoom, setZoom] = React.useState(1);
  const [cover, setCover] = React.useState(false);
  const [slideshow, setSlideshow] = React.useState(false);

  const index = photos.findIndex((p) => p.id === activePhotoId);
  const current = index >= 0 ? photos[index] : null;

  React.useEffect(() => {
    if (!current) return;
    let url = '';
    let active = true;
    setZoom(1);
    getVaultBlob(current.id)
      .then((blob) => {
        if (!active || !blob) return;
        url = URL.createObjectURL(blob);
        setSrcUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
      setSrcUrl('');
    };
  }, [current?.id]);

  React.useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSelectPhoto(null);
      if (e.key === 'ArrowRight' && photos.length > 1) {
        onSelectPhoto(photos[(index + 1) % photos.length].id);
      }
      if (e.key === 'ArrowLeft' && photos.length > 1) {
        onSelectPhoto(photos[(index - 1 + photos.length) % photos.length].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, index, photos, onSelectPhoto]);

  React.useEffect(() => {
    if (!slideshow || !current || photos.length < 2) return;
    const timer = window.setInterval(() => {
      onSelectPhoto(photos[(index + 1) % photos.length].id);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [slideshow, current, index, photos, onSelectPhoto]);

  if (!current) return null;

  const handleExport = async () => {
    try {
      const blob = await getVaultBlob(current.id);
      if (!blob) {
        onToast('Photo blob unavailable');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = current.name;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 600);
      onToast(`Exported ${current.name}`);
    } catch {
      onToast(`Could not export ${current.name}`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.title || current.name}
      className="fixed inset-0 z-[70] bg-black/95 text-white flex flex-col"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            {current.title || current.name}
          </p>
          <p className="text-xs text-white/60 font-mono tabular-nums">
            {index + 1} / {photos.length} · {Math.round(zoom * 100)}%
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))))}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            aria-label={cover ? 'Fit photo' : 'Fill frame'}
            onClick={() => setCover((c) => !c)}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            {cover ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {photos.length > 1 && (
            <button
              type="button"
              aria-label={slideshow ? 'Pause slideshow' : 'Start slideshow'}
              onClick={() => setSlideshow((s) => !s)}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              {slideshow ? <Pause size={16} /> : <Play size={16} />}
            </button>
          )}
          <button
            type="button"
            aria-label="Favorite photo"
            onClick={() => onToggleFavorite(current.id)}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <Heart
              size={16}
              className={current.favorite ? 'fill-[#EE6C4D] text-[#EE6C4D]' : ''}
            />
          </button>
          <button
            type="button"
            aria-label="Export photo"
            onClick={() => void handleExport()}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            aria-label="Close photo viewer"
            onClick={() => onSelectPhoto(null)}
            className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center ml-1"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      <div
        onWheel={(e) => {
          const delta = e.deltaY < 0 ? 0.2 : -0.2;
          setZoom((z) =>
            Math.max(0.5, Math.min(4, Number((z + delta).toFixed(2))))
          );
        }}
        className="relative flex-1 flex items-center justify-center overflow-auto p-4"
      >
        {photos.length > 1 && (
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() =>
              onSelectPhoto(photos[(index - 1 + photos.length) % photos.length].id)
            }
            className="absolute left-3 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {srcUrl ? (
          <img
            src={srcUrl}
            alt={current.title || current.name}
            onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
            style={{ transform: `scale(${zoom})` }}
            className={`max-w-full max-h-full transition-transform duration-150 ${
              cover ? 'object-cover w-full h-full' : 'object-contain'
            }`}
          />
        ) : (
          <p className="text-sm text-white/60">Loading image...</p>
        )}

        {photos.length > 1 && (
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => onSelectPhoto(photos[(index + 1) % photos.length].id)}
            className="absolute right-3 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
