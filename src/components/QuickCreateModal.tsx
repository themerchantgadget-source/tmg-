import {
  Disc3,
  FilePlus2,
  FolderKanban,
  FolderPlus,
  Layers,
  MessageSquare,
  Upload,
} from 'lucide-react';
import { ModalShell } from './ui/Controls';

interface QuickCreateModalProps {
  open: boolean;
  onClose: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onNewProject: () => void;
  onNewChat: () => void;
  onNewArtifact: () => void;
  onImportMedia: () => void;
  onLoadSampleMedia: () => void;
}

export function QuickCreateModal({
  open,
  onClose,
  onNewFile,
  onNewFolder,
  onNewProject,
  onNewChat,
  onNewArtifact,
  onImportMedia,
  onLoadSampleMedia,
}: QuickCreateModalProps) {
  const actions = [
    {
      label: 'New File',
      desc: 'HTML, CSS, JS, Markdown',
      icon: <FilePlus2 size={19} />,
      action: onNewFile,
    },
    {
      label: 'New Folder',
      desc: 'Organize workspace',
      icon: <FolderPlus size={19} />,
      action: onNewFolder,
    },
    {
      label: 'New Project',
      desc: 'Checklist & milestone',
      icon: <FolderKanban size={19} />,
      action: onNewProject,
    },
    {
      label: 'New Chat',
      desc: 'Start a fresh thread',
      icon: <MessageSquare size={19} />,
      action: onNewChat,
    },
    {
      label: 'New Artifact',
      desc: 'Deck, spec, or snapshot',
      icon: <Layers size={19} />,
      action: onNewArtifact,
    },
    {
      label: 'Import Media / ZIP',
      desc: 'Audio, video, photo, bundle',
      icon: <Upload size={19} />,
      action: onImportMedia,
    },
  ];

  return (
    <ModalShell open={open} title="Create or import" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              onClose();
              item.action();
            }}
            className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card-alt)]/50 hover:bg-[var(--hover)] text-left transition-colors"
          >
            <span className="text-[var(--accent)]">{item.icon}</span>
            <p className="font-semibold text-sm mt-2">{item.label}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{item.desc}</p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          onClose();
          onLoadSampleMedia();
        }}
        className="w-full mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--border)] hover:bg-[var(--hover)] text-left transition-colors"
      >
        <Disc3 size={18} className="text-[var(--accent)] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Load Studio sample kit</p>
          <p className="text-xs text-[var(--muted)]">
            Add an offline ambient audio track &amp; poster image to test Studio immediately
          </p>
        </div>
      </button>
    </ModalShell>
  );
}
