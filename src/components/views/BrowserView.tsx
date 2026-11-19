import React from 'react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Copy,
  FolderArchive,
  FolderKanban,
  Plus,
  RotateCw,
  X,
} from 'lucide-react';
import type {
  BookmarkItem,
  BrowserTabItem,
  BrowserTabKind,
  Project,
  VaultItem,
  WorkspaceFile,
} from '../../types/workspace';
import { bundleBlobKey, getVaultBlob } from '../../utils/vaultDb';
import { inferMimeFromName, rewriteBundleHtml } from '../../utils/vaultUtils';
import {
  buildPreviewDocument,
  calculateProjectProgress,
} from '../../utils/workspaceLogic';
import { IconButton } from '../ui/Controls';

interface BrowserViewProps {
  files: WorkspaceFile[];
  vaultItems: VaultItem[];
  projects: Project[];
  bookmarks: BookmarkItem[];
  tabs: BrowserTabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onNewTab: () => void;
  onCloseTab: (id: string) => void;
  onUpdateTab: (id: string, patch: Partial<BrowserTabItem>) => void;
  onToggleBookmark: (title: string, url: string) => void;
  onOpenProject: (id: string) => void;
  onCopy: (text: string, msg?: string) => void;
  onToast: (msg: string) => void;
}

const KIND_TO_URL: Record<BrowserTabKind, string> = {
  Docs: 'tmg.app/docs',
  Preview: 'tmg.app/preview',
  Dashboard: 'tmg.app/dashboard',
  Keys: 'tmg.app/keys',
};

function resolveKindFromUrl(url: string): BrowserTabKind {
  const lower = url.toLowerCase();
  if (lower.includes('preview')) return 'Preview';
  if (lower.includes('dashboard')) return 'Dashboard';
  if (lower.includes('keys')) return 'Keys';
  return 'Docs';
}

