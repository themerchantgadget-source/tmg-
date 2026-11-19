import React from 'react';
import { CommandPalette } from './components/CommandPalette';
import { Header } from './components/Header';
import { MiniPlayer } from './components/MiniPlayer';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { PinLockScreen } from './components/PinLockScreen';
import { ProjectBundleModal } from './components/ProjectBundleModal';
import { QuickCreateModal } from './components/QuickCreateModal';
import { Sidebar } from './components/Sidebar';
import { ArtifactsView } from './components/views/ArtifactsView';
import { BrowserView } from './components/views/BrowserView';
import { ChatView } from './components/views/ChatView';
import { EditorView } from './components/views/EditorView';
import { FilesView } from './components/views/FilesView';
import { HomeView } from './components/views/HomeView';
import { ProjectsView } from './components/views/ProjectsView';
import { SettingsView } from './components/views/SettingsView';
import { StudioView } from './components/views/StudioView';
import { TerminalView } from './components/views/TerminalView';
import { TrashView } from './components/views/TrashView';
import { createInitialSnapshot } from './data/seed';
import type {
  Artifact,
  BrowserTabItem,
  ChatMessage,
  ChatThread,
  NavSection,
  Project,
  TerminalEntry,
  ThemeId,
  TrashItem,
  VaultCollection,
  VaultItem,
  WorkspaceFile,
  WorkspaceSnapshot,
} from './types/workspace';
import {
  configureStudioEngine,
  nextTrack,
  playVaultItem,
  queuePlayNext,
  setEqBands,
  setSpeed,
  setVolumeLeveler,
  stopPlayback,
  type StudioPlaybackState,
  subscribeStudio,
  togglePlay,
} from './utils/audioEngine';
import {
  createSamplePosterSvgBlob,
  createWarmChordWavBlob,
} from './utils/sampleMedia';
import {
  bundleBlobKey,
  clearAllVaultBlobs,
  deleteBundleBlobs,
  deleteVaultBlob,
  getVaultBlob,
  putVaultBlob,
} from './utils/vaultDb';
import {
  classifyImportFile,
  detectBundleEntryHtml,
  extractPhotoThumb,
  extractVideoThumb,
  inferMimeFromName,
  probeMediaDuration,
  sanitizeRelativePath,
  stripCommonTopFolder,
  unpackZipArchive,
} from './utils/vaultUtils';
import {
  createId,
  executeTerminalCommand,
  generateChatReply,
  getFileExtension,
  sanitizeWorkspaceSnapshot,
} from './utils/workspaceLogic';

const STORAGE_KEY = 'tmg-workspace-v2';
const LEGACY_STORAGE_KEY = 'tmg-workspace-v1';

function resolveThemeAttribute(theme: ThemeId): string {
  if (theme === 'System') {
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  return theme.toLowerCase();
}

function loadInitialSnapshot(): WorkspaceSnapshot {
  const seed = createInitialSnapshot();
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return seed;
    const parsed: unknown = JSON.parse(raw);
    return sanitizeWorkspaceSnapshot(parsed, seed);
  } catch {
    return seed;
  }
}

