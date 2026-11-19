import {
  Film,
  FolderArchive,
  Image as ImageIcon,
  Music,
  RotateCw,
  Trash2,
  X,
} from 'lucide-react';
import type { TrashItem } from '../../types/workspace';
import { IconButton } from '../ui/Controls';

interface TrashViewProps {
  items: TrashItem[];
  onRestore: (item: TrashItem) => void;
  onDeletePermanent: (item: TrashItem) => void;
  onEmptyTrash: () => void;
}

function renderTrashIcon(kind: TrashItem['kind']) {
  switch (kind) {
    case 'Audio':
      return <Music size={18} />;
    case 'Video':
      return <Film size={18} />;
    case 'Photo':
      return <ImageIcon size={18} />;
    case 'Bundle':
      return <FolderArchive size={18} />;
    default:
      return <Trash2 size={18} />;
  }
}

export function TrashView({
  items,
  onRestore,
  onDeletePermanent,
  onEmptyTrash,
}: TrashViewProps) {
  return (
    <section className="fade-up space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.15] font-bold tracking-tight">
            Trash
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1 tabular-nums">
            {items.length} {items.length === 1 ? 'item' : 'items'} in trash
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onEmptyTrash}
            className="h-9 px-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card-alt)] text-sm font-medium flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            <Trash2 size={15} />
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] overflow-hidden divide-y divide-[var(--border-2)]">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
            <span className="w-10 h-10 rounded-xl bg-[var(--card-alt)] flex items-center justify-center text-[var(--muted)] shrink-0">
              {renderTrashIcon(item.kind)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[15px] truncate">{item.name}</p>
              <p className="text-xs text-[var(--muted)]">
                {item.kind} · Deleted {item.date}
              </p>
            </div>
            <IconButton
              label={`Restore ${item.name}`}
              onClick={() => onRestore(item)}
            >
              <RotateCw size={17} />
            </IconButton>
            <IconButton
              label={`Delete ${item.name} permanently`}
              onClick={() => onDeletePermanent(item)}
            >
              <X size={17} />
            </IconButton>
          </div>
        ))}

        {items.length === 0 && (
          <div className="py-12 px-4 flex flex-col items-center text-center text-[var(--muted)]">
            <Trash2 size={26} className="text-[var(--faint)]" />
            <p className="mt-2.5 text-sm font-medium text-[var(--text)]">
              Trash is empty
            </p>
            <p className="mt-1 text-xs">
              Deleted files, media, bundles, projects, and artifacts can be restored here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
