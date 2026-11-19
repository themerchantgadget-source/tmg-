import React from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Eye,
  FilePlus2,
  History,
  Pin,
  RotateCcw,
  Save,
} from 'lucide-react';
import type { FileVersion, WorkspaceFile } from '../../types/workspace';
import { buildPreviewDocument } from '../../utils/workspaceLogic';
import { IconButton, ModalShell } from '../ui/Controls';

interface EditorViewProps {
  files: WorkspaceFile[];
  activeFileId: string | null;
  lineNumbers: boolean;
  onSelectFile: (id: string) => void;
  onBackToFiles: () => void;
  onSaveFile: (id: string, content: string) => void;
  onCreateFile: (
    name: string,
    content: string,
    parentId: string | null
  ) => WorkspaceFile | null;
  onTogglePinFile: (id: string) => void;
  onCopy: (text: string, toastMsg?: string) => void;
  onDownload: (file: WorkspaceFile) => void;
  onToast: (msg: string) => void;
}

export function EditorView({
  files,
  activeFileId,
  lineNumbers,
  onSelectFile,
  onBackToFiles,
  onSaveFile,
  onCreateFile,
  onTogglePinFile,
  onCopy,
  onDownload,
  onToast,
}: EditorViewProps) {
  const editableFiles = React.useMemo(
    () => files.filter((item) => item.kind === 'file'),
    [files]
  );

  const activeFile =
    editableFiles.find((item) => item.id === activeFileId) ||
    editableFiles[0] ||
    null;

  const [draft, setDraft] = React.useState(activeFile?.content ?? '');
  const [showSaveAs, setShowSaveAs] = React.useState(false);
  const [saveAsName, setSaveAsName] = React.useState('');
  const [showPreview, setShowPreview] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const gutterRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    setDraft(activeFile?.content ?? '');
    setShowPreview(false);
  }, [activeFile?.id]);

  const isDirty = activeFile ? draft !== activeFile.content : draft.length > 0;
  const lineCount = draft.split('\n').length;
  const canPreview =
    activeFile?.ext === 'html' || activeFile?.ext === 'md';
  const versions: FileVersion[] = activeFile?.versions ?? [];

  const handleSave = React.useCallback(() => {
    if (activeFile) {
      onSaveFile(activeFile.id, draft);
    } else {
      setShowSaveAs(true);
    }
  }, [activeFile, draft, onSaveFile]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  const handleSaveAsSubmit = () => {
    const trimmed = saveAsName.trim();
    if (!trimmed) return;
    const created = onCreateFile(trimmed, draft, activeFile?.parentId ?? null);
    setSaveAsName('');
    setShowSaveAs(false);
    if (created) {
      onSelectFile(created.id);
    }
  };

  const handleRestoreVersion = (version: FileVersion) => {
    if (!activeFile) return;
    setDraft(version.content);
    onSaveFile(activeFile.id, version.content);
    setShowHistory(false);
    onToast('Version restored');
  };

  const previewFiles = React.useMemo(() => {
    if (!activeFile) return files;
    return files.map((item) =>
      item.id === activeFile.id ? { ...item, content: draft } : item
    );
  }, [files, activeFile, draft]);

  return (
    <section className="fade-up space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <IconButton label="Back to files" onClick={onBackToFiles}>
            <ArrowLeft size={18} />
          </IconButton>
          <div className="min-w-0">
            <h1 className="font-semibold text-base truncate">
              {activeFile?.name || 'Untitled'}
            </h1>
            <p className="text-xs text-[var(--muted)] tabular-nums">
              {activeFile?.ext?.toUpperCase() || 'TEXT'} · {lineCount} lines
              {isDirty ? ' · Unsaved changes' : ' · Saved'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {activeFile && (
            <IconButton
              label={activeFile.pinned ? 'Unpin file' : 'Pin file'}
              active={Boolean(activeFile.pinned)}
              onClick={() => onTogglePinFile(activeFile.id)}
            >
              <Pin size={17} />
            </IconButton>
          )}
          {activeFile && (
            <IconButton
              label={`Version history (${versions.length})`}
              active={showHistory}
              onClick={() => setShowHistory(true)}
            >
              <History size={17} />
            </IconButton>
          )}
          {canPreview && (
            <IconButton
              label={showPreview ? 'Edit code' : 'Preview output'}
              active={showPreview}
              onClick={() => setShowPreview((prev) => !prev)}
            >
              <Eye size={18} />
            </IconButton>
          )}
          <IconButton
            label="Copy code"
            onClick={() => onCopy(draft, 'Code copied')}
          >
            <Copy size={18} />
          </IconButton>
          {activeFile && (
            <IconButton
              label="Download file"
              onClick={() => onDownload({ ...activeFile, content: draft })}
            >
              <Download size={18} />
            </IconButton>
          )}
          <IconButton
            label="Save as new file"
            active={showSaveAs}
            onClick={() => setShowSaveAs((prev) => !prev)}
          >
            <FilePlus2 size={18} />
          </IconButton>
          <button
            type="button"
            onClick={handleSave}
            aria-label="Save file"
            className={`h-9 px-3.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors ml-1 whitespace-nowrap shrink-0 ${
              isDirty
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--dark-btn)] text-[var(--page)]'
            }`}
          >
            <Save size={15} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {editableFiles.length > 0 && (
        <div
          role="tablist"
          aria-label="Open workspace files"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1"
        >
          {editableFiles.map((file) => {
            const isActive = activeFile?.id === file.id;
            return (
              <button
                key={file.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectFile(file.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
                  isActive
                    ? 'bg-[var(--card)] border-[var(--border)] text-[var(--text)]'
                    : 'border-transparent text-[var(--muted)] hover:bg-[var(--card-alt)] hover:text-[var(--text)]'
                }`}
              >
                {file.name}
              </button>
            );
          })}
        </div>
      )}

      {showSaveAs && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex items-center gap-2 fade-up">
          <input
            autoFocus
            value={saveAsName}
            onChange={(e) => setSaveAsName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveAsSubmit();
              if (e.key === 'Escape') setShowSaveAs(false);
            }}
            placeholder="New file name (e.g. copy.html)"
            aria-label="Save as filename"
            className="flex-1 min-w-0 bg-transparent outline-none px-2 text-sm"
          />
          <button
            type="button"
            aria-label="Confirm save as"
            onClick={handleSaveAsSubmit}
            className="w-9 h-9 rounded-full bg-[var(--dark-btn)] text-[var(--page)] flex items-center justify-center shrink-0"
          >
            <Check size={16} />
          </button>
        </div>
      )}

      <div className="bg-[var(--code-bg)] border border-[var(--border)] rounded-[20px] overflow-hidden">
        {showPreview && activeFile?.ext === 'html' ? (
          <iframe
            title={`Preview of ${activeFile.name}`}
            sandbox="allow-scripts"
            srcDoc={buildPreviewDocument(previewFiles)}
            className="w-full h-[460px] bg-white border-0"
          />
        ) : showPreview && activeFile?.ext === 'md' ? (
          <div className="tmg-md p-6 sm:p-8 min-h-[460px]">
            {draft.split('\n').map((line, i) => {
              if (line.startsWith('# ')) {
                return <h1 key={i}>{line.slice(2)}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={i}>{line.slice(3)}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={i}>{line.slice(4)}</h3>;
              }
              if (line.startsWith('- ')) {
                return (
                  <p key={i} className="pl-4 text-[var(--muted)]">
                    • {line.slice(2)}
                  </p>
                );
              }
              if (!line.trim()) {
                return <div key={i} className="h-2" />;
              }
              return <p key={i}>{line}</p>;
            })}
          </div>
        ) : (
          <div className="flex h-[460px]">
            {lineNumbers && (
              <div
                ref={gutterRef}
                aria-hidden="true"
                className="pl-4 pr-3 py-4 text-right text-[13px] leading-[1.7] font-mono tabular-nums text-[var(--faint)] select-none shrink-0 overflow-hidden border-r border-[var(--border-2)]"
              >
                {Array.from({ length: lineCount }, (_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onScroll={(e) => {
                if (gutterRef.current) {
                  gutterRef.current.scrollTop = e.currentTarget.scrollTop;
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const el = e.currentTarget;
                  const start = el.selectionStart;
                  const end = el.selectionEnd;
                  const next =
                    draft.slice(0, start) + '  ' + draft.slice(end);
                  setDraft(next);
                  requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = start + 2;
                  });
                }
              }}
              spellCheck={false}
              aria-label="Code editor"
              className="flex-1 min-w-0 h-full bg-transparent p-4 font-mono text-[13px] leading-[1.7] outline-none resize-none overflow-auto"
            />
          </div>
        )}
      </div>

      <ModalShell
        open={showHistory}
        title={`Version History · ${activeFile?.name || ''}`}
        onClose={() => setShowHistory(false)}
      >
        <div className="space-y-3">
          {versions.length > 0 ? (
            versions.map((ver) => (
              <div
                key={ver.id}
                className="border border-[var(--border)] rounded-2xl p-3.5 bg-[var(--card-alt)]/50 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-[var(--muted)]">
                    Saved {new Date(ver.savedAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRestoreVersion(ver)}
                    className="h-8 px-3 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>Restore</span>
                  </button>
                </div>
                <pre className="text-xs font-mono text-[var(--muted)] bg-[var(--code-bg)] border border-[var(--border-2)] rounded-xl p-2.5 max-h-24 overflow-hidden whitespace-pre-wrap">
                  {ver.content.slice(0, 220)}
                  {ver.content.length > 220 ? '…' : ''}
                </pre>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)] py-6 text-center">
              Previous snapshots appear here automatically whenever you save changes to this file (up to 5 versions).
            </p>
          )}
        </div>
      </ModalShell>
    </section>
  );
}
