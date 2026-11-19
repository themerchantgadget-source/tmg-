import React from 'react';
import {
  BookmarkPlus,
  Check,
  Copy,
  FileCode2,
  FileText,
  Film,
  Folder,
  FolderArchive,
  Image as ImageIcon,
  Music,
  X,
} from 'lucide-react';
import type { VaultItem, WorkspaceFile } from '../../types/workspace';
import { tokenizeCode } from '../../utils/workspaceLogic';

interface IconButtonProps {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function IconButton({
  label,
  onClick,
  active = false,
  disabled = false,
  children,
  className = '',
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`w-10 h-10 min-w-10 min-h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150 ${
        active
          ? 'bg-[var(--dark-btn)] text-[var(--page)]'
          : 'bg-transparent text-[var(--text)] hover:bg-[var(--card-alt)]'
      } disabled:opacity-40 disabled:pointer-events-none ${className}`}
    >
      {children}
    </button>
  );
}

interface ToggleSwitchProps {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

export function ToggleSwitch({ on, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full p-[3px] shrink-0 transition-colors duration-150 flex items-center ${
        on
          ? 'justify-end bg-[var(--dark-btn)]'
          : 'justify-start bg-[var(--switch-off)]'
      }`}
    >
      <span
        className={`w-[18px] h-[18px] rounded-full transition-transform duration-150 ${
          on ? 'bg-[var(--page)]' : 'bg-white shadow-sm'
        }`}
      />
    </button>
  );
}

interface CodeBlockProps {
  code: string;
  lang?: string;
  onCopy: () => void;
  onSaveAsFile?: () => void;
}

export function CodeBlock({ code, lang, onCopy, onSaveAsFile }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);
  const tokens = React.useMemo(() => tokenizeCode(code), [code]);
  const lines = React.useMemo(() => code.split('\n'), [code]);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--code-bg)] overflow-hidden text-left">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-mono text-[var(--muted)] font-medium">
          {lang || 'Code'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Copy code snippet"
            title="Copy code"
            onClick={handleCopy}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-alt)] transition-colors"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          {onSaveAsFile && (
            <button
              type="button"
              aria-label="Save code as file"
              title="Save code as file"
              onClick={onSaveAsFile}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-alt)] transition-colors"
            >
              <BookmarkPlus size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="flex text-[13px] leading-[1.65] overflow-x-auto">
        <div
          aria-hidden="true"
          className="pl-3.5 pr-3 py-3 text-right font-mono tabular-nums text-[var(--faint)] select-none shrink-0 border-r border-[var(--border-2)]"
        >
          {lines.map((_, idx) => (
            <div key={idx}>{idx + 1}</div>
          ))}
        </div>
        <pre className="py-3 px-4 font-mono whitespace-pre flex-1 min-w-0">
          <code>
            {tokens.map((token, idx) => {
              const toneClass =
                token.tone === 'attr'
                  ? 'text-[var(--syn-attr)]'
                  : token.tone === 'tag'
                  ? 'text-[var(--syn-tag)]'
                  : token.tone === 'str'
                  ? 'text-[var(--syn-str)]'
                  : token.tone === 'kw'
                  ? 'text-[var(--syn-kw)]'
                  : 'text-[var(--text)]';
              return (
                <span key={idx} className={toneClass}>
                  {token.text}
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}

export function FileTypeIcon({ file }: { file: WorkspaceFile }) {
  if (file.kind === 'folder') {
    return <Folder size={19} className="text-[var(--accent)]" />;
  }
  if (file.ext === 'html') {
    return <FileCode2 size={19} className="text-[var(--syn-tag)]" />;
  }
  if (file.ext === 'css') {
    return <FileCode2 size={19} className="text-[var(--accent)]" />;
  }
  if (file.ext === 'js' || file.ext === 'ts' || file.ext === 'tsx') {
    return <FileCode2 size={19} className="text-[var(--syn-attr)]" />;
  }
  return <FileText size={19} className="text-[var(--muted)]" />;
}

export function VaultThumb({
  item,
  size = 40,
}: {
  item: VaultItem;
  size?: number;
}) {
  if (item.thumb) {
    return (
      <img
        src={item.thumb}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-xl object-cover shrink-0 border border-[var(--border-2)]"
      />
    );
  }
  const Icon =
    item.kind === 'audio'
      ? Music
      : item.kind === 'video'
      ? Film
      : item.kind === 'photo'
      ? ImageIcon
      : FolderArchive;

  return (
    <span
      style={{ width: size, height: size }}
      className="rounded-xl bg-[var(--card-alt)] border border-[var(--border-2)] flex items-center justify-center shrink-0 text-[var(--accent)]"
    >
      <Icon size={Math.max(16, Math.round(size * 0.45))} />
    </span>
  );
}

export function ModalShell({
  open,
  title,
  onClose,
  children,
  maxWidth = 'max-w-[520px]',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
    >
      <button
        type="button"
        aria-label={`Dismiss ${title}`}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
      />
      <div
        className={`relative w-full ${maxWidth} bg-[var(--card)] border border-[var(--border)] rounded-t-[24px] sm:rounded-[22px] shadow-2xl p-5 pb-6 fade-up max-h-[88dvh] overflow-y-auto`}
      >
        <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold tracking-tight truncate">{title}</h2>
          <IconButton label={`Close ${title}`} onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