export function BrowserView({
  files,
  vaultItems,
  projects,
  bookmarks,
  tabs,
  activeTabId,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onUpdateTab,
  onToggleBookmark,
  onOpenProject,
  onCopy,
  onToast,
}: BrowserViewProps) {
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const [historyByTab, setHistoryByTab] = React.useState<
    Record<string, { urls: string[]; idx: number }>
  >({});
  const [addressInput, setAddressInput] = React.useState(
    activeTab?.url || 'tmg.app/docs'
  );
  const [reloadNonce, setReloadNonce] = React.useState(0);
  const [bundleDoc, setBundleDoc] = React.useState('');

  const currentUrl = activeTab?.url || 'tmg.app/docs';
  const activeKind: BrowserTabKind = activeTab?.bundleId
    ? 'Preview'
    : resolveKindFromUrl(currentUrl);
  const activeBundle = activeTab?.bundleId
    ? vaultItems.find((v) => v.id === activeTab.bundleId) || null
    : null;

  React.useEffect(() => {
    setAddressInput(currentUrl);
  }, [activeTab?.id, currentUrl]);

  // Load sandboxed bundle doc whenever a Browser tab points to an imported bundle
  React.useEffect(() => {
    if (!activeBundle) {
      setBundleDoc('');
      return;
    }
    const paths = activeBundle.bundlePaths || [];
    const entryPath = activeBundle.entryFile || paths[0] || '';
    if (!entryPath) {
      setBundleDoc(
        '<html><body style="font-family:system-ui;padding:32px"><h2>Entry file missing</h2></body></html>'
      );
      return;
    }

    let alive = true;
    const allocated: string[] = [];
    (async () => {
      try {
        const urlMap: Record<string, string> = {};
        for (const p of paths) {
          const blob = await getVaultBlob(bundleBlobKey(activeBundle.id, p));
          if (!blob) continue;
          const url = URL.createObjectURL(
            new Blob([blob], { type: inferMimeFromName(p, blob.type) })
          );
          allocated.push(url);
          urlMap[p] = url;
        }
        const entryBlob = await getVaultBlob(
          bundleBlobKey(activeBundle.id, entryPath)
        );
        if (!alive || !entryBlob) return;
        const html = await entryBlob.text();
        if (alive) {
          setBundleDoc(rewriteBundleHtml(html, entryPath, urlMap));
        }
      } catch {
        if (alive) {
          setBundleDoc(
            '<html><body style="font-family:system-ui;padding:32px"><h2>Could not load bundle preview</h2></body></html>'
          );
        }
      }
    })();

    return () => {
      alive = false;
      allocated.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [activeBundle?.id, activeBundle?.entryFile, reloadNonce]);

  const tabHistory = historyByTab[activeTab?.id || ''] || {
    urls: [currentUrl],
    idx: 0,
  };

  const navigateTo = (url: string, explicitTitle?: string) => {
    if (!activeTab) return;
    const cleanUrl = url.trim() || 'tmg.app/docs';
    const nextKind = resolveKindFromUrl(cleanUrl);
    const nextUrls = [
      ...tabHistory.urls.slice(0, tabHistory.idx + 1),
      cleanUrl,
    ];
    setHistoryByTab((prev) => ({
      ...prev,
      [activeTab.id]: { urls: nextUrls, idx: nextUrls.length - 1 },
    }));
    setAddressInput(cleanUrl);
    onUpdateTab(activeTab.id, {
      url: cleanUrl,
      title: explicitTitle || nextKind,
      bundleId: undefined,
    });
  };

  const goBack = () => {
    if (!activeTab || tabHistory.idx <= 0) return;
    const nextIdx = tabHistory.idx - 1;
    const targetUrl = tabHistory.urls[nextIdx];
    setHistoryByTab((prev) => ({
      ...prev,
      [activeTab.id]: { ...tabHistory, idx: nextIdx },
    }));
    setAddressInput(targetUrl);
    onUpdateTab(activeTab.id, {
      url: targetUrl,
      title: resolveKindFromUrl(targetUrl),
      bundleId: undefined,
    });
  };

  const goForward = () => {
    if (!activeTab || tabHistory.idx >= tabHistory.urls.length - 1) return;
    const nextIdx = tabHistory.idx + 1;
    const targetUrl = tabHistory.urls[nextIdx];
    setHistoryByTab((prev) => ({
      ...prev,
      [activeTab.id]: { ...tabHistory, idx: nextIdx },
    }));
    setAddressInput(targetUrl);
    onUpdateTab(activeTab.id, {
      url: targetUrl,
      title: resolveKindFromUrl(targetUrl),
      bundleId: undefined,
    });
  };

  const isBookmarked = bookmarks.some((b) => b.url === currentUrl);
  const previewDoc = React.useMemo(() => buildPreviewDocument(files), [files]);

  const tabContent =
    activeKind === 'Docs'
      ? {
          title: 'Getting started',
          body: 'Build one screen at a time. Keep the hierarchy calm, use the same spacing everywhere, and let content breathe. Open any file in Editor, inspect live output in Preview, or open imported ZIP bundles directly in a tab.',
        }
      : activeKind === 'Dashboard'
      ? {
          title: 'Workspace overview',
          body: 'Active projects and completion progress at a glance. Select any project below to inspect or update its tasks.',
        }
      : activeKind === 'Keys'
      ? {
          title: 'Workspace keys',
          body: 'Local environment identifiers for development and preview sessions.',
        }
      : {
          title: 'Live site preview',
          body: 'Rendered directly from your workspace files or imported ZIP bundle.',
        };

  return (
    <section className="fade-up space-y-4">
      {/* Multi-tab Browser Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {tabs.map((tab) => {
          const isCurrent = tab.id === activeTab?.id;
          return (
            <div
              key={tab.id}
              className={`h-9 pl-3 pr-1.5 rounded-xl border inline-flex items-center gap-1.5 shrink-0 transition-colors ${
                isCurrent
                  ? 'bg-[var(--card)] border-[var(--border)] text-[var(--text)] shadow-xs'
                  : 'bg-[var(--card-alt)]/50 border-transparent text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className="text-xs font-medium flex items-center gap-1.5 max-w-[140px]"
              >
                {tab.bundleId && (
                  <FolderArchive size={13} className="text-[var(--accent)] shrink-0" />
                )}
                <span className="truncate">{tab.title}</span>
              </button>
              {tabs.length > 1 && (
                <button
                  type="button"
                  aria-label={`Close tab ${tab.title}`}
                  onClick={() => onCloseTab(tab.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--faint)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onNewTab}
          aria-label="New browser tab"
          className="h-9 px-2.5 rounded-xl border border-dashed border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          <Plus size={14} />
          <span>New Tab</span>
        </button>
      </div>

      {/* Address & Navigation Bar */}
      <div className="flex items-center gap-1.5 bg-[var(--card)] border border-[var(--border)] rounded-full p-1.5">
        <IconButton
          label="Back"
          disabled={tabHistory.idx <= 0}
          onClick={goBack}
        >
          <ChevronLeft size={18} />
        </IconButton>
        <IconButton
          label="Forward"
          disabled={tabHistory.idx >= tabHistory.urls.length - 1}
          onClick={goForward}
        >
          <ChevronRight size={18} />
        </IconButton>
        <IconButton
          label="Reload page"
          onClick={() => {
            setReloadNonce((n) => n + 1);
            onToast('Reloaded');
          }}
        >
          <RotateCw size={17} />
        </IconButton>

        <input
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigateTo(addressInput);
            }
          }}
          aria-label="Browser address bar"
          className="flex-1 min-w-0 bg-[var(--card-alt)] rounded-full px-4 py-2 text-sm outline-none font-mono"
        />

        <IconButton
          label={isBookmarked ? 'Remove bookmark' : 'Bookmark page'}
          active={isBookmarked}
          onClick={() => onToggleBookmark(activeTab?.title || activeKind, currentUrl)}
        >
          <Bookmark size={17} />
        </IconButton>
      </div>

      {/* Quick View Switcher + Bookmarks */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Browser views"
          className="flex items-center gap-1 p-1 bg-[var(--card)] border border-[var(--border)] rounded-xl"
        >
          {(['Docs', 'Preview', 'Dashboard', 'Keys'] as BrowserTabKind[]).map(
            (kind) => {
              const active = !activeBundle && activeKind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => navigateTo(KIND_TO_URL[kind], kind)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-[var(--dark-btn)] text-[var(--page)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {kind}
                </button>
              );
            }
          )}
        </div>

        {bookmarks.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            <span className="text-xs text-[var(--muted)] shrink-0">
              Bookmarks:
            </span>
            {bookmarks.map((bm) => (
              <button
                key={bm.id}
                type="button"
                onClick={() => navigateTo(bm.url, bm.title)}
                className={`text-xs font-medium py-1 transition-colors whitespace-nowrap shrink-0 underline-offset-4 hover:underline ${
                  currentUrl === bm.url
                    ? 'text-[var(--text)] underline'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {bm.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Viewport */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] overflow-hidden min-h-[420px]">
        {activeBundle ? (
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-2)]">
              <span className="text-xs font-mono text-[var(--muted)] truncate">
                bundle://{activeBundle.title}
              </span>
              <span className="text-xs text-[var(--muted)]">
                Sandboxed ZIP / Folder bundle
              </span>
            </div>
            <iframe
              key={`${activeBundle.id}-${reloadNonce}`}
              title={`Bundle ${activeBundle.title}`}
              sandbox="allow-scripts"
              srcDoc={
                bundleDoc ||
                '<!doctype html><html><body style="font-family:system-ui;padding:32px;color:#5F5C54">Loading bundle preview...</body></html>'
              }
              className="w-full h-[440px] bg-white border-0"
            />
          </div>
        ) : activeKind === 'Preview' ? (
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-2)]">
              <span className="text-xs font-mono text-[var(--muted)]">
                {currentUrl}
              </span>
              <span className="text-xs text-[var(--muted)]">
                Live bundle from workspace files
              </span>
            </div>
            <iframe
              key={reloadNonce}
              title="Workspace site preview"
              sandbox="allow-scripts"
              srcDoc={previewDoc}
              className="w-full h-[420px] bg-white border-0"
            />
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <p className="text-xs font-mono text-[var(--muted)]">{currentUrl}</p>
            <h2 className="text-[26px] font-bold tracking-tight mt-2">
              {tabContent.title}
            </h2>
            <p className="text-[15px] leading-[1.65] text-[var(--muted)] mt-2.5 max-w-[580px]">
              {tabContent.body}
            </p>

            {activeKind === 'Docs' && (
              <div className="mt-6 space-y-2.5">
                {[
                  {
                    label: '01. Start or organize a project',
                    action: () => navigateTo(KIND_TO_URL.Dashboard, 'Dashboard'),
                  },
                  {
                    label: '02. Preview your live index.html bundle',
                    action: () => navigateTo(KIND_TO_URL.Preview, 'Preview'),
                  },
                  {
                    label: '03. Inspect workspace keys',
                    action: () => navigateTo(KIND_TO_URL.Keys, 'Keys'),
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className="w-full flex items-center justify-between border border-[var(--border)] rounded-[14px] px-4 py-3 text-left hover:bg-[var(--hover)] transition-colors"
                  >
                    <span className="font-medium text-sm">{item.label}</span>
                    <ChevronRight
                      size={17}
                      className="text-[var(--faint)] shrink-0"
                    />
                  </button>
                ))}
              </div>
            )}

            {activeKind === 'Dashboard' && (
              <div className="mt-6 divide-y divide-[var(--border-2)] border border-[var(--border)] rounded-[16px] overflow-hidden">
                {projects.map((project) => {
                  const progress = calculateProjectProgress(project.tasks);
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => onOpenProject(project.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--hover)] transition-colors"
                    >
                      <FolderKanban
                        size={17}
                        className="text-[var(--muted)] shrink-0"
                      />
                      <span className="flex-1 min-w-0 font-medium text-sm truncate">
                        {project.name}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-[var(--muted)]">
                        {progress.done}/{progress.total} · {progress.percent}%
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-[var(--faint)] shrink-0"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {activeKind === 'Keys' && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    name: 'Live workspace key',
                    masked: 'tmg_live_••••••••48a2',
                    value: 'tmg_live_workspace_48a2',
                  },
                  {
                    name: 'Test workspace key',
                    masked: 'tmg_test_••••••••91c7',
                    value: 'tmg_test_workspace_91c7',
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="border border-[var(--border)] rounded-[16px] p-4"
                  >
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-sm text-[var(--muted)] mt-1 font-mono break-all">
                      {item.masked}
                    </p>
                    <button
                      type="button"
                      onClick={() => onCopy(item.value, 'Key copied')}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text)] hover:text-[var(--accent)] transition-colors"
                    >
                      <Copy size={14} />
                      <span>Copy key</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
