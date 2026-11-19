import React from 'react';
import {
  Eye,
  EyeOff,
  FileCode2,
  FolderArchive,
  Play,
  RotateCw,
  Save,
  X,
} from 'lucide-react';
import type { VaultItem } from '../types/workspace';
import { bundleBlobKey, getVaultBlob, putVaultBlob } from '../utils/vaultDb';
import {
  inferMimeFromName,
  isEditableTextPath,
  rewriteBundleHtml,
} from '../utils/vaultUtils';

interface ProjectBundleModalProps {
  bundle: VaultItem | null;
  onClose: () => void;
  onUpdateBundle: (id: string, patch: Partial<VaultItem>) => void;
  onOpenInBrowser: (bundle: VaultItem) => void;
  onToast: (msg: string) => void;
}

export function ProjectBundleModal({
  bundle,
  onClose,
  onUpdateBundle,
  onOpenInBrowser,
  onToast,
}: ProjectBundleModalProps) {
  const [mode, setMode] = React.useState<'preview' | 'files'>('preview');
  const [selectedPath, setSelectedPath] = React.useState<string>('');
  const [codeDraft, setCodeDraft] = React.useState('');
  const [dirty, setDirty] = React.useState(false);
  const [previewDoc, setPreviewDoc] = React.useState('');
  const [hudVisible, setHudVisible] = React.useState(true);
  const [reloadNonce, setReloadNonce] = React.useState(0);

  const paths = bundle?.bundlePaths || [];
  const entryPath = bundle?.entryFile || paths[0] || '';
  const htmlEntries = paths.filter((p) => /\.html?$/i.test(p));

  React.useEffect(() => {
    if (!bundle) return;
    setSelectedPath(entryPath);
    setMode('preview');
    setHudVisible(true);
    setDirty(false);
  }, [bundle?.id]);

  // Build sandboxed srcDoc with Blob URLs for every bundled asset
  React.useEffect(() => {
    if (!bundle || !entryPath) return;
    let alive = true;
    const allocatedUrls: string[] = [];

    (async () => {
      try {
        const urlMap: Record<string, string> = {};
        for (const p of paths) {
          const blob = await getVaultBlob(bundleBlobKey(bundle.id, p));
          if (!blob) continue;
          const mime = inferMimeFromName(p, blob.type);
          const typedBlob = new Blob([blob], { type: mime });
          const url = URL.createObjectURL(typedBlob);
          allocatedUrls.push(url);
          urlMap[p] = url;
        }

        const entryBlob = await getVaultBlob(bundleBlobKey(bundle.id, entryPath));
        if (!alive) return;
        if (!entryBlob) {
          setPreviewDoc(
            '<html><body style="font-family:system-ui;padding:32px"><h2>Entry file missing</h2></body></html>'
          );
          return;
        }
        const rawHtml = await entryBlob.text();
        if (!alive) return;
        setPreviewDoc(rewriteBundleHtml(rawHtml, entryPath, urlMap));
      } catch {
        if (alive) {
          setPreviewDoc(
            '<html><body style="font-family:system-ui;padding:32px"><h2>Could not load bundle</h2></body></html>'
          );
        }
      }
    })();

    return () => {
      alive = false;
      allocatedUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [bundle?.id, entryPath, paths.join('|'), reloadNonce]);

  // Load selected text file for inline editing
  React.useEffect(() => {
    if (!bundle || !selectedPath || !isEditableTextPath(selectedPath)) {
      setCodeDraft('');
      setDirty(false);
      return;
    }
    let alive = true;
    getVaultBlob(bundleBlobKey(bundle.id, selectedPath))
      .then(async (blob) => {
        if (!alive || !blob) return;
        const text = await blob.text();
        if (alive) {
          setCodeDraft(text);
          setDirty(false);
        }
      })
      .catch(() => {
        if (alive) {
          setCodeDraft('');
          setDirty(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [bundle?.id, selectedPath]);

  React.useEffect(() => {
    if (!bundle) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bundle, onClose]);

  if (!bundle) return null;

  const handleSaveSelected = async () => {
    if (!selectedPath) return;
    try {
      const blob = new Blob([codeDraft], {
        type: inferMimeFromName(selectedPath),
      });
      await putVaultBlob(bundleBlobKey(bundle.id, selectedPath), blob);
      setDirty(false);
      setReloadNonce((n) => n + 1);
      onToast(`Saved ${selectedPath}`);
    } catch {
      onToast(`Could not save ${selectedPath}`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={bundle.title}
      className="fixed inset-0 z-[70] bg-[var(--page)] text-[var(--text)] flex flex-col"
    >
      {hudVisible ? (
        <header className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--card)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <FolderArchive size={18} className="text-[var(--accent)] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{bundle.title}</p>
              <p className="text-[11px] text-[var(--muted)] font-mono truncate">
                {paths.length} files · entry: {entryPath || 'none'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {htmlEntries.length > 1 && (
              <select
                aria-label="Entry HTML file"
                value={entryPath}
                onChange={(e) =>
                  onUpdateBundle(bundle.id, { entryFile: e.target.value })
                }
                className="h-8 px-2.5 rounded-xl bg-[var(--card-alt)] border border-[var(--border)] text-xs font-mono"
              >
                {htmlEntries.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}

            <div className="flex bg-[var(--card-alt)] border border-[var(--border)] rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                  mode === 'preview'
                    ? 'bg-[var(--dark-btn)] text-[var(--page)]'
                    : 'text-[var(--muted)]'
                }`}
              >
                <Play size={13} />
                <span>Run</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('files')}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                  mode === 'files'
                    ? 'bg-[var(--dark-btn)] text-[var(--page)]'
                    : 'text-[var(--muted)]'
                }`}
              >
                <FileCode2 size={13} />
                <span>Files</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              aria-label="Reload sandbox"
              className="w-8 h-8 rounded-xl border border-[var(--border)] flex items-center justify-center hover:bg-[var(--card-alt)]"
            >
              <RotateCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => onOpenInBrowser(bundle)}
              className="h-8 px-3 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--card-alt)]"
            >
              Open tab
            </button>
            <button
              type="button"
              onClick={() => setHudVisible(false)}
              aria-label="Hide HUD"
              className="w-8 h-8 rounded-xl border border-[var(--border)] flex items-center justify-center hover:bg-[var(--card-alt)]"
            >
              <EyeOff size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close bundle runner"
              className="w-8 h-8 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] flex items-center justify-center"
            >
              <X size={15} />
            </button>
          </div>
        </header>
      ) : (
        <button
          type="button"
          onClick={() => setHudVisible(true)}
          aria-label="Show bundle HUD"
          className="fixed top-3 right-3 z-10 h-8 px-3 rounded-full bg-black/70 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm"
        >
          <Eye size={13} />
          <span>HUD</span>
        </button>
      )}

      {mode === 'preview' ? (
        <div className="flex-1 bg-white">
          <iframe
            key={`${bundle.id}-${reloadNonce}-${entryPath}`}
            title={`Sandboxed bundle ${bundle.title}`}
            sandbox="allow-scripts"
            srcDoc={
              previewDoc ||
              '<!doctype html><html><body style="font-family:system-ui;padding:32px;color:#5F5C54">Loading bundle...</body></html>'
            }
            className="w-full h-full border-0"
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3">
          <div className="border-r border-[var(--border)] overflow-y-auto p-3 space-y-1 bg-[var(--card)]">
            {paths.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPath(p)}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-mono truncate transition-colors ${
                  selectedPath === p
                    ? 'bg-[var(--accent-soft)] text-[var(--text)] font-semibold'
                    : 'text-[var(--muted)] hover:bg-[var(--card-alt)]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="md:col-span-2 flex flex-col min-h-0 bg-[var(--code-bg)]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--card)]">
              <span className="text-xs font-mono truncate">{selectedPath}</span>
              {isEditableTextPath(selectedPath) && (
                <button
                  type="button"
                  onClick={() => void handleSaveSelected()}
                  disabled={!dirty}
                  className="h-8 px-3 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-xs font-medium flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Save size={13} />
                  <span>Save</span>
                </button>
              )}
            </div>
            {isEditableTextPath(selectedPath) ? (
              <textarea
                value={codeDraft}
                onChange={(e) => {
                  setCodeDraft(e.target.value);
                  setDirty(true);
                }}
                spellCheck={false}
                className="flex-1 w-full bg-transparent p-4 font-mono text-[13px] leading-[1.65] outline-none resize-none"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-[var(--muted)] p-8 text-center">
                Binary asset ({selectedPath}) — switch to Run mode to preview it in context.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
