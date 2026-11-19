import React from 'react';
import {
  CodeXml,
  Disc3,
  Ellipsis,
  Folder,
  FolderKanban,
  Globe,
  House,
  Layers,
  MessageSquare,
  Settings,
  SquareTerminal,
  Trash2,
  X,
} from 'lucide-react';
import type { NavSection } from '../types/workspace';
import { IconButton } from './ui/Controls';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ReactNode;
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'home', label: 'Today', icon: <House size={18} /> },
  { id: 'files', label: 'Files & Vault', icon: <Folder size={18} /> },
  { id: 'editor', label: 'Editor', icon: <CodeXml size={18} /> },
  { id: 'studio', label: 'Studio', icon: <Disc3 size={18} /> },
  { id: 'projects', label: 'Projects', icon: <FolderKanban size={18} /> },
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={18} /> },
  { id: 'terminal', label: 'Terminal', icon: <SquareTerminal size={18} /> },
  { id: 'browser', label: 'Browser', icon: <Globe size={18} /> },
  { id: 'artifacts', label: 'Artifacts', icon: <Layers size={18} /> },
];

const SECONDARY_NAV: NavItem[] = [
  { id: 'trash', label: 'Trash', icon: <Trash2 size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

const MOBILE_TABS: Array<{
  id: NavSection | 'more';
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'home', label: 'Today', icon: <House size={19} /> },
  { id: 'files', label: 'Files', icon: <Folder size={19} /> },
  { id: 'studio', label: 'Studio', icon: <Disc3 size={19} /> },
  { id: 'projects', label: 'Projects', icon: <FolderKanban size={19} /> },
  { id: 'more', label: 'More', icon: <Ellipsis size={19} /> },
];

const MOBILE_DRAWER_ITEMS: NavItem[] = [
  { id: 'editor', label: 'Editor', icon: <CodeXml size={19} /> },
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={19} /> },
  { id: 'terminal', label: 'Terminal', icon: <SquareTerminal size={19} /> },
  { id: 'browser', label: 'Browser', icon: <Globe size={19} /> },
  { id: 'artifacts', label: 'Artifacts', icon: <Layers size={19} /> },
  { id: 'trash', label: 'Trash', icon: <Trash2 size={19} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={19} /> },
];

interface SidebarProps {
  section: NavSection;
  onNavigate: (target: NavSection) => void;
  trashCount: number;
  unreadChatCount: number;
  isPlayingMedia: boolean;
  profileName: string;
  profileEmail: string;
  moreOpen: boolean;
  onMoreOpenChange: (open: boolean) => void;
}

export function BrandMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" />
      <rect x="11" y="2" width="7" height="7" rx="2" fill="var(--accent)" />
      <rect
        x="2"
        y="11"
        width="7"
        height="7"
        rx="2"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" />
    </svg>
  );
}

export function Sidebar({
  section,
  onNavigate,
  trashCount,
  unreadChatCount,
  isPlayingMedia,
  profileName,
  profileEmail,
  moreOpen,
  onMoreOpenChange,
}: SidebarProps) {
  const isMoreSection = MOBILE_DRAWER_ITEMS.some((item) => item.id === section);
  const initial = (profileName.trim()[0] || 'M').toUpperCase();

  return (
    <>
      <aside
        aria-label="Workspace navigation"
        className="hidden md:flex w-[228px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--page)] sticky top-0 h-[100dvh] px-3 py-4"
      >
        <div className="flex items-center gap-2.5 px-3 h-10 mb-3">
          <BrandMark />
          <span className="font-bold tracking-tight text-lg leading-none whitespace-nowrap">
            tmg
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto no-scrollbar">
          {PRIMARY_NAV.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  active
                    ? 'bg-[var(--card)] text-[var(--text)] border border-[var(--border)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-alt)] border border-transparent'
                }`}
              >
                <span className={active ? 'text-[var(--accent)]' : ''}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.id === 'chat' && unreadChatCount > 0 && (
                  <span className="text-xs font-mono tabular-nums text-[var(--accent)] font-semibold">
                    {unreadChatCount}
                  </span>
                )}
                {item.id === 'studio' && isPlayingMedia && (
                  <span className="text-[11px] font-mono text-[var(--accent)]">
                    LIVE
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-3 mt-3 border-t border-[var(--border)] space-y-0.5">
          {SECONDARY_NAV.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  active
                    ? 'bg-[var(--card)] text-[var(--text)] border border-[var(--border)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-alt)] border border-transparent'
                }`}
              >
                <span className={active ? 'text-[var(--accent)]' : ''}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.id === 'trash' && trashCount > 0 && (
                  <span className="text-xs font-mono tabular-nums text-[var(--muted)]">
                    {trashCount}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 mt-2 rounded-xl hover:bg-[var(--card-alt)] transition-colors text-left"
          >
            <span className="w-8 h-8 rounded-full bg-[var(--dark-btn)] text-[var(--page)] flex items-center justify-center text-xs font-semibold shrink-0">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium leading-tight truncate">
                {profileName}
              </span>
              <span className="block text-xs text-[var(--muted)] leading-tight truncate">
                {profileEmail}
              </span>
            </span>
          </button>
        </div>
      </aside>

      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--page)]/95 backdrop-blur-md border-t border-[var(--border)]"
      >
        <div className="max-w-[760px] mx-auto px-2 h-[58px] grid grid-cols-5">
          {MOBILE_TABS.map((item) => {
            const active =
              item.id === 'more' ? moreOpen || isMoreSection : section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={() => {
                  if (item.id === 'more') {
                    onMoreOpenChange(true);
                  } else {
                    onMoreOpenChange(false);
                    onNavigate(item.id);
                  }
                }}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] min-h-[44px] whitespace-nowrap transition-colors ${
                  active
                    ? 'text-[var(--text)] font-semibold'
                    : 'text-[var(--muted)] font-medium'
                }`}
              >
                <span className={active ? 'text-[var(--accent)]' : ''}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {moreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More workspace sections"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => onMoreOpenChange(false)}
            className="absolute inset-0 bg-black/45"
          />
          <div className="relative w-full max-w-[480px] bg-[var(--card)] border border-[var(--border)] rounded-t-[24px] sm:rounded-[24px] p-4 pb-6 fade-up">
            <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="font-semibold text-base">Workspace tools</span>
              <IconButton
                label="Close menu"
                onClick={() => onMoreOpenChange(false)}
              >
                <X size={18} />
              </IconButton>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {MOBILE_DRAWER_ITEMS.map((item) => {
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onMoreOpenChange(false);
                      onNavigate(item.id);
                    }}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left border transition-colors ${
                      active
                        ? 'bg-[var(--card-alt)] border-[var(--border)] text-[var(--text)] font-semibold'
                        : 'border-transparent hover:bg-[var(--card-alt)] text-[var(--text)] font-medium'
                    }`}
                  >
                    <span className={active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}>
                      {item.icon}
                    </span>
                    <span className="flex-1 text-sm truncate">{item.label}</span>
                    {item.id === 'trash' && trashCount > 0 && (
                      <span className="text-xs font-mono tabular-nums text-[var(--muted)]">
                        {trashCount}
                      </span>
                    )}
                    {item.id === 'chat' && unreadChatCount > 0 && (
                      <span className="text-xs font-mono tabular-nums text-[var(--accent)] font-semibold">
                        {unreadChatCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
