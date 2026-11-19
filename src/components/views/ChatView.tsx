import React from 'react';
import {
  ArrowUp,
  Check,
  Copy,
  FilePlus2,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Mic,
  Paperclip,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { ChatMessage, ChatThread } from '../../types/workspace';
import { formatDuration } from '../../utils/workspaceLogic';
import { CodeBlock, IconButton } from '../ui/Controls';

function VoiceMessagePlayer({ msg }: { msg: ChatMessage }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (!msg.audioUrl) return;
    const audio = new Audio(msg.audioUrl);
    audioRef.current = audio;
    const onTime = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onEnded);
      audio.pause();
    };
  }, [msg.audioUrl]);

  const bars = [
    10, 18, 12, 22, 16, 24, 14, 20, 12, 18, 10, 16, 22, 14, 18, 12, 20, 10, 22,
    16, 24, 12, 18, 14,
  ];

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  };

  return (
    <div className="mt-1 flex items-center gap-3 min-w-[210px] max-w-full">
      <button
        type="button"
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0"
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="flex-1 flex items-end gap-[2px] h-6 min-w-0">
        {bars.map((height, idx) => {
          const filled = (progress / 100) * bars.length > idx;
          return (
            <span
              key={idx}
              className={`w-[3px] rounded-full shrink-0 ${
                playing ? 'wave-bar' : ''
              }`}
              style={{
                height,
                background: 'currentColor',
                opacity: filled ? 0.95 : 0.3,
                animationDelay: `${idx * 0.06}s`,
              }}
            />
          );
        })}
      </div>
      <span className="text-[11px] opacity-75 font-mono tabular-nums shrink-0">
        {formatDuration(msg.duration || 0)}
      </span>
    </div>
  );
}

interface ChatViewProps {
  threads: ChatThread[];
  activeThreadId: string;
  messages: ChatMessage[];
  autoScroll: boolean;
  autoTranscribe: boolean;
  hasMiniPlayer?: boolean;
  onSelectThread: (threadId: string) => void;
  onCreateThread: (name: string) => void;
  onSendMessage: (text: string) => void;
  onSendVoice: (audioUrl: string, duration: number) => void;
  onClearThread: () => void;
  onDeleteMessage: (id: string) => void;
  onSaveAsFile: (msg: ChatMessage, codeOnly?: boolean) => void;
  onSaveAsArtifact: (msg: ChatMessage) => void;
  onCopy: (text: string, toastMsg?: string) => void;
  onOpenSearch: () => void;
  onToast: (msg: string) => void;
  isTyping: boolean;
}

