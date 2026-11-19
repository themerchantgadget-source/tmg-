import { Plus, Search } from 'lucide-react';
import type { NavSection } from '../types/workspace';
import { BrandMark } from './Sidebar';
import { IconButton } from './ui/Controls';

const SECTION_LABELS: Record<NavSection, string> = {
  home: 'Today',
  files: 'Files & Vault',
  editor: 'Editor',
  studio: 'Studio',
  terminal: 'Terminal',
  chat: 'Chat',
  browser: 'Browser',
  projects: 'Projects',
  artifacts: 'Artifacts',
  trash: 'Trash',
  settings: 'Settings',
};

interface HeaderProps {
  section: NavSection;
  activeFileName?: string;
  onOpenSearch: () => void;
  onQuickCreate: () => void;
}

export function Header({
  section,
  activeFileName,
  onOpenSearch,
  onQuickCreate,
}: HeaderProps) {
  const contextLabel =
    section === 'editor' && activeFileName
      ? `Editor / ${activeFileName}`
      : SECTION_LABELS[section];

  return (
    <header className="sticky top-0 z-30 bg-[var(--page)]/95 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-[960px] mx-auto px-4 sm:px-8 h-[52px] md:h-[60px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="md:hidden flex items-center gap-2 shrink-0">
            <BrandMark />
            <span className="font-bold tracking-tight text-lg leading-none">
              tmg
            </span>
          </span>
          <span className="md:hidden text-[var(--faint)]" aria-hidden="true">
            /
          </span>
          <span className="text-sm font-medium text-[var(--muted)] truncate">
            {contextLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search workspace"
            className="hidden sm:flex items-center gap-2.5 h-9 px-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--faint)] transition-colors whitespace-nowrap shrink-0"
          >
            <Search size={15} />
            <span>Search</span>
            <kbd className="text-[11px] font-mono text-[var(--faint)] ml-2">
              ⌘K
            </kbd>
          </button>

          <div className="sm:hidden">
            <IconButton label="Search workspace" onClick={onOpenSearch}>
              <Search size={18} />
            </IconButton>
          </div>

          <button
            type="button"
            onClick={onQuickCreate}
            aria-label="Create or import"
            className="h-9 px-3.5 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            <Plus size={16} />
            <span>Create</span>
          </button>
        </div>
      </div>
    </header>
  );
}
