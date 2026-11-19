import React from 'react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FolderArchive,
  FolderKanban,
  Plus,
  RotateCw,
  Search,
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
import { buildPreviewDocument, calculateProjectProgress } from '../../utils/workspaceLogic';
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

const APP_URLS: Record<BrowserTabKind, string> = {
  Docs: 'tmg.app/docs', Preview: 'tmg.app/preview',
  Dashboard: 'tmg.app/dashboard', Keys: 'tmg.app/keys',
};
const APP_KINDS: BrowserTabKind[] = ['Docs', 'Preview', 'Dashboard', 'Keys'];
const INTERNAL_HOSTS = new Set(['tmg.app', 'www.tmg.app']);

type HistoryState = { urls: string[]; idx: number };

function classifyUrl(url: string): BrowserTabKind | null {
  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`);
    if (!INTERNAL_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    const path = parsed.pathname.toLowerCase();
    if (path.includes('preview')) return 'Preview';
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('keys')) return 'Keys';
    return 'Docs';
  } catch {
    return null;
  }
}

function resolveAddress(input: string): string {
  const value = input.trim();
  if (!value) return 'tmg.app/docs';
  if (/^(https?:\/\/|tmg\.app\/|bundle:\/\/)/i.test(value)) return value;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?([/?#]|$)/i.test(value)) return `http://${value}`;
  if (/^[\w.-]+\.[a-z]{2,}(:\d+)?([/?#]|$)/i.test(value)) return `https://${value}`;
  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

export function BrowserView({
  files, vaultItems, projects, bookmarks, tabs, activeTabId, onSelectTab,
  onNewTab, onCloseTab, onUpdateTab, onToggleBookmark, onOpenProject, onCopy, onToast,
}: BrowserViewProps) {
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
  const currentUrl = activeTab?.url || APP_URLS.Docs;
  const activeKind = activeTab?.bundleId ? 'Preview' : classifyUrl(currentUrl);
  const activeBundle = activeTab?.bundleId
    ? vaultItems.find((item) => item.id === activeTab.bundleId && item.kind === 'bundle')
    : null;
  const [historyByTab, setHistoryByTab] = React.useState<Record<string, HistoryState>>({});
  const [addressInput, setAddressInput] = React.useState(currentUrl);
  const [reloadNonce, setReloadNonce] = React.useState(0);
  const [bundleDoc, setBundleDoc] = React.useState('');
  const [frameFailed, setFrameFailed] = React.useState(false);
  const frameRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    setAddressInput(currentUrl);
    setFrameFailed(false);
  }, [activeTab?.id, currentUrl]);

  React.useEffect(() => {
    if (!activeBundle) { setBundleDoc(''); return; }
    let alive = true;
    const allocated: string[] = [];
    const paths = activeBundle.bundlePaths || [];
    const entry = activeBundle.entryFile || paths[0] || '';
    if (!entry) { setBundleDoc('<!doctype html><p>Bundle entry file is missing.</p>'); return; }
    void (async () => {
      try {
        const map: Record<string, string> = {};
        for (const path of paths) {
          const blob = await getVaultBlob(bundleBlobKey(activeBundle.id, path));
          if (!blob) continue;
          const url = URL.createObjectURL(new Blob([blob], { type: inferMimeFromName(path, blob.type) }));
          allocated.push(url);
          map[path] = url;
        }
        const blob = await getVaultBlob(bundleBlobKey(activeBundle.id, entry));
        if (!alive) return;
        if (!blob) { setBundleDoc('<!doctype html><p>Could not find the bundle entry file.</p>'); return; }
        setBundleDoc(rewriteBundleHtml(await blob.text(), entry, map));
      } catch {
        if (alive) setBundleDoc('<!doctype html><p>Could not load this bundle preview.</p>');
      }
    })();
    return () => { alive = false; allocated.forEach(URL.revokeObjectURL); };
  }, [activeBundle?.id, activeBundle?.entryFile, reloadNonce]);

  const tabHistory = activeTab
    ? historyByTab[activeTab.id] || { urls: [currentUrl], idx: 0 }
    : { urls: [currentUrl], idx: 0 };

  const navigateTo = (raw: string, title?: string, replace = false) => {
    if (!activeTab) return;
    const url = resolveAddress(raw);
    const kind = classifyUrl(url);
    setHistoryByTab((prev) => {
      const history = prev[activeTab.id] || { urls: [currentUrl], idx: 0 };
      const urls = replace
        ? [...history.urls.slice(0, history.idx), url, ...history.urls.slice(history.idx + 1)]
        : [...history.urls.slice(0, history.idx + 1), url];
      return { ...prev, [activeTab.id]: { urls, idx: replace ? history.idx : urls.length - 1 } };
    });
    setAddressInput(url);
    setFrameFailed(false);
    onUpdateTab(activeTab.id, {
      url,
      title: title || (kind || (url.startsWith('https://www.google.com/search') ? 'Search' : 'New page')),
      bundleId: undefined,
    });
  };

  const goToHistory = (idx: number) => {
    if (!activeTab || idx < 0 || idx >= tabHistory.urls.length) return;
    const url = tabHistory.urls[idx];
    setHistoryByTab((prev) => ({ ...prev, [activeTab.id]: { ...tabHistory, idx } }));
    setAddressInput(url);
    setFrameFailed(false);
    onUpdateTab(activeTab.id, { url, title: classifyUrl(url) || 'Web page', bundleId: undefined });
  };

  const isBookmarked = bookmarks.some((item) => item.url === currentUrl);
  const previewDoc = React.useMemo(() => buildPreviewDocument(files), [files]);
  const externalUrl = (() => {
    try {
      const parsed = new URL(currentUrl.includes('://') ? currentUrl : `https://${currentUrl}`);
      return /^https?:$/.test(parsed.protocol) ? parsed.href : null;
    } catch { return null; }
  })();
  const isExternal = Boolean(externalUrl && !activeKind && !activeBundle);

  return (
    <section className="fade-up space-y-4">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {tabs.map((tab) => (
          <div key={tab.id} className={`h-9 pl-3 pr-1.5 rounded-xl border inline-flex items-center gap-1.5 shrink-0 ${tab.id === activeTab?.id ? 'bg-[var(--card)] border-[var(--border)] text-[var(--text)] shadow-xs' : 'bg-[var(--card-alt)]/50 border-transparent text-[var(--muted)] hover:text-[var(--text)]'}`}>
            <button type="button" onClick={() => onSelectTab(tab.id)} className="text-xs font-medium flex items-center gap-1.5 max-w-[150px]">
              {tab.bundleId && <FolderArchive size={13} className="text-[var(--accent)] shrink-0" />}
              <span className="truncate">{tab.title}</span>
            </button>
            {tabs.length > 1 && <button type="button" aria-label={`Close tab ${tab.title}`} onClick={() => onCloseTab(tab.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--faint)] hover:text-[var(--text)] hover:bg-[var(--hover)]"><X size={13} /></button>}
          </div>
        ))}
        <button type="button" onClick={onNewTab} aria-label="New browser tab" className="h-9 px-2.5 rounded-xl border border-dashed border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] inline-flex items-center gap-1"><Plus size={14} />New Tab</button>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); navigateTo(addressInput); }} className="flex items-center gap-1.5 bg-[var(--card)] border border-[var(--border)] rounded-full p-1.5">
        <IconButton label="Back" disabled={tabHistory.idx <= 0} onClick={() => goToHistory(tabHistory.idx - 1)}><ChevronLeft size={18} /></IconButton>
        <IconButton label="Forward" disabled={tabHistory.idx >= tabHistory.urls.length - 1} onClick={() => goToHistory(tabHistory.idx + 1)}><ChevronRight size={18} /></IconButton>
        <IconButton label="Reload page" onClick={() => { setReloadNonce((n) => n + 1); setFrameFailed(false); if (frameRef.current && externalUrl) frameRef.current.src = externalUrl; }}><RotateCw size={17} /></IconButton>
        <input value={addressInput} onChange={(event) => setAddressInput(event.target.value)} aria-label="Address or search" placeholder="Search or enter a website address" className="flex-1 min-w-0 bg-[var(--card-alt)] rounded-full px-4 py-2 text-sm outline-none font-mono" />
        {externalUrl && <a href={externalUrl} target="_blank" rel="noopener noreferrer" aria-label="Open page in a new browser tab" className="h-9 w-9 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"><ExternalLink size={16} /></a>}
        <IconButton label={isBookmarked ? 'Remove bookmark' : 'Bookmark page'} active={isBookmarked} onClick={() => onToggleBookmark(activeTab?.title || 'Web page', currentUrl)}><Bookmark size={17} /></IconButton>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Workspace browser pages" className="flex items-center gap-1 p-1 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          {APP_KINDS.map((kind) => <button key={kind} type="button" role="tab" aria-selected={!activeBundle && activeKind === kind} onClick={() => navigateTo(APP_URLS[kind], kind)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${!activeBundle && activeKind === kind ? 'bg-[var(--dark-btn)] text-[var(--page)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}>{kind}</button>)}
        </div>
        {bookmarks.length > 0 && <div className="flex items-center gap-3 overflow-x-auto no-scrollbar"><span className="text-xs text-[var(--muted)] shrink-0">Bookmarks:</span>{bookmarks.map((item) => <button key={item.id} type="button" onClick={() => navigateTo(item.url, item.title)} className={`text-xs font-medium py-1 whitespace-nowrap shrink-0 underline-offset-4 hover:underline ${currentUrl === item.url ? 'text-[var(--text)] underline' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}>{item.title}</button>)}</div>}
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] overflow-hidden min-h-[440px]">
        {activeBundle ? <><div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-2)]"><span className="text-xs font-mono text-[var(--muted)] truncate">bundle://{activeBundle.title}</span><span className="text-xs text-[var(--muted)]">Sandboxed project preview</span></div><iframe key={`${activeBundle.id}-${reloadNonce}`} title={`Bundle ${activeBundle.title}`} sandbox="allow-scripts" srcDoc={bundleDoc || '<!doctype html><p>Loading bundle…</p>'} className="w-full h-[min(70vh,720px)] bg-white border-0" /></>
          : activeKind === 'Preview' ? <><div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-2)]"><span className="text-xs font-mono text-[var(--muted)]">{currentUrl}</span><span className="text-xs text-[var(--muted)]">Local workspace preview</span></div><iframe key={reloadNonce} title="Workspace site preview" sandbox="allow-scripts" srcDoc={previewDoc} className="w-full h-[min(70vh,720px)] bg-white border-0" /></>
          : isExternal && externalUrl ? <><div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-2)] gap-3"><span className="text-xs font-mono text-[var(--muted)] truncate">{externalUrl}</span><a href={externalUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[var(--accent)] inline-flex gap-1 items-center shrink-0">Open full page <ExternalLink size={13} /></a></div>{frameFailed && <div role="status" className="p-4 text-sm bg-[var(--accent-soft)] text-[var(--text)]">This website prevents embedding in an app. Open it in a new browser tab to continue.</div>}<iframe ref={frameRef} key={`${activeTab?.id}-${currentUrl}-${reloadNonce}`} title={activeTab?.title || 'Web page'} src={externalUrl} sandbox="allow-forms allow-scripts allow-same-origin allow-popups" referrerPolicy="no-referrer" onError={() => setFrameFailed(true)} className="w-full h-[min(70vh,720px)] bg-white border-0" /></>
          : <div className="p-6 sm:p-8"><p className="text-xs font-mono text-[var(--muted)]">{currentUrl}</p><h2 className="text-[26px] font-bold tracking-tight mt-2">{activeKind === 'Dashboard' ? 'Workspace overview' : activeKind === 'Keys' ? 'Workspace keys' : 'Getting started'}</h2><p className="text-[15px] leading-[1.65] text-[var(--muted)] mt-2.5 max-w-[580px]">{activeKind === 'Dashboard' ? 'Active projects and completion progress at a glance. Select a project to inspect its tasks.' : activeKind === 'Keys' ? 'Example workspace identifiers for development and preview sessions.' : 'Search the web from the address bar, enter a website, or use these workspace pages. Some websites block embedding; use Open full page when needed.'}</p>
            {activeKind === 'Docs' && <div className="mt-6 space-y-2.5">{[{ label: 'Open workspace dashboard', kind: 'Dashboard' as const }, { label: 'Preview your local index.html', kind: 'Preview' as const }, { label: 'Inspect example workspace keys', kind: 'Keys' as const }].map((item) => <button key={item.kind} type="button" onClick={() => navigateTo(APP_URLS[item.kind], item.kind)} className="w-full flex items-center justify-between border border-[var(--border)] rounded-[14px] px-4 py-3 text-left hover:bg-[var(--hover)]"><span className="font-medium text-sm">{item.label}</span><ChevronRight size={17} className="text-[var(--faint)]" /></button>)}</div>}
            {activeKind === 'Dashboard' && <div className="mt-6 divide-y divide-[var(--border-2)] border border-[var(--border)] rounded-[16px] overflow-hidden">{projects.map((project) => { const progress = calculateProjectProgress(project.tasks); return <button key={project.id} type="button" onClick={() => onOpenProject(project.id)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--hover)]"><FolderKanban size={17} className="text-[var(--muted)]" /><span className="flex-1 min-w-0 font-medium text-sm truncate">{project.name}</span><span className="text-xs font-mono text-[var(--muted)]">{progress.done}/{progress.total} · {progress.percent}%</span><ChevronRight size={16} className="text-[var(--faint)]" /></button>; })}</div>}
            {activeKind === 'Keys' && <div className="mt-6 grid gap-3 sm:grid-cols-2">{[{ name: 'Live workspace key', value: 'tmg_live_workspace_48a2' }, { name: 'Test workspace key', value: 'tmg_test_workspace_91c7' }].map((item) => <div key={item.name} className="border border-[var(--border)] rounded-[16px] p-4"><p className="font-medium text-sm">{item.name}</p><p className="text-sm text-[var(--muted)] mt-1 font-mono break-all">{item.value.replace(/\w{4}$/, '••••')}</p><button type="button" onClick={() => onCopy(item.value, 'Example key copied')} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium hover:text-[var(--accent)]"><Copy size={14} />Copy example key</button></div>)}</div>}
          </div>}
      </div>
      <p className="text-xs text-[var(--muted)]">Web pages run in a restricted frame. Some sites block embedded browsing; use the open-in-new-tab button for those pages.</p>
    </section>
  );
}