export function ChatView({
  threads,
  activeThreadId,
  messages,
  autoScroll,
  autoTranscribe,
  hasMiniPlayer = false,
  onSelectThread,
  onCreateThread,
  onSendMessage,
  onSendVoice,
  onClearThread,
  onDeleteMessage,
  onSaveAsFile,
  onSaveAsArtifact,
  onCopy,
  onOpenSearch,
  onToast,
  isTyping,
}: ChatViewProps) {
  const [draft, setDraft] = React.useState('');
  const [showNewThread, setShowNewThread] = React.useState(false);
  const [newThreadName, setNewThreadName] = React.useState('');
  const [recording, setRecording] = React.useState(false);
  const [recSeconds, setRecSeconds] = React.useState(0);
  const [showAudioPicker, setShowAudioPicker] = React.useState(false);

  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const audioInputRef = React.useRef<HTMLInputElement | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<number | null>(null);

  const activeThread =
    threads.find((t) => t.id === activeThreadId) || threads[0];
  const threadMessages = React.useMemo(
    () => messages.filter((m) => m.threadId === activeThread?.id),
    [messages, activeThread?.id]
  );

  React.useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadMessages.length, isTyping, autoScroll]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft('');
    onSendMessage(trimmed);
  };

  const handleCreateThreadSubmit = () => {
    const trimmed = newThreadName.trim();
    if (!trimmed) return;
    onCreateThread(trimmed);
    setNewThreadName('');
    setShowNewThread(false);
  };

  const startRecording = async () => {
    if (recording) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error('unsupported');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeCandidates = ['audio/webm', 'audio/mp4', 'audio/ogg', ''];
      let recorder: MediaRecorder | null = null;
      for (const mime of mimeCandidates) {
        try {
          recorder = mime
            ? new MediaRecorder(stream, { mimeType: mime })
            : new MediaRecorder(stream);
          break;
        } catch {
          continue;
        }
      }
      if (!recorder) throw new Error('unsupported');

      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      recorder.start();
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecSeconds((s) => s + 1);
      }, 1000);

      if (autoTranscribe) {
        try {
          const SpeechRec =
            (window as unknown as { SpeechRecognition?: new () => unknown })
              .SpeechRecognition ||
            (window as unknown as { webkitSpeechRecognition?: new () => unknown })
              .webkitSpeechRecognition;
          if (SpeechRec) {
            const rec = new SpeechRec() as {
              continuous: boolean;
              interimResults: boolean;
              onresult: (e: { results?: Array<Array<{ transcript?: string }>> }) => void;
              start: () => void;
            };
            rec.continuous = false;
            rec.interimResults = false;
            rec.onresult = (ev) => {
              const transcript = ev.results?.[0]?.[0]?.transcript;
              if (transcript) setDraft(transcript);
            };
            (rec as unknown as { onerror?: () => void }).onerror = () => {};
            rec.start();
          }
        } catch {
          // SpeechRecognition may throw synchronously in restricted contexts; keep audio recording active
        }
      }
    } catch {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
        }
      } catch {
        // Ignore stop cleanup failure
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      streamRef.current = null;
      setRecording(false);
      setRecSeconds(0);
      onToast('Microphone unavailable — attach an audio file instead');
      setShowAudioPicker(true);
    }
  };

  const stopRecording = (send: boolean) => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    const stream = streamRef.current;
    const duration = Math.max(1, recSeconds);
    setRecording(false);
    setRecSeconds(0);

    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        try {
          if (send) {
            const blob = new Blob(chunksRef.current, {
              type: recorder.mimeType || 'audio/webm',
            });
            const url = URL.createObjectURL(blob);
            onSendVoice(url, duration);
          }
        } catch {
          onToast('Could not finalize voice recording');
        } finally {
          stream?.getTracks().forEach((t) => t.stop());
          recorderRef.current = null;
          streamRef.current = null;
        }
      };
      try {
        recorder.stop();
      } catch {
        stream?.getTracks().forEach((t) => t.stop());
        recorderRef.current = null;
        streamRef.current = null;
      }
    } else {
      stream?.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      streamRef.current = null;
    }
  };

  const stickyBottomClass = hasMiniPlayer
    ? 'bottom-[132px] md:bottom-[76px]'
    : 'bottom-[64px] md:bottom-0';

  return (
    <section
      className={`fade-up flex flex-col min-h-[540px] ${
        hasMiniPlayer ? 'pb-20 md:pb-16' : ''
      }`}
    >
      {/* Multi-thread switcher strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3">
        {threads.map((thread) => {
          const active = thread.id === activeThread?.id;
          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelectThread(thread.id)}
              className={`h-9 px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-[var(--dark-btn)] text-[var(--page)] border-[var(--dark-btn)]'
                  : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  active
                    ? 'bg-white/20 text-current'
                    : 'bg-[var(--card-alt)] text-[var(--text)]'
                }`}
              >
                {thread.avatar}
              </span>
              <span>{thread.name}</span>
              {thread.unread > 0 && !active && (
                <span className="font-mono tabular-nums text-[var(--accent)] font-semibold">
                  {thread.unread}
                </span>
              )}
            </button>
          );
        })}

        {showNewThread ? (
          <div className="flex items-center gap-1 h-9 px-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] shrink-0">
            <input
              autoFocus
              value={newThreadName}
              onChange={(e) => setNewThreadName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateThreadSubmit();
                if (e.key === 'Escape') setShowNewThread(false);
              }}
              placeholder="Thread name..."
              aria-label="New chat thread name"
              className="w-28 bg-transparent outline-none text-xs"
            />
            <button
              type="button"
              onClick={handleCreateThreadSubmit}
              aria-label="Create chat thread"
              className="text-[var(--accent)]"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => setShowNewThread(false)}
              aria-label="Cancel new chat thread"
              className="text-[var(--muted)]"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewThread(true)}
            className="h-9 px-3 rounded-xl border border-dashed border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Plus size={14} />
            <span>New Chat</span>
          </button>
        )}
      </div>

      {/* Active thread header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
        <div className="w-10 h-10 rounded-full bg-[var(--dark-btn)] text-[var(--page)] flex items-center justify-center font-semibold text-sm shrink-0">
          {activeThread?.avatar || 'M'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base leading-tight truncate">
            {activeThread?.name || 'Merchant'}
          </h1>
          <p className="text-xs text-[var(--muted)] leading-tight mt-0.5">
            {activeThread?.role || 'Workspace assistant'} · {threadMessages.length}{' '}
            {threadMessages.length === 1 ? 'message' : 'messages'}
          </p>
        </div>
        <IconButton label="Search chat" onClick={onOpenSearch}>
          <Search size={18} />
        </IconButton>
        <IconButton label="Clear current thread" onClick={onClearThread}>
          <Trash2 size={17} />
        </IconButton>
      </div>

      <div className="flex-1 py-5 space-y-4">
        {threadMessages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[78%] min-w-0 rounded-[18px] px-4 py-3 ${
                  isUser
                    ? 'bg-[var(--dark-btn)] text-[var(--page)] rounded-br-[6px]'
                    : 'bg-[var(--card)] text-[var(--text)] border border-[var(--border)] rounded-bl-[6px]'
                }`}
              >
                {msg.text && (
                  <p className="text-[15px] leading-[1.6] [overflow-wrap:anywhere]">
                    {msg.text}
                  </p>
                )}

                {msg.code && (
                  <CodeBlock
                    code={msg.code}
                    lang={msg.lang}
                    onCopy={() => onCopy(msg.code || '', 'Code copied')}
                    onSaveAsFile={() => onSaveAsFile(msg, true)}
                  />
                )}

                {msg.audioUrl && <VoiceMessagePlayer msg={msg} />}

                {msg.transcript && (
                  <p className="text-xs opacity-75 mt-1 [overflow-wrap:anywhere]">
                    {msg.transcript}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 mt-2">
                  <span
                    className={`text-[11px] font-mono tabular-nums ${
                      isUser ? 'opacity-65' : 'text-[var(--muted)]'
                    }`}
                  >
                    {msg.time}
                  </span>

                  <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      aria-label="Copy message"
                      title="Copy"
                      onClick={() =>
                        onCopy(msg.code || msg.text || 'Voice message')
                      }
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isUser
                          ? 'opacity-75 hover:opacity-100 hover:bg-white/15 dark:hover:bg-black/15'
                          : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-alt)]'
                      }`}
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label="Save message as file"
                      title="Save as file"
                      onClick={() => onSaveAsFile(msg)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isUser
                          ? 'opacity-75 hover:opacity-100 hover:bg-white/15 dark:hover:bg-black/15'
                          : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-alt)]'
                      }`}
                    >
                      <FilePlus2 size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label="Save message as artifact"
                      title="Save as artifact"
                      onClick={() => onSaveAsArtifact(msg)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isUser
                          ? 'opacity-75 hover:opacity-100 hover:bg-white/15 dark:hover:bg-black/15'
                          : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-alt)]'
                      }`}
                    >
                      <Layers size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete message"
                      title="Delete"
                      onClick={() => onDeleteMessage(msg.id)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isUser
                          ? 'opacity-75 hover:opacity-100 hover:bg-white/15 dark:hover:bg-black/15'
                          : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-alt)]'
                      }`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {threadMessages.length === 0 && (
          <div className="py-12 flex flex-col items-center text-center text-[var(--muted)]">
            <MessageSquare size={26} className="text-[var(--faint)]" />
            <p className="mt-2.5 text-sm font-medium text-[var(--text)]">
              Fresh thread with {activeThread?.name || 'Merchant'}
            </p>
            <p className="mt-1 text-xs">
              Ask for a component snippet, workspace summary, or drop a note below.
            </p>
          </div>
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] rounded-bl-[6px] px-4 py-3 flex gap-1.5">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--muted)]" />
              <span
                className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--muted)]"
                style={{ animationDelay: '.15s' }}
              />
              <span
                className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--muted)]"
                style={{ animationDelay: '.3s' }}
              />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {recording ? (
        <div className={`sticky ${stickyBottomClass} bg-[var(--page)] pt-2 pb-1`}>
          <div className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-full pl-4 pr-2 py-2">
            <span
              className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shrink-0"
              style={{ animation: 'pulseDot 1s infinite' }}
            />
            <span className="text-sm font-mono tabular-nums shrink-0">
              {formatDuration(recSeconds)}
            </span>
            <span className="flex-1 flex items-end gap-[3px] h-6 justify-center">
              {[
                12, 20, 10, 24, 16, 22, 12, 18, 24, 14, 20, 12, 18, 10, 22, 16,
                20, 12,
              ].map((h, i) => (
                <span
                  key={i}
                  className="wave-bar w-[3px] rounded-full bg-[var(--accent)]"
                  style={{ height: h, animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </span>
            <button
              type="button"
              aria-label="Cancel voice recording"
              onClick={() => stopRecording(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--border)]"
            >
              <X size={18} />
            </button>
            <button
              type="button"
              aria-label="Send voice recording"
              onClick={() => stopRecording(true)}
              className="w-10 h-10 rounded-full bg-[var(--dark-btn)] text-[var(--page)] flex items-center justify-center"
            >
              <Check size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className={`sticky ${stickyBottomClass} bg-[var(--page)] pt-2 pb-1`}>
          <div className="flex items-end gap-1 bg-[var(--card)] border border-[var(--border)] rounded-[24px] p-1.5 shadow-xs">
            <IconButton
              label="Attach audio"
              onClick={() => setShowAudioPicker((prev) => !prev)}
            >
              <Paperclip size={18} />
            </IconButton>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder={`Message ${activeThread?.name || 'Merchant'}...`}
              aria-label="Message input"
              className="flex-1 min-w-0 bg-transparent outline-none px-2 py-2.5 resize-none max-h-[112px] text-[15px] placeholder:text-[var(--faint)]"
            />
            <IconButton label="Record voice" onClick={startRecording}>
              <Mic size={18} />
            </IconButton>
            <button
              type="button"
              aria-label="Send message"
              disabled={!draft.trim()}
              onClick={handleSend}
              className="w-10 h-10 rounded-full bg-[var(--dark-btn)] text-[var(--page)] flex items-center justify-center shrink-0 disabled:opacity-35 transition-opacity"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      )}

      {showAudioPicker && (
        <div className="mt-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 flex items-center gap-2">
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            aria-label="Choose audio file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                onSendVoice(url, 12);
                setShowAudioPicker(false);
              }
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center gap-2 text-sm font-medium px-2 py-1 rounded-lg hover:bg-[var(--card-alt)]"
          >
            <ImageIcon size={16} />
            <span>Choose audio file</span>
          </button>
          <button
            type="button"
            aria-label="Close audio picker"
            onClick={() => setShowAudioPicker(false)}
            className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--card-alt)]"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