export default function App() {
  const [initial] = React.useState<WorkspaceSnapshot>(() =>
    loadInitialSnapshot()
  );

  const [section, setSection] = React.useState<NavSection>('home');
  const [files, setFiles] = React.useState<WorkspaceFile[]>(initial.files);
  const [projects, setProjects] = React.useState<Project[]>(initial.projects);
  const [artifacts, setArtifacts] = React.useState<Artifact[]>(
    initial.artifacts
  );
  const [trash, setTrash] = React.useState<TrashItem[]>(initial.trash);
  const [threads, setThreads] = React.useState<ChatThread[]>(initial.threads);
  const [activeThreadId, setActiveThreadId] = React.useState<string>(
    initial.threads[0]?.id || 'c1'
  );
  const [messages, setMessages] = React.useState<ChatMessage[]>(
    initial.messages
  );
  const [bookmarks, setBookmarks] = React.useState(initial.bookmarks);
  const [browserTabs, setBrowserTabs] = React.useState<BrowserTabItem[]>(
    initial.browserTabs
  );
  const [activeBrowserTabId, setActiveBrowserTabId] = React.useState<string>(
    initial.browserTabs[0]?.id || 'tab-1'
  );
  const [vaultItems, setVaultItems] = React.useState<VaultItem[]>(
    initial.vaultItems
  );
  const [collections, setCollections] = React.useState<VaultCollection[]>(
    initial.collections
  );
  const [settings, setSettings] = React.useState(initial.settings);

  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(
    null
  );
  const [activeFileId, setActiveFileId] = React.useState<string | null>(
    initial.files.find((f) => f.kind === 'file')?.id ?? null
  );
  const [selectedProjectId, setSelectedProjectId] = React.useState<
    string | null
  >(null);
  const [selectedArtifactId, setSelectedArtifactId] = React.useState<
    string | null
  >(null);
  const [activePhotoId, setActivePhotoId] = React.useState<string | null>(null);
  const [activeBundleId, setActiveBundleId] = React.useState<string | null>(
    null
  );

  const [playback, setPlayback] = React.useState<StudioPlaybackState>({
    activeId: null,
    kind: null,
    playing: false,
    buffering: false,
    time: 0,
    duration: 0,
    speed: initial.settings.playbackSpeed || 1,
    volume: 1,
    muted: false,
    boost: 1,
    repeat: 'off',
    shuffle: false,
    loopA: null,
    loopB: null,
    sleepUntil: 0,
    queue: [],
    eq: initial.settings.eqBands || [0, 0, 0, 0, 0],
    leveler: initial.settings.volumeLeveler || false,
    theater: false,
    rotated: false,
    fitMode: 'fit',
    error: '',
  });

  const [showNewFileForm, setShowNewFileForm] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);
  const [toast, setToast] = React.useState('');
  const [locked, setLocked] = React.useState<boolean>(() =>
    Boolean(initial.settings.pinHash && initial.settings.pinSalt)
  );

  const [terminalLogs, setTerminalLogs] = React.useState<TerminalEntry[]>([
    { id: 'x1', text: 'tmg workspace — type help', kind: 'muted' },
  ]);
  const [terminalCwdId, setTerminalCwdId] = React.useState<string | null>(null);
  const [terminalHistory, setTerminalHistory] = React.useState<string[]>([]);

  const toastTimerRef = React.useRef<number | null>(null);
  const chatReplyTimerRef = React.useRef<number | null>(null);
  const globalImportInputRef = React.useRef<HTMLInputElement | null>(null);
  const vaultItemsRef = React.useRef(vaultItems);
  vaultItemsRef.current = vaultItems;

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (chatReplyTimerRef.current) window.clearTimeout(chatReplyTimerRef.current);
    };
  }, []);

  const showToast = React.useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2400);
  }, []);

  // Theme resolution across all 9 themes + System
  React.useEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute(
        'data-theme',
        resolveThemeAttribute(settings.appearance)
      );
    };
    apply();
    if (settings.appearance !== 'System' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [settings.appearance]);

  // Configure Studio audio engine & subscribe to playback state
  React.useEffect(() => {
    setEqBands(settings.eqBands);
    setVolumeLeveler(settings.volumeLeveler);
    setSpeed(settings.playbackSpeed);

    configureStudioEngine({
      resolveItem: async (id) => {
        const item = vaultItemsRef.current.find((v) => v.id === id);
        if (!item) return null;
        const blob = await getVaultBlob(item.id);
        if (!blob) return null;
        return { item, blob };
      },
      onPlayed: (id) => {
        setVaultItems((prev) =>
          prev.map((v) =>
            v.id === id ? { ...v, playCount: (v.playCount || 0) + 1 } : v
          )
        );
      },
      onProgress: (id, time, dur) => {
        setVaultItems((prev) =>
          prev.map((v) =>
            v.id === id
              ? {
                  ...v,
                  progress: time,
                  duration: dur && dur > 0 ? dur : v.duration,
                }
              : v
          )
        );
      },
    });

    const unsub = subscribeStudio(setPlayback);
    return () => unsub();
  }, []);

  // Auto-lock timer
  React.useEffect(() => {
    if (locked || !settings.pinHash || !settings.autoLockMinutes) return;
    let timer = 0;
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => setLocked(true),
        settings.autoLockMinutes * 60_000
      );
    };
    resetTimer();
    const events = ['pointerdown', 'keydown', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [locked, settings.pinHash, settings.autoLockMinutes]);

  React.useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [section]);

  // Persist v2 snapshot
  React.useEffect(() => {
    try {
      const snapshot: WorkspaceSnapshot = {
        files,
        projects,
        artifacts,
        trash,
        threads,
        messages,
        bookmarks,
        browserTabs,
        vaultItems,
        collections,
        settings,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    files,
    projects,
    artifacts,
    trash,
    threads,
    messages,
    bookmarks,
    browserTabs,
    vaultItems,
    collections,
    settings,
  ]);

  // Global keyboard shortcuts (Cmd/Ctrl+K, Escape)
  React.useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setQuickCreateOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const copyToClipboard = (text: string, message = 'Copied') => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(message))
        .catch(() => fallbackCopy(text, message));
    } else {
      fallbackCopy(text, message);
    }
  };

  const fallbackCopy = (text: string, message: string) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
    } catch {
      // Ignore copy failure
    }
    document.body.removeChild(el);
    showToast(message);
  };

  const downloadText = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    showToast(`Downloaded ${filename}`);
  };

  const openFileInEditor = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (target && target.kind === 'folder') return;
    setActiveFileId(id);
    setSection('editor');
  };

  const openFolderInFiles = (id: string) => {
    setCurrentFolderId(id);
    setSection('files');
  };

  const openVaultItem = (item: VaultItem) => {
    if (item.kind === 'audio' || item.kind === 'video') {
      const queue = vaultItems
        .filter((v) => v.kind === 'audio' || v.kind === 'video')
        .map((v) => v.id);
      setSection('studio');
      void playVaultItem(item.id, queue);
    } else if (item.kind === 'photo') {
      setActivePhotoId(item.id);
    } else if (item.kind === 'bundle') {
      setActiveBundleId(item.id);
    }
  };

  const openBundleInBrowserTab = (bundle: VaultItem) => {
    setActiveBundleId(null);
    const existing = browserTabs.find((t) => t.bundleId === bundle.id);
    if (existing) {
      setActiveBrowserTabId(existing.id);
      setSection('browser');
      return;
    }
    const created: BrowserTabItem = {
      id: createId(),
      title: bundle.title || bundle.name,
      url: `bundle://${bundle.name}`,
      bundleId: bundle.id,
    };
    setBrowserTabs((prev) => [...prev, created]);
    setActiveBrowserTabId(created.id);
    setSection('browser');
  };

  const createFile = (
    name: string,
    content: string,
    parentId: string | null
  ): WorkspaceFile | null => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const created: WorkspaceFile = {
      id: createId(),
      name: trimmed,
      kind: 'file',
      ext: getFileExtension(trimmed),
      content,
      date: 'Today',
      parentId,
      updatedAt: Date.now(),
    };
    setFiles((prev) => [created, ...prev]);
    return created;
  };

  const createFolder = (name: string, parentId: string | null) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const folder: WorkspaceFile = {
      id: createId(),
      name: trimmed,
      kind: 'folder',
      ext: 'folder',
      content: '',
      date: 'Today',
      parentId,
      updatedAt: Date.now(),
    };
    setFiles((prev) => [folder, ...prev]);
    showToast(`Folder "${trimmed}" created`);
  };

  const trashFile = (entry: WorkspaceFile) => {
    setFiles((prev) => prev.filter((item) => item.id !== entry.id));
    if (activeFileId === entry.id) {
      setActiveFileId(null);
    }
    if (currentFolderId === entry.id) {
      setCurrentFolderId(entry.parentId ?? null);
    }
    setTrash((prev) => [
      {
        id: createId(),
        name: entry.name,
        kind: entry.kind === 'folder' ? 'Folder' : 'File',
        date: 'Today',
        origin: 'files',
        payload: entry,
      },
      ...prev,
    ]);
    showToast(`Moved ${entry.name} to Trash`);
  };

  const trashVaultItem = (item: VaultItem) => {
    if (playback.activeId === item.id) {
      stopPlayback();
    }
    setVaultItems((prev) => prev.filter((v) => v.id !== item.id));
    setTrash((prev) => [
      {
        id: createId(),
        name: item.title || item.name,
        kind:
          item.kind === 'audio'
            ? 'Audio'
            : item.kind === 'video'
            ? 'Video'
            : item.kind === 'photo'
            ? 'Photo'
            : 'Bundle',
        date: 'Today',
        origin: 'vault',
        payload: item,
      },
      ...prev,
    ]);
    showToast(`Moved ${item.title || item.name} to Trash`);
  };

  const duplicateFile = (id: string) => {
    const source = files.find((f) => f.id === id);
    if (!source) return;
    const copyName = source.name.replace(/(\.[^.]+)?$/, ' copy$1');
    const duplicated: WorkspaceFile = {
      ...source,
      id: createId(),
      name: copyName,
      date: 'Today',
      updatedAt: Date.now(),
    };
    setFiles((prev) => [duplicated, ...prev]);
    showToast(`Duplicated as ${copyName}`);
  };

  const handleImportFiles = async (fileList: FileList) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    let importedCount = 0;
    const newVaultItems: VaultItem[] = [];

    for (const file of incoming) {
      const kind = classifyImportFile(file.name, file.type);
      if (kind === 'doc') {
        try {
          const text = await file.text();
          createFile(file.name, text, currentFolderId);
          importedCount++;
        } catch {
          showToast(`Could not read ${file.name}`);
        }
      } else if (kind === 'zip') {
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const entries = unpackZipArchive(bytes);
          if (entries.length === 0) continue;
          const bundleId = createId();
          let totalBytes = 0;
          const bundlePaths: string[] = [];
          for (const entry of entries) {
            const copy = new Uint8Array(entry.data.byteLength);
            copy.set(entry.data);
            const blob = new Blob([copy], { type: entry.mime });
            totalBytes += blob.size;
            bundlePaths.push(entry.path);
            await putVaultBlob(bundleBlobKey(bundleId, entry.path), blob);
          }
          const entryFile = detectBundleEntryHtml(bundlePaths);
          const title = file.name.replace(/\.zip$/i, '');
          newVaultItems.push({
            id: bundleId,
            kind: 'bundle',
            name: file.name,
            title,
            ext: 'zip',
            mime: 'application/zip',
            size: totalBytes,
            entryFile,
            bundlePaths,
            playCount: 0,
            progress: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          importedCount++;
        } catch {
          showToast(`Could not unpack ${file.name}`);
        }
      } else if (kind === 'audio' || kind === 'video' || kind === 'photo') {
        try {
          const id = createId();
          const mime = inferMimeFromName(file.name, file.type);
          const blob = new Blob([await file.arrayBuffer()], { type: mime });
          await putVaultBlob(id, blob);

          let thumb = '';
          let duration = 0;
          if (kind === 'photo') {
            thumb = await extractPhotoThumb(blob);
          } else if (kind === 'video') {
            thumb = await extractVideoThumb(blob);
            duration = await probeMediaDuration(blob, 'video');
          } else if (kind === 'audio') {
            duration = await probeMediaDuration(blob, 'audio');
          }

          const ext = getFileExtension(file.name);
          const title = file.name.replace(/\.[^.]+$/, '');
          newVaultItems.push({
            id,
            kind,
            name: file.name,
            title,
            ext,
            mime,
            size: blob.size,
            duration,
            thumb,
            playCount: 0,
            progress: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          importedCount++;
        } catch {
          showToast(`Could not import ${file.name}`);
        }
      }
    }

    if (newVaultItems.length > 0) {
      setVaultItems((prev) => [...newVaultItems, ...prev]);
    }
    if (importedCount > 0) {
      showToast(
        `Imported ${importedCount} ${importedCount === 1 ? 'item' : 'items'}`
      );
    }
  };

  const handleImportFolder = async (fileList: FileList) => {
    try {
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;

      const rawPaths: string[] = [];
      const byRawPath = new Map<string, File>();
      for (const f of incoming) {
        const rel =
          (f as File & { webkitRelativePath?: string }).webkitRelativePath ||
          f.name;
        const clean = sanitizeRelativePath(rel);
        if (!clean) continue;
        rawPaths.push(clean);
        byRawPath.set(clean, f);
      }

      if (rawPaths.length === 0) return;
      const stripped = stripCommonTopFolder(rawPaths);
      const folderLabel =
        rawPaths[0]?.split('/')[0] ||
        `Web Bundle ${new Date().toLocaleTimeString()}`;
      const bundleId = createId();
      const bundlePaths: string[] = [];
      let totalBytes = 0;

      for (const [rawPath, file] of byRawPath.entries()) {
        const finalPath = stripped.get(rawPath) || rawPath;
        if (!finalPath) continue;
        const mime = inferMimeFromName(finalPath, file.type);
        const blob = new Blob([await file.arrayBuffer()], { type: mime });
        totalBytes += blob.size;
        bundlePaths.push(finalPath);
        await putVaultBlob(bundleBlobKey(bundleId, finalPath), blob);
      }

      const entryFile = detectBundleEntryHtml(bundlePaths);
      const bundleItem: VaultItem = {
        id: bundleId,
        kind: 'bundle',
        name: `${folderLabel}.bundle`,
        title: folderLabel,
        ext: 'dir',
        mime: 'application/x-web-bundle',
        size: totalBytes,
        entryFile,
        bundlePaths,
        playCount: 0,
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setVaultItems((prev) => [bundleItem, ...prev]);
      setSection('files');
      showToast(
        `Imported folder bundle "${folderLabel}" (${bundlePaths.length} files)`
      );
    } catch {
      showToast('Could not import folder bundle');
    }
  };

  const handleLoadSampleMedia = async () => {
    try {
      const audioId = createId();
      const audioBlob = createWarmChordWavBlob(5);
      await putVaultBlob(audioId, audioBlob);
      const audioItem: VaultItem = {
        id: audioId,
        kind: 'audio',
        name: 'warm-studio-chord.wav',
        title: 'Warm Studio Chord',
        artist: 'tmg Synth',
        ext: 'wav',
        mime: 'audio/wav',
        size: audioBlob.size,
        duration: 5,
        collectionId: 'col-studio',
        favorite: true,
        playCount: 0,
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const photoId = createId();
      const photoBlob = createSamplePosterSvgBlob();
      await putVaultBlob(photoId, photoBlob);
      const photoThumb = await extractPhotoThumb(photoBlob);
      const photoItem: VaultItem = {
        id: photoId,
        kind: 'photo',
        name: 'studio-study-01.svg',
        title: 'Studio Study 01',
        ext: 'svg',
        mime: 'image/svg+xml',
        size: photoBlob.size,
        thumb: photoThumb,
        collectionId: 'col-refs',
        playCount: 0,
        progress: 0,
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
      };

      setVaultItems((prev) => [audioItem, photoItem, ...prev]);
      showToast('Loaded Studio sample track & poster');
    } catch {
      showToast('Could not load sample media');
    }
  };

  const handleExecuteTerminal = (rawCommand: string) => {
    const trimmed = rawCommand.trim();
    if (!trimmed) return;

    const result = executeTerminalCommand(trimmed, {
      files,
      vaultItems,
      cwdId: terminalCwdId,
      history: terminalHistory,
    });

    setTerminalHistory((prev) => [...prev, trimmed]);

    if (result.effects?.some((eff) => eff.type === 'clear')) {
      setTerminalLogs([]);
      return;
    }

    const newEntries: TerminalEntry[] = [
      { id: createId(), text: `tmg ~ $ ${trimmed}`, kind: 'cmd' },
      ...result.outputs.map((out) => ({
        id: createId(),
        text: out.text,
        kind: out.kind,
      })),
    ];

    setTerminalLogs((prev) => [...prev, ...newEntries]);

    for (const effect of result.effects ?? []) {
      switch (effect.type) {
        case 'cd':
          setTerminalCwdId(effect.folderId);
          break;
        case 'createFile':
          createFile(effect.name, effect.content, effect.parentId);
          break;
        case 'updateFile':
          setFiles((prev) =>
            prev.map((item) =>
              item.id === effect.id
                ? {
                    ...item,
                    content: effect.content,
                    date: 'Today',
                    updatedAt: Date.now(),
                  }
                : item
            )
          );
          break;
        case 'createFolder':
          createFolder(effect.name, effect.parentId);
          break;
        case 'trashFile': {
          const target = files.find((item) => item.id === effect.id);
          if (target) trashFile(target);
          break;
        }
        case 'duplicateFile':
          duplicateFile(effect.id);
          break;
        case 'renameFile':
          setFiles((prev) =>
            prev.map((item) =>
              item.id === effect.id
                ? {
                    ...item,
                    name: effect.newName,
                    ext:
                      item.kind === 'folder'
                        ? 'folder'
                        : getFileExtension(effect.newName),
                    updatedAt: Date.now(),
                  }
                : item
            )
          );
          break;
        case 'openFile':
          openFileInEditor(effect.id);
          break;
        case 'openVault': {
          const target = vaultItems.find((v) => v.id === effect.id);
          if (target) openVaultItem(target);
          break;
        }
      }
    }
  };

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t))
    );
  };

  const handleCreateThread = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const created: ChatThread = {
      id: createId(),
      name: clean,
      avatar: clean[0].toUpperCase(),
      role: 'Custom thread',
      unread: 0,
    };
    setThreads((prev) => [...prev, created]);
    setActiveThreadId(created.id);
    setSection('chat');
    showToast(`Started thread "${clean}"`);
  };

  const handleSendMessage = (text: string) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const thread =
      threads.find((t) => t.id === activeThreadId) || threads[0];
    const threadId = thread?.id || 'c1';

    const userMsg: ChatMessage = {
      id: createId(),
      threadId,
      role: 'user',
      text,
      time,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const activeFile = files.find((f) => f.id === activeFileId);
    if (chatReplyTimerRef.current) {
      window.clearTimeout(chatReplyTimerRef.current);
    }
    chatReplyTimerRef.current = window.setTimeout(() => {
      chatReplyTimerRef.current = null;
      const reply = generateChatReply(text, {
        threadId,
        threadName: thread?.name || 'Merchant',
        filesCount: files.length,
        vaultCount: vaultItems.length,
        projectsCount: projects.length,
        activeFileName: activeFile?.name,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          time,
          ...reply,
        },
      ]);
      setIsTyping(false);
    }, 500);
  };

  const handleSendVoice = (audioUrl: string, duration: number) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        threadId: activeThreadId,
        role: 'user',
        text: '',
        time,
        audioUrl,
        duration,
      },
    ]);
    showToast('Voice message added');
  };

  const handleSaveMessageAsFile = (msg: ChatMessage, codeOnly = false) => {
    const ext = codeOnly && msg.lang?.toLowerCase() === 'html' ? 'html' : 'md';
    const filename = `chat-${msg.id.slice(0, 4)}.${ext}`;
    const body = codeOnly
      ? msg.code || msg.text
      : msg.code
      ? `${msg.text}\n\n\`\`\`\n${msg.code}\n\`\`\`\n`
      : msg.text || 'Voice note';
    const created = createFile(filename, body, currentFolderId);
    if (created) {
      showToast(`Saved as ${created.name}`);
    }
  };

  const handleSaveMessageAsArtifact = (msg: ChatMessage) => {
    const title = `Chat — ${(msg.text || 'Code snippet').slice(0, 24)}`;
    const artifact: Artifact = {
      id: createId(),
      name: title,
      date: 'Today',
      updatedAt: Date.now(),
      content: msg.text || msg.code || 'Saved snippet',
      detail: msg.code || msg.text || 'Saved from chat thread.',
    };
    setArtifacts((prev) => [artifact, ...prev]);
    showToast('Saved as artifact');
  };

  const handleRestoreTrashItem = (item: TrashItem) => {
    if (item.origin === 'files') {
      const restored = item.payload as WorkspaceFile;
      const parentExists = restored.parentId
        ? files.some((f) => f.id === restored.parentId && f.kind === 'folder')
        : true;
      setFiles((prev) => [
        {
          ...restored,
          parentId: parentExists ? restored.parentId : null,
          updatedAt: Date.now(),
        },
        ...prev,
      ]);
    } else if (item.origin === 'artifacts') {
      const restored = item.payload as Artifact;
      setArtifacts((prev) => [
        { ...restored, updatedAt: Date.now() },
        ...prev,
      ]);
    } else if (item.origin === 'projects') {
      const restored = item.payload as Project;
      setProjects((prev) => [
        { ...restored, updatedAt: Date.now() },
        ...prev,
      ]);
    } else if (item.origin === 'vault') {
      const restored = item.payload as VaultItem;
      setVaultItems((prev) => [
        { ...restored, updatedAt: Date.now() },
        ...prev,
      ]);
    }
    setTrash((prev) => prev.filter((t) => t.id !== item.id));
    showToast(`Restored ${item.name}`);
  };

  const handleDeleteTrashPermanent = async (item: TrashItem) => {
    try {
      if (item.origin === 'vault') {
        const v = item.payload as VaultItem;
        if (v.kind === 'bundle' && v.bundlePaths) {
          await deleteBundleBlobs(v.id, v.bundlePaths);
        } else {
          await deleteVaultBlob(v.id);
        }
      }
    } catch {
      // Proceed removing metadata even if IndexedDB blob is already absent
    }
    setTrash((prev) => prev.filter((t) => t.id !== item.id));
    showToast('Deleted permanently');
  };

  const handleEmptyTrash = async () => {
    try {
      for (const item of trash) {
        if (item.origin === 'vault') {
          const v = item.payload as VaultItem;
          if (v.kind === 'bundle' && v.bundlePaths) {
            await deleteBundleBlobs(v.id, v.bundlePaths);
          } else {
            await deleteVaultBlob(v.id);
          }
        }
      }
    } catch {
      // Proceed clearing trash list
    }
    setTrash([]);
    showToast('Trash emptied');
  };

  const handleExportBackup = () => {
    const snapshot: WorkspaceSnapshot = {
      files,
      projects,
      artifacts,
      trash,
      threads,
      messages,
      bookmarks,
      browserTabs,
      vaultItems,
      collections,
      settings,
    };
    downloadText(
      `tmg-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(snapshot, null, 2)
    );
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed) ||
        !Array.isArray((parsed as Partial<WorkspaceSnapshot>).files) ||
        !Array.isArray((parsed as Partial<WorkspaceSnapshot>).projects)
      ) {
        throw new Error('Invalid backup format');
      }
      const seed = createInitialSnapshot();
      const clean = sanitizeWorkspaceSnapshot(parsed, seed);
      setFiles(clean.files);
      setProjects(clean.projects);
      setArtifacts(clean.artifacts);
      setTrash(clean.trash);
      setThreads(clean.threads);
      setActiveThreadId(clean.threads[0]?.id || 'c1');
      setMessages(clean.messages);
      setBookmarks(clean.bookmarks);
      setBrowserTabs(clean.browserTabs);
      setActiveBrowserTabId(clean.browserTabs[0]?.id || 'tab-1');
      setCollections(clean.collections);
      setSettings(clean.settings);
      showToast('Backup restored');
    } catch {
      showToast('Could not read backup JSON');
    }
  };

  const handleResetWorkspace = async () => {
    stopPlayback();
    try {
      await clearAllVaultBlobs();
    } catch {
      // Ignore IndexedDB reset failures
    }
    const fresh = createInitialSnapshot();
    setFiles(fresh.files);
    setProjects(fresh.projects);
    setArtifacts(fresh.artifacts);
    setTrash(fresh.trash);
    setThreads(fresh.threads);
    setActiveThreadId(fresh.threads[0]?.id || 'c1');
    setMessages(fresh.messages);
    setBookmarks(fresh.bookmarks);
    setBrowserTabs(fresh.browserTabs);
    setActiveBrowserTabId(fresh.browserTabs[0]?.id || 'tab-1');
    setVaultItems(fresh.vaultItems);
    setCollections(fresh.collections);
    setSettings(fresh.settings);
    setCurrentFolderId(null);
    setActiveFileId(fresh.files.find((f) => f.kind === 'file')?.id ?? null);
    setSelectedProjectId(null);
    setSelectedArtifactId(null);
    setLocked(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Ignore storage failures
    }
    showToast('Workspace reset to defaults');
  };

  const activeFile = files.find((f) => f.id === activeFileId);
  const activePlaybackItem =
    vaultItems.find((v) => v.id === playback.activeId) || null;
  const activeBundle =
    vaultItems.find((v) => v.id === activeBundleId && v.kind === 'bundle') ||
    null;
  const photos = React.useMemo(
    () => vaultItems.filter((v) => v.kind === 'photo'),
    [vaultItems]
  );
  const unreadChatCount = threads.reduce((acc, t) => acc + (t.unread || 0), 0);
  const showMiniPlayer =
    Boolean(activePlaybackItem && playback.activeId) && section !== 'studio';

  return (
    <div className="min-h-[100dvh] bg-[var(--page)] text-[var(--text)] overflow-x-clip">
      <input
        ref={globalImportInputRef}
        type="file"
        multiple
        className="hidden"
        aria-label="Global media and bundle import"
        onChange={(e) => {
          if (e.target.files?.length) {
            void handleImportFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />

      <div className="flex min-h-[100dvh]">
        <Sidebar
          section={section}
          onNavigate={(target) => {
            setSection(target);
            if (target !== 'projects') setSelectedProjectId(null);
            if (target !== 'artifacts') setSelectedArtifactId(null);
            if (target === 'chat') {
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === activeThreadId ? { ...t, unread: 0 } : t
                )
              );
            }
          }}
          trashCount={trash.length}
          unreadChatCount={unreadChatCount}
          isPlayingMedia={playback.playing}
          profileName={settings.profileName}
          profileEmail={settings.profileEmail}
          moreOpen={moreOpen}
          onMoreOpenChange={setMoreOpen}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <Header
            section={section}
            activeFileName={activeFile?.name}
            onOpenSearch={() => setSearchOpen(true)}
            onQuickCreate={() => setQuickCreateOpen(true)}
          />

          <main
            className={`flex-1 w-full max-w-[960px] mx-auto px-4 sm:px-8 ${
              settings.compact ? 'py-5' : 'py-7'
            } ${showMiniPlayer ? 'pb-36 md:pb-24' : 'pb-24 md:pb-10'}`}
          >
            {section === 'home' && (
              <HomeView
                files={files}
                vaultItems={vaultItems}
                projects={projects}
                artifacts={artifacts}
                playback={playback}
                activePlaybackItem={activePlaybackItem}
                onTogglePlayback={() => void togglePlay()}
                onOpenFile={openFileInEditor}
                onOpenFolder={openFolderInFiles}
                onOpenVaultItem={openVaultItem}
                onOpenProject={(id) => {
                  setSelectedProjectId(id);
                  setSection('projects');
                }}
                onOpenArtifact={(id) => {
                  setSelectedArtifactId(id);
                  setSection('artifacts');
                }}
                onNavigate={setSection}
                onOpenPreview={() => {
                  const previewTab = browserTabs.find((t) =>
                    t.url.includes('preview')
                  );
                  if (previewTab) {
                    setActiveBrowserTabId(previewTab.id);
                  } else {
                    const created: BrowserTabItem = {
                      id: createId(),
                      title: 'Live Preview',
                      url: 'tmg.app/preview',
                    };
                    setBrowserTabs((prev) => [...prev, created]);
                    setActiveBrowserTabId(created.id);
                  }
                  setSection('browser');
                }}
                onImportMedia={() => globalImportInputRef.current?.click()}
                onLoadSampleMedia={() => void handleLoadSampleMedia()}
              />
            )}

            {section === 'files' && (
              <FilesView
                files={files}
                vaultItems={vaultItems}
                collections={collections}
                currentFolderId={currentFolderId}
                onChangeFolder={setCurrentFolderId}
                onOpenFile={openFileInEditor}
                onCreateFile={createFile}
                onCreateFolder={createFolder}
                onRenameFile={(id, newName) => {
                  setFiles((prev) =>
                    prev.map((item) =>
                      item.id === id
                        ? {
                            ...item,
                            name: newName,
                            ext:
                              item.kind === 'folder'
                                ? 'folder'
                                : getFileExtension(newName),
                            updatedAt: Date.now(),
                          }
                        : item
                    )
                  );
                  showToast(`Renamed to ${newName}`);
                }}
                onDuplicateFile={duplicateFile}
                onTogglePinFile={(id) => {
                  setFiles((prev) =>
                    prev.map((item) =>
                      item.id === id ? { ...item, pinned: !item.pinned } : item
                    )
                  );
                }}
                onDownloadFile={(file) => downloadText(file.name, file.content)}
                onTrashFile={trashFile}
                onOpenVaultItem={openVaultItem}
                onUpdateVaultItem={(id, patch) => {
                  setVaultItems((prev) =>
                    prev.map((v) => (v.id === id ? { ...v, ...patch } : v))
                  );
                }}
                onQueuePlayNext={(id) => {
                  queuePlayNext(id);
                  showToast('Queued to play next');
                }}
                onTrashVaultItem={trashVaultItem}
                onBatchTrashVault={(ids) => {
                  const targets = vaultItems.filter((v) => ids.includes(v.id));
                  targets.forEach(trashVaultItem);
                }}
                onBatchFavoriteVault={(ids) => {
                  setVaultItems((prev) =>
                    prev.map((v) =>
                      ids.includes(v.id) ? { ...v, favorite: true } : v
                    )
                  );
                  showToast(`Favorited ${ids.length} items`);
                }}
                onBatchAssignCollection={(ids, collectionId) => {
                  setVaultItems((prev) =>
                    prev.map((v) =>
                      ids.includes(v.id) ? { ...v, collectionId } : v
                    )
                  );
                  showToast('Updated collection');
                }}
                onCreateCollection={(name) => {
                  const col: VaultCollection = {
                    id: createId(),
                    name,
                    color: '#D97757',
                    glyph: '✦',
                    scope: 'all',
                  };
                  setCollections((prev) => [...prev, col]);
                  showToast(`Collection "${name}" created`);
                }}
                onImportFiles={(list) => void handleImportFiles(list)}
                onImportFolder={(list) => void handleImportFolder(list)}
                onLoadSampleMedia={() => void handleLoadSampleMedia()}
                showNewFileForm={showNewFileForm}
                onShowNewFileFormChange={setShowNewFileForm}
                onToast={showToast}
              />
            )}

            {section === 'editor' && (
              <EditorView
                files={files}
                activeFileId={activeFileId}
                lineNumbers={settings.lineNumbers}
                onSelectFile={setActiveFileId}
                onBackToFiles={() => setSection('files')}
                onSaveFile={(id, content) => {
                  setFiles((prev) =>
                    prev.map((item) => {
                      if (item.id !== id) return item;
                      const prevVersions = item.versions || [];
                      const nextVersions =
                        item.content !== content
                          ? [
                              {
                                id: createId(),
                                content: item.content,
                                savedAt: Date.now(),
                              },
                              ...prevVersions,
                            ].slice(0, 5)
                          : prevVersions;
                      return {
                        ...item,
                        content,
                        date: 'Today',
                        updatedAt: Date.now(),
                        versions: nextVersions,
                      };
                    })
                  );
                  showToast('Saved');
                }}
                onCreateFile={createFile}
                onTogglePinFile={(id) => {
                  setFiles((prev) =>
                    prev.map((item) =>
                      item.id === id ? { ...item, pinned: !item.pinned } : item
                    )
                  );
                }}
                onCopy={copyToClipboard}
                onDownload={(file) => downloadText(file.name, file.content)}
                onToast={showToast}
              />
            )}

            {section === 'studio' && (
              <StudioView
                playback={playback}
                vaultItems={vaultItems}
                settings={settings}
                onUpdateSettings={setSettings}
                onUpdateItem={(id, patch) => {
                  setVaultItems((prev) =>
                    prev.map((v) => (v.id === id ? { ...v, ...patch } : v))
                  );
                }}
                onSaveQueueAsCollection={(name, ids) => {
                  const colId = createId();
                  const col: VaultCollection = {
                    id: colId,
                    name,
                    color: '#D97757',
                    glyph: '♪',
                    scope: 'audio',
                  };
                  setCollections((prev) => [...prev, col]);
                  setVaultItems((prev) =>
                    prev.map((v) =>
                      ids.includes(v.id) ? { ...v, collectionId: colId } : v
                    )
                  );
                  showToast(`Saved collection "${name}"`);
                }}
                onImportMedia={() => globalImportInputRef.current?.click()}
                onLoadSampleMedia={() => void handleLoadSampleMedia()}
                onToast={showToast}
              />
            )}

            {section === 'terminal' && (
              <TerminalView
                logs={terminalLogs}
                files={files}
                vaultItems={vaultItems}
                cwdId={terminalCwdId}
                history={terminalHistory}
                onExecute={handleExecuteTerminal}
                onClear={() => setTerminalLogs([])}
              />
            )}

            {section === 'chat' && (
              <ChatView
                threads={threads}
                activeThreadId={activeThreadId}
                messages={messages}
                autoScroll={settings.autoScroll}
                autoTranscribe={settings.autoTranscribe}
                hasMiniPlayer={showMiniPlayer}
                onSelectThread={handleSelectThread}
                onCreateThread={handleCreateThread}
                onSendMessage={handleSendMessage}
                onSendVoice={handleSendVoice}
                onClearThread={() => {
                  setMessages((prev) =>
                    prev.filter((m) => m.threadId !== activeThreadId)
                  );
                  showToast('Cleared current thread');
                }}
                onDeleteMessage={(id) =>
                  setMessages((prev) => prev.filter((m) => m.id !== id))
                }
                onSaveAsFile={handleSaveMessageAsFile}
                onSaveAsArtifact={handleSaveMessageAsArtifact}
                onCopy={copyToClipboard}
                onOpenSearch={() => setSearchOpen(true)}
                onToast={showToast}
                isTyping={isTyping}
              />
            )}

            {section === 'browser' && (
              <BrowserView
                files={files}
                vaultItems={vaultItems}
                projects={projects}
                bookmarks={bookmarks}
                tabs={browserTabs}
                activeTabId={activeBrowserTabId}
                onSelectTab={setActiveBrowserTabId}
                onNewTab={() => {
                  const created: BrowserTabItem = {
                    id: createId(),
                    title: 'Docs',
                    url: 'tmg.app/docs',
                  };
                  setBrowserTabs((prev) => [...prev, created]);
                  setActiveBrowserTabId(created.id);
                }}
                onCloseTab={(id) => {
                  setBrowserTabs((prev) => {
                    if (prev.length <= 1) return prev;
                    const next = prev.filter((t) => t.id !== id);
                    if (activeBrowserTabId === id && next[0]) {
                      setActiveBrowserTabId(next[0].id);
                    }
                    return next;
                  });
                }}
                onUpdateTab={(id, patch) => {
                  setBrowserTabs((prev) =>
                    prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
                  );
                }}
                onToggleBookmark={(title, url) => {
                  const exists = bookmarks.some((b) => b.url === url);
                  if (exists) {
                    setBookmarks((prev) => prev.filter((b) => b.url !== url));
                    showToast('Bookmark removed');
                  } else {
                    setBookmarks((prev) => [
                      ...prev,
                      { id: createId(), title, url },
                    ]);
                    showToast('Bookmarked');
                  }
                }}
                onOpenProject={(id) => {
                  setSelectedProjectId(id);
                  setSection('projects');
                }}
                onCopy={copyToClipboard}
                onToast={showToast}
              />
            )}

            {section === 'projects' && (
              <ProjectsView
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
                onCreateProject={({ name, location, date }) => {
                  const created: Project = {
                    id: createId(),
                    name,
                    location,
                    date: date || 'This week',
                    members: [
                      (settings.profileName.trim()[0] || 'M').toUpperCase(),
                    ],
                    accent: '#D94E32',
                    updatedAt: Date.now(),
                    tasks: [{ id: createId(), text: 'First milestone', done: false }],
                  };
                  setProjects((prev) => [created, ...prev]);
                  showToast(`Project "${name}" created`);
                }}
                onDeleteProject={(project) => {
                  setProjects((prev) => prev.filter((p) => p.id !== project.id));
                  setSelectedProjectId(null);
                  setTrash((prev) => [
                    {
                      id: createId(),
                      name: project.name,
                      kind: 'Project',
                      date: 'Today',
                      origin: 'projects',
                      payload: project,
                    },
                    ...prev,
                  ]);
                  showToast(`Moved ${project.name} to Trash`);
                }}
                onToggleTask={(projectId, taskId) => {
                  setProjects((prev) =>
                    prev.map((p) =>
                      p.id === projectId
                        ? {
                            ...p,
                            updatedAt: Date.now(),
                            tasks: p.tasks.map((t) =>
                              t.id === taskId ? { ...t, done: !t.done } : t
                            ),
                          }
                        : p
                    )
                  );
                }}
                onAddTask={(projectId, text) => {
                  setProjects((prev) =>
                    prev.map((p) =>
                      p.id === projectId
                        ? {
                            ...p,
                            updatedAt: Date.now(),
                            tasks: [
                              ...p.tasks,
                              { id: createId(), text, done: false },
                            ],
                          }
                        : p
                    )
                  );
                  showToast('Task added');
                }}
                onDeleteTask={(projectId, taskId) => {
                  setProjects((prev) =>
                    prev.map((p) =>
                      p.id === projectId
                        ? {
                            ...p,
                            updatedAt: Date.now(),
                            tasks: p.tasks.filter((t) => t.id !== taskId),
                          }
                        : p
                    )
                  );
                }}
                onOpenPreview={() => {
                  const previewTab = browserTabs.find((t) =>
                    t.url.includes('preview')
                  );
                  if (previewTab) setActiveBrowserTabId(previewTab.id);
                  setSection('browser');
                }}
              />
            )}

            {section === 'artifacts' && (
              <ArtifactsView
                artifacts={artifacts}
                selectedArtifactId={selectedArtifactId}
                onSelectArtifact={setSelectedArtifactId}
                onCreateArtifact={(name, content, detail) => {
                  const created: Artifact = {
                    id: createId(),
                    name,
                    content,
                    detail,
                    date: 'Today',
                    updatedAt: Date.now(),
                  };
                  setArtifacts((prev) => [created, ...prev]);
                  showToast('Artifact created');
                }}
                onUpdateArtifact={(id, name, content, detail) => {
                  setArtifacts((prev) =>
                    prev.map((a) =>
                      a.id === id
                        ? {
                            ...a,
                            name,
                            content,
                            detail,
                            date: 'Today',
                            updatedAt: Date.now(),
                          }
                        : a
                    )
                  );
                  showToast('Artifact updated');
                }}
                onTrashArtifact={(artifact) => {
                  setArtifacts((prev) =>
                    prev.filter((a) => a.id !== artifact.id)
                  );
                  setSelectedArtifactId(null);
                  setTrash((prev) => [
                    {
                      id: createId(),
                      name: artifact.name,
                      kind: 'Artifact',
                      date: 'Today',
                      origin: 'artifacts',
                      payload: artifact,
                    },
                    ...prev,
                  ]);
                  showToast(`Moved ${artifact.name} to Trash`);
                }}
                onDownloadArtifact={(artifact) =>
                  downloadText(
                    `${artifact.name}.txt`,
                    `${artifact.content}\n\n${artifact.detail}`
                  )
                }
                onCopy={copyToClipboard}
              />
            )}

            {section === 'trash' && (
              <TrashView
                items={trash}
                onRestore={handleRestoreTrashItem}
                onDeletePermanent={(item) => void handleDeleteTrashPermanent(item)}
                onEmptyTrash={() => void handleEmptyTrash()}
              />
            )}

            {section === 'settings' && (
              <SettingsView
                settings={settings}
                vaultItems={vaultItems}
                onUpdateSettings={setSettings}
                onExportBackup={handleExportBackup}
                onImportBackup={(f) => void handleImportBackup(f)}
                onLockNow={() => setLocked(true)}
                onResetWorkspace={() => void handleResetWorkspace()}
                onToast={showToast}
              />
            )}
          </main>
        </div>
      </div>

      {showMiniPlayer && (
        <MiniPlayer
          playback={playback}
          item={activePlaybackItem}
          onOpenStudio={() => setSection('studio')}
          onTogglePlay={() => void togglePlay()}
          onNext={() => void nextTrack(false)}
          onStop={stopPlayback}
        />
      )}

      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        files={files}
        projects={projects}
        artifacts={artifacts}
        vaultItems={vaultItems}
        threads={threads}
        onOpenFile={openFileInEditor}
        onOpenFolder={openFolderInFiles}
        onOpenProject={(id) => {
          setSelectedProjectId(id);
          setSection('projects');
        }}
        onOpenArtifact={(id) => {
          setSelectedArtifactId(id);
          setSection('artifacts');
        }}
        onOpenVaultItem={openVaultItem}
        onOpenThread={(id) => {
          handleSelectThread(id);
          setSection('chat');
        }}
        onNavigate={setSection}
      />

      <QuickCreateModal
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onNewFile={() => {
          setSection('files');
          setShowNewFileForm(true);
        }}
        onNewFolder={() => {
          createFolder(`Folder ${files.filter((f) => f.kind === 'folder').length + 1}`, currentFolderId);
          setSection('files');
        }}
        onNewProject={() => setSection('projects')}
        onNewChat={() => handleCreateThread(`Thread ${threads.length + 1}`)}
        onNewArtifact={() => setSection('artifacts')}
        onImportMedia={() => globalImportInputRef.current?.click()}
        onLoadSampleMedia={() => void handleLoadSampleMedia()}
      />

      <PhotoViewerModal
        photos={photos}
        activePhotoId={activePhotoId}
        onSelectPhoto={setActivePhotoId}
        onToggleFavorite={(id) => {
          setVaultItems((prev) =>
            prev.map((v) => (v.id === id ? { ...v, favorite: !v.favorite } : v))
          );
        }}
        onToast={showToast}
      />

      <ProjectBundleModal
        bundle={activeBundle}
        onClose={() => setActiveBundleId(null)}
        onUpdateBundle={(id, patch) => {
          setVaultItems((prev) =>
            prev.map((v) => (v.id === id ? { ...v, ...patch } : v))
          );
        }}
        onOpenInBrowser={openBundleInBrowserTab}
        onToast={showToast}
      />

      {locked && settings.pinHash && settings.pinSalt && (
        <PinLockScreen
          pinHash={settings.pinHash}
          pinSalt={settings.pinSalt}
          onUnlock={() => setLocked(false)}
        />
      )}

      {toast && (
        <div
          role="status"
          className={`fixed left-1/2 -translate-x-1/2 ${
            showMiniPlayer ? 'bottom-[138px]' : 'bottom-[74px]'
          } md:bottom-auto md:top-2.5 z-[60] bg-[var(--dark-btn)] text-[var(--page)] px-4 py-2 rounded-full text-sm font-medium shadow-xl toast-in max-w-[92vw] text-center pointer-events-none`}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
