import React from 'react';
import {
  File,
  Film,
  Folder,
  FolderArchive,
  FolderKanban,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Music,
  Search,
  X,
} from 'lucide-react';
import type {
  Artifact,
  ChatThread,
  NavSection,
  Project,
  VaultItem,
  WorkspaceFile,
} from '../types/workspace';
import { filterWorkspaceSearch } from '../utils/workspaceLogic';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  files: WorkspaceFile[];
  projects: Project[];
  artifacts: Artifact[];
  vaultItems: VaultItem[];
  threads: ChatThread[];
  onOpenFile: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onOpenProject: (id: string) => void;
  onOpenArtifact: (id: string) => void;
  onOpenVaultItem: (item: VaultItem) => void;
  onOpenThread: (threadId: string) => void;
  onNavigate: (section: NavSection) => void;
}

const QUICK_SECTIONS: Array<{ id: NavSection; label: string }> = [
  { id: 'files', label: 'Files & Vault' },
  { id: 'editor', label: 'Editor' },
  { id: 'studio', label: 'Studio Player' },
  { id: 'projects', label: 'Projects' },
  { id: 'chat', label: 'Chat' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'browser', label: 'Browser' },
  { id: 'settings', label: 'Settings' },
];

export function CommandPalette({
  open,
  onClose,
  files,
  projects,
  artifacts,
  vaultItems,
  threads,
  onOpenFile,
  onOpenFolder,
  onOpenProject,
  onOpenArtifact,
  onOpenVaultItem,
  onOpenThread,
  onNavigate,
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const hits = filterWorkspaceSearch(
    query,
    files,
    projects,
    artifacts,
    vaultItems,
    threads
  );

  const selectHit = (hit: (typeof hits)[number]) => {
    onClose();
    if (hit.kind === 'File') {
      onOpenFile(hit.id);
    } else if (hit.kind === 'Folder') {
      onOpenFolder(hit.id);
    } else if (hit.kind === 'Project') {
      onOpenProject(hit.id);
    } else if (hit.kind === 'Artifact') {
      onOpenArtifact(hit.id);
    } else if (hit.kind === 'Thread') {
      onOpenThread(hit.id);
    } else {
      const target = vaultItems.find((v) => v.id === hit.id);
      if (target) onOpenVaultItem(target);
    }
  };

  const renderIcon = (kind: (typeof hits)[number]['kind']) => {
    switch (kind) {
      case 'Folder':
        return <Folder size={17} />;
      case 'File':
        return <File size={17} />;
      case 'Project':
        return <FolderKanban size={17} />;
      case 'Artifact':
        return <Layers size={17} />;
      case 'Audio':
        return <Music size={17} />;
      case 'Video':
        return <Film size={17} />;
      case 'Photo':
        return <ImageIcon size={17} />;
      case 'Bundle':
        return <FolderArchive size={17} />;
      case 'Thread':
        return <MessageSquare size={17} />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search workspace"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]"
    >
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />
      <div className="relative w-full max-w-[560px] bg-[var(--card)] border border-[var(--border)] rounded-[20px] shadow-2xl overflow-hidden fade-up">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border-2)]">
          <Search size={18} className="text-[var(--muted)] shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits[activeIndex]) {
                e.preventDefault();
                selectHit(hits[activeIndex]);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) =>
                  hits.length ? Math.min(hits.length - 1, prev + 1) : 0
                );
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) => Math.max(0, prev - 1));
              }
            }}
            placeholder="Search files, music, videos, bundles, projects, threads..."
            aria-label="Search workspace input"
            className="flex-1 min-w-0 bg-transparent outline-none py-1 text-[var(--text)] placeholder:text-[var(--faint)]"
          />
          <button
            type="button"
            aria-label="Close search modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--card-alt)]"
          >
            <X size={16} />
          </button>
        </div>

        {query.trim() ? (
          <div className="max-h-[340px] overflow-y-auto p-2">
            {hits.map((hit, idx) => (
              <button
                key={`${hit.kind}-${hit.id}`}
                type="button"
                onClick={() => selectHit(hit)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  idx === activeIndex
                    ? 'bg-[var(--card-alt)]'
                    : 'hover:bg-[var(--hover)]'
                }`}
              >
                <span className="text-[var(--muted)] shrink-0">
                  {renderIcon(hit.kind)}
                </span>
                <span className="flex-1 min-w-0 font-medium text-sm truncate">
                  {hit.label}
                </span>
                <span className="text-xs text-[var(--muted)] shrink-0 tabular-nums">
                  {hit.kind} · {hit.meta}
                </span>
              </button>
            ))}
            {hits.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">
                No matching items found for "{query}".
              </p>
            )}
          </div>
        ) : (
          <div className="p-4">
            <p className="text-xs font-medium text-[var(--muted)] mb-2.5">
              Jump to section
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {QUICK_SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate(sec.id);
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-left bg-[var(--card-alt)] hover:bg-[var(--hover)] border border-[var(--border-2)] transition-colors truncate"
                >
                  {sec.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
