import React from 'react';
import { Trash2 } from 'lucide-react';
import type {
  TerminalEntry,
  VaultItem,
  WorkspaceFile,
} from '../../types/workspace';
import { IconButton } from '../ui/Controls';

interface TerminalViewProps {
  logs: TerminalEntry[];
  files: WorkspaceFile[];
  vaultItems: VaultItem[];
  cwdId: string | null;
  history: string[];
  onExecute: (command: string) => void;
  onClear: () => void;
}

const COMMANDS = [
  'help',
  'ls',
  'pwd',
  'cd',
  'cat',
  'open',
  'play',
  'echo',
  'mkdir',
  'touch',
  'rm',
  'cp',
  'mv',
  'history',
  'clear',
];

export function TerminalView({
  logs,
  files,
  vaultItems,
  cwdId,
  history,
  onExecute,
  onClear,
}: TerminalViewProps) {
  const [input, setInput] = React.useState('');
  const [historyIndex, setHistoryIndex] = React.useState(-1);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const cwdLabel = React.useMemo(() => {
    if (!cwdId) return '~';
    const folder = files.find((f) => f.id === cwdId && f.kind === 'folder');
    return folder ? `~/${folder.name}` : '~';
  }, [files, cwdId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input;
    setInput('');
    setHistoryIndex(-1);
    onExecute(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx =
        historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInput(history[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= history.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = input.split(/\s+/);
      if (parts.length <= 1) {
        const prefix = parts[0] || '';
        const match = COMMANDS.find((c) => c.startsWith(prefix));
        if (match) setInput(match + ' ');
      } else {
        const last = parts[parts.length - 1].toLowerCase();
        const cwdFiles = files.filter((f) => (f.parentId ?? null) === cwdId);
        const match =
          cwdFiles.find((f) => f.name.toLowerCase().startsWith(last))?.name ||
          vaultItems.find((v) => v.name.toLowerCase().startsWith(last))?.name;
        if (match) {
          parts[parts.length - 1] = match;
          setInput(parts.join(' '));
        }
      }
    }
  };

  return (
    <section className="fade-up space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.15] font-bold tracking-tight">
            Terminal
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Connected to workspace files &amp; vault · Press Tab to autocomplete, Up/Down for history
          </p>
        </div>
        <IconButton label="Clear terminal" onClick={onClear}>
          <Trash2 size={18} />
        </IconButton>
      </div>

      <div
        onClick={() => inputRef.current?.focus()}
        className="bg-[#181817] text-[#F2F0EB] rounded-[20px] p-4 sm:p-5 min-h-[460px] flex flex-col border border-[var(--border)] cursor-text"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <span className="text-xs font-mono text-white/50">tmg — zsh</span>
          <span className="w-10" />
        </div>

        <div className="flex-1 py-3 font-mono text-[13px] leading-[1.7] overflow-auto space-y-0.5 [overflow-wrap:anywhere]">
          {logs.map((entry) => (
            <div
              key={entry.id}
              className={`whitespace-pre-wrap ${
                entry.kind === 'muted'
                  ? 'text-white/50'
                  : entry.kind === 'cmd'
                  ? 'text-[#FFD479]'
                  : entry.kind === 'error'
                  ? 'text-[#F28B82]'
                  : 'text-white/90'
              }`}
            >
              {entry.text || '\u00A0'}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-white/10 pt-3"
        >
          <span className="text-[#7ED957] font-mono text-[13px] shrink-0">
            tmg {cwdLabel} $
          </span>
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Terminal command input"
            placeholder="help"
            className="flex-1 min-w-0 bg-transparent outline-none font-mono text-[13px] text-white placeholder:text-white/35"
          />
        </form>
      </div>
    </section>
  );
}
