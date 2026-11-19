import type {
  Artifact,
  BookmarkItem,
  BrowserTabItem,
  ChatMessage,
  ChatThread,
  EqPresetId,
  Project,
  ProjectTask,
  ThemeId,
  TrashItem,
  VaultCollection,
  VaultItem,
  VaultKind,
  WorkspaceFile,
  WorkspaceSettings,
  WorkspaceSnapshot,
} from '../types/workspace';

export function createId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = String(Math.floor(safe / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export function formatFileSize(content: string): string {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  return `${kb >= 10 ? Math.round(kb) : kb.toFixed(1)} KB`;
}

export function getFileExtension(name: string): string {
  const trimmed = name.trim();
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return 'txt';
  }
  return trimmed.slice(lastDot + 1).toLowerCase();
}

export function calculateProjectProgress(tasks: ProjectTask[]): {
  done: number;
  total: number;
  percent: number;
} {
  const total = tasks.length;
  if (total === 0) {
    return { done: 0, total: 0, percent: 0 };
  }
  const done = tasks.filter((task) => task.done).length;
  return {
    done,
    total,
    percent: Math.round((done / total) * 100),
  };
}

export interface SearchHit {
  id: string;
  label: string;
  kind:
    | 'File'
    | 'Folder'
    | 'Project'
    | 'Artifact'
    | 'Audio'
    | 'Video'
    | 'Photo'
    | 'Bundle'
    | 'Thread';
  meta: string;
}

export function filterWorkspaceSearch(
  query: string,
  files: WorkspaceFile[],
  projects: Project[],
  artifacts: Artifact[],
  vaultItems: VaultItem[] = [],
  threads: ChatThread[] = []
): SearchHit[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const fileHits: SearchHit[] = files
    .filter(
      (item) =>
        item.name.toLowerCase().includes(normalized) ||
        item.content.toLowerCase().includes(normalized)
    )
    .map((item) => ({
      id: item.id,
      label: item.name,
      kind: item.kind === 'folder' ? 'Folder' : 'File',
      meta: item.date,
    }));

  const vaultHits: SearchHit[] = vaultItems
    .filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.name.toLowerCase().includes(normalized) ||
        (item.artist && item.artist.toLowerCase().includes(normalized)) ||
        (item.notes && item.notes.toLowerCase().includes(normalized))
    )
    .map((item) => ({
      id: item.id,
      label: item.title || item.name,
      kind:
        item.kind === 'audio'
          ? 'Audio'
          : item.kind === 'video'
          ? 'Video'
          : item.kind === 'photo'
          ? 'Photo'
          : 'Bundle',
      meta: item.ext.toUpperCase(),
    }));

  const projectHits: SearchHit[] = projects
    .filter(
      (project) =>
        project.name.toLowerCase().includes(normalized) ||
        (project.location && project.location.toLowerCase().includes(normalized)) ||
        project.tasks.some((task) => task.text.toLowerCase().includes(normalized))
    )
    .map((project) => {
      const progress = calculateProjectProgress(project.tasks);
      return {
        id: project.id,
        label: project.name,
        kind: 'Project',
        meta: `${progress.percent}%`,
      };
    });

  const artifactHits: SearchHit[] = artifacts
    .filter(
      (artifact) =>
        artifact.name.toLowerCase().includes(normalized) ||
        artifact.content.toLowerCase().includes(normalized)
    )
    .map((artifact) => ({
      id: artifact.id,
      label: artifact.name,
      kind: 'Artifact',
      meta: artifact.date,
    }));

  const threadHits: SearchHit[] = threads
    .filter(
      (thread) =>
        thread.name.toLowerCase().includes(normalized) ||
        thread.role.toLowerCase().includes(normalized)
    )
    .map((thread) => ({
      id: thread.id,
      label: thread.name,
      kind: 'Thread',
      meta: thread.role,
    }));

  return [...fileHits, ...vaultHits, ...projectHits, ...artifactHits, ...threadHits];
}

export type VaultSortBy = 'recent' | 'name' | 'size' | 'plays';

export function sortAndFilterVaultItems(
  items: VaultItem[],
  opts: {
    scope: 'all' | 'audio' | 'video' | 'photo' | 'bundle';
    query: string;
    favoritesOnly?: boolean;
    collectionId?: string | null;
    sortBy: VaultSortBy;
  }
): VaultItem[] {
  const q = opts.query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (opts.scope !== 'all' && item.kind !== opts.scope) return false;
    if (opts.favoritesOnly && !item.favorite) return false;
    if (opts.collectionId && item.collectionId !== opts.collectionId) return false;
    if (
      q &&
      !item.title.toLowerCase().includes(q) &&
      !item.name.toLowerCase().includes(q) &&
      !(item.artist && item.artist.toLowerCase().includes(q))
    ) {
      return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }
    switch (opts.sortBy) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'size':
        return b.size - a.size;
      case 'plays':
        return b.playCount - a.playCount;
      case 'recent':
      default:
        return b.updatedAt - a.updatedAt;
    }
  });
}

export interface CodeToken {
  text: string;
  tone: 'attr' | 'tag' | 'str' | 'kw' | 'plain';
}

export function tokenizeCode(code: string): CodeToken[] {
  const parts = code
    .split(
      /(<\/?[a-zA-Z][^>]*>|"[^"]*"|'[^']*'|\b(?:const|function|return|let|var|if|else|new|import|from|export|default|document|console|await|async)\b|[a-zA-Z-]+="[^"]*")/g
    )
    .filter(Boolean);

  return parts.map((text) => {
    if (/^[a-zA-Z-]+="[^"]*"$/.test(text)) {
      return { text, tone: 'attr' };
    }
    if (/^<\/?[a-zA-Z]/.test(text)) {
      return { text, tone: 'tag' };
    }
    if (/^["']/.test(text)) {
      return { text, tone: 'str' };
    }
    if (
      /^(const|function|return|let|var|if|else|new|import|from|export|default|document|console|await|async)$/.test(
        text
      )
    ) {
      return { text, tone: 'kw' };
    }
    return { text, tone: 'plain' };
  });
}

export function buildPreviewDocument(files: WorkspaceFile[]): string {
  const htmlFile = files.find(
    (item) => item.kind === 'file' && item.name.toLowerCase() === 'index.html'
  );
  const cssFile = files.find(
    (item) => item.kind === 'file' && item.name.toLowerCase() === 'styles.css'
  );
  const jsFile = files.find(
    (item) => item.kind === 'file' && item.name.toLowerCase() === 'app.js'
  );

  if (!htmlFile) {
    return `<!doctype html>
<html lang="en">
  <body style="font-family: system-ui, sans-serif; padding: 32px; color: #161614; background: #F2F1ED;">
    <h1 style="margin: 0 0 8px;">No index.html found</h1>
    <p style="color: #5F5C54; margin: 0;">Create an index.html file in Files to preview it here.</p>
  </body>
</html>`;
  }

  let doc = htmlFile.content;
  const storageShim = `<script>
(function(){
  try {
    void window.localStorage;
  } catch (e) {
    var mem = {};
    var stub = {
      getItem: function(k){ return Object.prototype.hasOwnProperty.call(mem, String(k)) ? mem[String(k)] : null; },
      setItem: function(k, v){ mem[String(k)] = String(v); },
      removeItem: function(k){ delete mem[String(k)]; },
      clear: function(){ mem = {}; },
      key: function(i){ return Object.keys(mem)[i] || null; },
      get length(){ return Object.keys(mem).length; }
    };
    try { Object.defineProperty(window, 'localStorage', { value: stub, configurable: true }); } catch (_){}
    try { Object.defineProperty(window, 'sessionStorage', { value: stub, configurable: true }); } catch (_){}
  }
  try {
    void document.cookie;
  } catch (e) {
    var cookieMem = '';
    try {
      Object.defineProperty(document, 'cookie', {
        get: function(){ return cookieMem; },
        set: function(v){ cookieMem = String(v); },
        configurable: true
      });
    } catch (_){}
  }
  if (window.history) {
    var origPush = window.history.pushState;
    var origReplace = window.history.replaceState;
    if (origPush) {
      window.history.pushState = function(){
        try { return origPush.apply(this, arguments); } catch (_){}
      };
    }
    if (origReplace) {
      window.history.replaceState = function(){
        try { return origReplace.apply(this, arguments); } catch (_){}
      };
    }
  }
})();
</script>`;
  if (/<head[^>]*>/i.test(doc)) {
    doc = doc.replace(/<head[^>]*>/i, (m) => `${m}\n${storageShim}`);
  } else {
    doc = `${storageShim}\n${doc}`;
  }

  if (cssFile) {
    const styleTag = `<style>\n${cssFile.content}\n</style>`;
    if (/<link[^>]*href=["']styles\.css["'][^>]*>/i.test(doc)) {
      doc = doc.replace(/<link[^>]*href=["']styles\.css["'][^>]*>/i, styleTag);
    } else if (doc.includes('</head>')) {
      doc = doc.replace('</head>', `${styleTag}\n</head>`);
    }
  }

  if (jsFile) {
    const safeJs = jsFile.content.replace(/<\/script/gi, '<\\/script');
    const scriptTag = `<script>\n${safeJs}\n</script>`;
    if (/<script[^>]*src=["']app\.js["'][^>]*><\/script>/i.test(doc)) {
      doc = doc.replace(
        /<script[^>]*src=["']app\.js["'][^>]*><\/script>/i,
        scriptTag
      );
    } else if (doc.includes('</body>')) {
      doc = doc.replace('</body>', `${scriptTag}\n</body>`);
    }
  }

  return doc;
}

export interface TerminalExecContext {
  files: WorkspaceFile[];
  vaultItems?: VaultItem[];
  cwdId: string | null;
  history: string[];
}

export type TerminalEffect =
  | { type: 'clear' }
  | { type: 'cd'; folderId: string | null }
  | { type: 'createFile'; name: string; content: string; parentId: string | null }
  | { type: 'updateFile'; id: string; content: string }
  | { type: 'createFolder'; name: string; parentId: string | null }
  | { type: 'trashFile'; id: string }
  | { type: 'duplicateFile'; id: string }
  | { type: 'renameFile'; id: string; newName: string }
  | { type: 'openFile'; id: string }
  | { type: 'openVault'; id: string };

export interface TerminalExecResult {
  outputs: Array<{ text: string; kind: 'normal' | 'muted' | 'error' }>;
  effects?: TerminalEffect[];
}

function getFolderPath(files: WorkspaceFile[], folderId: string | null): string {
  if (!folderId) {
    return '~/workspace';
  }
  const chain: string[] = [];
  const visited = new Set<string>();
  let cursor = files.find((item) => item.id === folderId && item.kind === 'folder');
  while (cursor && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    chain.unshift(cursor.name);
    cursor = cursor.parentId
      ? files.find((item) => item.id === cursor?.parentId && item.kind === 'folder')
      : undefined;
  }
  return chain.length ? `~/workspace/${chain.join('/')}` : '~/workspace';
}

export function executeTerminalCommand(
  rawInput: string,
  context: TerminalExecContext
): TerminalExecResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { outputs: [] };
  }

  const { files, vaultItems = [], cwdId, history } = context;
  const cwdEntries = files.filter((item) => (item.parentId ?? null) === cwdId);

  const echoRedirectMatch = trimmed.match(/^echo\s+(.+?)\s*>\s*(\S+)$/);
  if (echoRedirectMatch) {
    const rawContent = echoRedirectMatch[1].trim().replace(/^["']|["']$/g, '');
    const targetName = echoRedirectMatch[2].trim();
    const existing = cwdEntries.find(
      (item) => item.name === targetName && item.kind === 'file'
    );
    if (existing) {
      return {
        outputs: [{ text: `Updated ${targetName}`, kind: 'muted' }],
        effects: [{ type: 'updateFile', id: existing.id, content: rawContent }],
      };
    }
    return {
      outputs: [{ text: `Created ${targetName}`, kind: 'muted' }],
      effects: [
        { type: 'createFile', name: targetName, content: rawContent, parentId: cwdId },
      ],
    };
  }

  const tokens = trimmed.split(/\s+/);
  const cmd = tokens[0];
  const arg1 = tokens[1];
  const arg2 = tokens[2];

  switch (cmd) {
    case 'clear':
      return { outputs: [], effects: [{ type: 'clear' }] };

    case 'help':
      return {
        outputs: [
          {
            text: 'help · ls · pwd · cd <dir> · cat <file> · open <file|media> · play <media> · echo <text> [> file] · mkdir <dir> · touch <file> · rm <name> · cp <src> · mv <src> <dst> · history · clear',
            kind: 'normal',
          },
        ],
      };

    case 'pwd':
      return { outputs: [{ text: getFolderPath(files, cwdId), kind: 'normal' }] };

    case 'ls': {
      const fileList = cwdEntries.map((item) =>
        item.kind === 'folder' ? `${item.name}/` : item.name
      );
      const vaultList =
        cwdId === null ? vaultItems.map((v) => `[${v.kind}] ${v.name}`) : [];
      const combined = [...fileList, ...vaultList];
      if (combined.length === 0) {
        return { outputs: [{ text: '(empty directory)', kind: 'muted' }] };
      }
      return { outputs: [{ text: combined.join('   '), kind: 'normal' }] };
    }

    case 'cd': {
      if (!arg1 || arg1 === '~' || arg1 === '/') {
        return { outputs: [], effects: [{ type: 'cd', folderId: null }] };
      }
      if (arg1 === '..') {
        const currentFolder = cwdId
          ? files.find((item) => item.id === cwdId && item.kind === 'folder')
          : undefined;
        return {
          outputs: [],
          effects: [{ type: 'cd', folderId: currentFolder?.parentId ?? null }],
        };
      }
      const targetFolder = cwdEntries.find(
        (item) => item.kind === 'folder' && item.name === arg1
      );
      if (!targetFolder) {
        return {
          outputs: [{ text: `cd: ${arg1}: No such directory`, kind: 'error' }],
        };
      }
      return { outputs: [], effects: [{ type: 'cd', folderId: targetFolder.id }] };
    }

    case 'history': {
      const lines = [...history, trimmed].map((entry, idx) => `${idx + 1}  ${entry}`);
      return { outputs: lines.map((line) => ({ text: line, kind: 'normal' })) };
    }

    case 'cat': {
      if (!arg1) {
        return { outputs: [{ text: 'cat: missing file operand', kind: 'error' }] };
      }
      const file = cwdEntries.find((item) => item.name === arg1);
      if (!file) {
        return {
          outputs: [{ text: `cat: ${arg1}: No such file or directory`, kind: 'error' }],
        };
      }
      if (file.kind === 'folder') {
        return { outputs: [{ text: `cat: ${arg1}: Is a directory`, kind: 'error' }] };
      }
      return { outputs: [{ text: file.content || '(empty file)', kind: 'normal' }] };
    }

    case 'open':
    case 'play': {
      if (!arg1) {
        return { outputs: [{ text: `${cmd}: missing target name`, kind: 'error' }] };
      }
      const query = tokens.slice(1).join(' ').toLowerCase();
      const file = cwdEntries.find((item) => item.name.toLowerCase() === query);
      if (file) {
        if (file.kind === 'folder') {
          return {
            outputs: [{ text: `Opened folder ${file.name}`, kind: 'muted' }],
            effects: [{ type: 'cd', folderId: file.id }],
          };
        }
        return {
          outputs: [{ text: `Opening ${file.name} in editor...`, kind: 'muted' }],
          effects: [{ type: 'openFile', id: file.id }],
        };
      }
      const vaultTarget = vaultItems.find(
        (v) =>
          v.name.toLowerCase() === query || v.title.toLowerCase() === query
      );
      if (vaultTarget) {
        return {
          outputs: [{ text: `Launching ${vaultTarget.title}...`, kind: 'muted' }],
          effects: [{ type: 'openVault', id: vaultTarget.id }],
        };
      }
      return {
        outputs: [{ text: `${cmd}: ${tokens.slice(1).join(' ')}: Not found`, kind: 'error' }],
      };
    }

    case 'echo': {
      const rest = trimmed.slice(4).trim().replace(/^["']|["']$/g, '');
      return { outputs: [{ text: rest, kind: 'normal' }] };
    }

    case 'mkdir': {
      const dirName = arg1 || 'New Folder';
      if (cwdEntries.some((item) => item.name === dirName)) {
        return {
          outputs: [{ text: `mkdir: ${dirName}: File exists`, kind: 'error' }],
        };
      }
      return {
        outputs: [{ text: `Created directory ${dirName}/`, kind: 'muted' }],
        effects: [{ type: 'createFolder', name: dirName, parentId: cwdId }],
      };
    }

    case 'touch': {
      if (!arg1) {
        return { outputs: [{ text: 'touch: missing file operand', kind: 'error' }] };
      }
      const exists = cwdEntries.find((item) => item.name === arg1);
      if (exists) {
        return { outputs: [] };
      }
      return {
        outputs: [{ text: `Created ${arg1}`, kind: 'muted' }],
        effects: [{ type: 'createFile', name: arg1, content: '', parentId: cwdId }],
      };
    }

    case 'rm': {
      if (!arg1) {
        return { outputs: [{ text: 'rm: missing operand', kind: 'error' }] };
      }
      const target = cwdEntries.find((item) => item.name === arg1);
      if (!target) {
        return {
          outputs: [{ text: `rm: ${arg1}: No such file or directory`, kind: 'error' }],
        };
      }
      return {
        outputs: [{ text: `Moved ${arg1} to Trash`, kind: 'muted' }],
        effects: [{ type: 'trashFile', id: target.id }],
      };
    }

    case 'cp': {
      if (!arg1) {
        return { outputs: [{ text: 'cp: missing file operand', kind: 'error' }] };
      }
      const target = cwdEntries.find((item) => item.name === arg1);
      if (!target) {
        return { outputs: [{ text: `cp: ${arg1}: No such file`, kind: 'error' }] };
      }
      return {
        outputs: [{ text: `Duplicated ${arg1}`, kind: 'muted' }],
        effects: [{ type: 'duplicateFile', id: target.id }],
      };
    }

    case 'mv': {
      if (!arg1 || !arg2) {
        return { outputs: [{ text: 'mv: usage: mv <source> <target>', kind: 'error' }] };
      }
      const target = cwdEntries.find((item) => item.name === arg1);
      if (!target) {
        return { outputs: [{ text: `mv: ${arg1}: No such file`, kind: 'error' }] };
      }
      return {
        outputs: [{ text: `Renamed ${arg1} -> ${arg2}`, kind: 'muted' }],
        effects: [{ type: 'renameFile', id: target.id, newName: arg2 }],
      };
    }

    default:
      return {
        outputs: [{ text: `${cmd}: command not found (try 'help')`, kind: 'error' }],
      };
  }
}

export function generateChatReply(
  prompt: string,
  context: {
    threadId: string;
    threadName: string;
    filesCount: number;
    vaultCount: number;
    projectsCount: number;
    activeFileName?: string;
  }
): Omit<ChatMessage, 'id' | 'time'> {
  const lower = prompt.toLowerCase();
  if (/code|html|css|component|button|card|header/.test(lower)) {
    return {
      threadId: context.threadId,
      role: 'ai',
      text: 'Here is a compact, accessible component pattern matching the current workspace tokens.',
      code: `<button class="primary-action">
  Save changes
</button>

.primary-action {
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--dark-btn);
  color: var(--page);
}`,
      lang: 'HTML',
    };
  }

  if (/status|summary|workspace|files|project|vault|media/.test(lower)) {
    const activeNote = context.activeFileName
      ? ` Active file: ${context.activeFileName}.`
      : '';
    return {
      threadId: context.threadId,
      role: 'ai',
      text: `Workspace snapshot: ${context.filesCount} files, ${context.vaultCount} media & bundle items, and ${context.projectsCount} active projects.${activeNote}`,
    };
  }

  return {
    threadId: context.threadId,
    role: 'ai',
    text: `${context.threadName} received your note. You can save any message or code block directly into Files or Artifacts.`,
  };
}

const VALID_THEMES: ReadonlySet<ThemeId> = new Set([
  'Light',
  'Claude',
  'Dark',
  'OLED',
  'Night',
  'Ocean',
  'Forest',
  'Teal',
  'System',
]);

const VALID_EQ_PRESETS: ReadonlySet<EqPresetId> = new Set([
  'Flat',
  'Bass',
  'Vocal',
  'Treble',
  'Rock',
  'Chill',
]);

const VALID_VAULT_KINDS: ReadonlySet<VaultKind> = new Set([
  'audio',
  'video',
  'photo',
  'bundle',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeFiles(raw: unknown, fallback: WorkspaceFile[]): WorkspaceFile[] {
  if (!Array.isArray(raw)) return fallback;
  const out: WorkspaceFile[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = asString(item.name).trim();
    if (!name) continue;
    const kind = item.kind === 'folder' ? 'folder' : 'file';
    const versions = Array.isArray(item.versions)
      ? item.versions
          .filter(
            (v): v is { id: string; content: string; savedAt: number } =>
              isRecord(v) &&
              typeof v.id === 'string' &&
              typeof v.content === 'string' &&
              typeof v.savedAt === 'number' &&
              Number.isFinite(v.savedAt)
          )
          .slice(0, 5)
      : undefined;
    out.push({
      id: asString(item.id) || createId(),
      name,
      kind,
      ext: kind === 'folder' ? 'folder' : asString(item.ext) || getFileExtension(name),
      content: asString(item.content),
      date: asString(item.date, 'Today'),
      parentId: typeof item.parentId === 'string' ? item.parentId : null,
      updatedAt: asFiniteNumber(item.updatedAt, Date.now()),
      pinned: asBoolean(item.pinned, false),
      versions,
    });
  }
  return out;
}

function sanitizeProjects(raw: unknown, fallback: Project[]): Project[] {
  if (!Array.isArray(raw)) return fallback;
  const out: Project[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = asString(item.name).trim();
    if (!name) continue;
    const tasks: ProjectTask[] = Array.isArray(item.tasks)
      ? item.tasks
          .filter((t): t is Record<string, unknown> => isRecord(t))
          .map((t) => ({
            id: asString(t.id) || createId(),
            text: asString(t.text, 'Untitled task'),
            done: asBoolean(t.done, false),
          }))
      : [];
    const members = Array.isArray(item.members)
      ? item.members.filter((m): m is string => typeof m === 'string' && m.length > 0)
      : undefined;
    out.push({
      id: asString(item.id) || createId(),
      name,
      description: typeof item.description === 'string' ? item.description : undefined,
      date: typeof item.date === 'string' ? item.date : undefined,
      location: typeof item.location === 'string' ? item.location : undefined,
      members,
      accent: typeof item.accent === 'string' ? item.accent : undefined,
      tasks,
      updatedAt: asFiniteNumber(item.updatedAt, Date.now()),
    });
  }
  return out;
}

function sanitizeArtifacts(raw: unknown, fallback: Artifact[]): Artifact[] {
  if (!Array.isArray(raw)) return fallback;
  const out: Artifact[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = asString(item.name).trim();
    if (!name) continue;
    out.push({
      id: asString(item.id) || createId(),
      name,
      date: asString(item.date, 'Today'),
      content: asString(item.content),
      detail: asString(item.detail),
      updatedAt: asFiniteNumber(item.updatedAt, Date.now()),
    });
  }
  return out;
}

function sanitizeVaultItems(raw: unknown, fallback: VaultItem[]): VaultItem[] {
  if (!Array.isArray(raw)) return fallback;
  const out: VaultItem[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const kindRaw = asString(item.kind) as VaultKind;
    const kind: VaultKind = VALID_VAULT_KINDS.has(kindRaw) ? kindRaw : 'audio';
    const name = asString(item.name).trim() || asString(item.title).trim();
    if (!name) continue;
    const ext = asString(item.ext) || getFileExtension(name);
    const bundlePaths = Array.isArray(item.bundlePaths)
      ? item.bundlePaths.filter((p): p is string => typeof p === 'string')
      : undefined;
    out.push({
      id: asString(item.id) || createId(),
      kind,
      name,
      title: asString(item.title).trim() || name.replace(/\.[^.]+$/, '') || name,
      artist: typeof item.artist === 'string' ? item.artist : undefined,
      ext,
      mime: asString(item.mime, 'application/octet-stream'),
      size: Math.max(0, asFiniteNumber(item.size, 0)),
      duration:
        typeof item.duration === 'number' && Number.isFinite(item.duration)
          ? Math.max(0, item.duration)
          : undefined,
      thumb: typeof item.thumb === 'string' ? item.thumb : undefined,
      entryFile: typeof item.entryFile === 'string' ? item.entryFile : undefined,
      bundlePaths,
      collectionId:
        typeof item.collectionId === 'string' ? item.collectionId : undefined,
      favorite: asBoolean(item.favorite, false),
      pinned: asBoolean(item.pinned, false),
      playCount: Math.max(0, asFiniteNumber(item.playCount, 0)),
      progress: Math.max(0, asFiniteNumber(item.progress, 0)),
      notes: typeof item.notes === 'string' ? item.notes : undefined,
      createdAt: asFiniteNumber(item.createdAt, Date.now()),
      updatedAt: asFiniteNumber(item.updatedAt, Date.now()),
    });
  }
  return out;
}

function sanitizeCollections(
  raw: unknown,
  fallback: VaultCollection[]
): VaultCollection[] {
  if (!Array.isArray(raw)) return fallback;
  const out: VaultCollection[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = asString(item.name).trim();
    if (!name) continue;
    const scopeRaw = asString(item.scope);
    const scope =
      scopeRaw === 'all' || VALID_VAULT_KINDS.has(scopeRaw as VaultKind)
        ? (scopeRaw as VaultCollection['scope'])
        : 'all';
    out.push({
      id: asString(item.id) || createId(),
      name,
      color: asString(item.color, '#D97757'),
      glyph: asString(item.glyph, '✦'),
      scope,
    });
  }
  return out;
}

function sanitizeThreads(raw: unknown, fallback: ChatThread[]): ChatThread[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const out: ChatThread[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = asString(item.name).trim();
    if (!name) continue;
    out.push({
      id: asString(item.id) || createId(),
      name,
      avatar: asString(item.avatar) || name[0].toUpperCase(),
      role: asString(item.role, 'Workspace thread'),
      unread: Math.max(0, asFiniteNumber(item.unread, 0)),
    });
  }
  return out.length > 0 ? out : fallback;
}

function sanitizeMessages(
  raw: unknown,
  fallback: ChatMessage[],
  fallbackThreadId: string
): ChatMessage[] {
  if (!Array.isArray(raw)) return fallback;
  const out: ChatMessage[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const audioUrl =
      typeof item.audioUrl === 'string' ? item.audioUrl : undefined;
    if (audioUrl?.startsWith('blob:')) continue;
    out.push({
      id: asString(item.id) || createId(),
      threadId: asString(item.threadId) || fallbackThreadId,
      role: item.role === 'user' ? 'user' : 'ai',
      text: asString(item.text),
      time: asString(item.time, '00:00'),
      code: typeof item.code === 'string' ? item.code : undefined,
      lang: typeof item.lang === 'string' ? item.lang : undefined,
      audioUrl,
      duration:
        typeof item.duration === 'number' && Number.isFinite(item.duration)
          ? item.duration
          : undefined,
      transcript: typeof item.transcript === 'string' ? item.transcript : undefined,
    });
  }
  return out;
}

function sanitizeBookmarks(
  raw: unknown,
  fallback: BookmarkItem[]
): BookmarkItem[] {
  if (!Array.isArray(raw)) return fallback;
  const out: BookmarkItem[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const url = asString(item.url).trim();
    if (!url) continue;
    out.push({
      id: asString(item.id) || createId(),
      title: asString(item.title).trim() || url,
      url,
    });
  }
  return out;
}

function sanitizeBrowserTabs(
  raw: unknown,
  fallback: BrowserTabItem[]
): BrowserTabItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const out: BrowserTabItem[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const url = asString(item.url).trim();
    if (!url) continue;
    out.push({
      id: asString(item.id) || createId(),
      title: asString(item.title).trim() || 'Tab',
      url,
      bundleId: typeof item.bundleId === 'string' ? item.bundleId : undefined,
    });
  }
  return out.length > 0 ? out : fallback;
}

function sanitizeTrash(raw: unknown, fallback: TrashItem[]): TrashItem[] {
  if (!Array.isArray(raw)) return fallback;
  const validOrigins = new Set(['files', 'artifacts', 'projects', 'vault']);
  const out: TrashItem[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const origin = asString(item.origin);
    if (!validOrigins.has(origin) || !isRecord(item.payload)) continue;
    const name = asString(item.name).trim();
    if (!name) continue;
    out.push({
      id: asString(item.id) || createId(),
      name,
      kind: asString(item.kind, 'File') as TrashItem['kind'],
      date: asString(item.date, 'Today'),
      origin: origin as TrashItem['origin'],
      payload: item.payload as unknown as TrashItem['payload'],
    });
  }
  return out;
}

function sanitizeSettings(
  raw: unknown,
  fallback: WorkspaceSettings
): WorkspaceSettings {
  if (!isRecord(raw)) {
    return {
      ...fallback,
      eqBands: [...fallback.eqBands] as [number, number, number, number, number],
    };
  }
  const appearanceRaw = asString(raw.appearance) as ThemeId;
  const appearance = VALID_THEMES.has(appearanceRaw)
    ? appearanceRaw
    : fallback.appearance;
  const eqPresetRaw = asString(raw.eqPreset) as EqPresetId;
  const eqPreset = VALID_EQ_PRESETS.has(eqPresetRaw)
    ? eqPresetRaw
    : fallback.eqPreset;
  const rawBands = Array.isArray(raw.eqBands) ? raw.eqBands : [];
  const eqBands: [number, number, number, number, number] = [0, 1, 2, 3, 4].map(
    (idx) => {
      const val = rawBands[idx];
      return typeof val === 'number' && Number.isFinite(val)
        ? Math.max(-12, Math.min(12, val))
        : fallback.eqBands[idx];
    }
  ) as [number, number, number, number, number];

  const speedRaw = asFiniteNumber(raw.playbackSpeed, fallback.playbackSpeed);
  const playbackSpeed = Math.max(0.25, Math.min(3, speedRaw));
  const autoLockMinutes =
    raw.autoLockMinutes === 1 || raw.autoLockMinutes === 5
      ? raw.autoLockMinutes
      : 0;
  const pinHash =
    typeof raw.pinHash === 'string' && raw.pinHash.length > 0
      ? raw.pinHash
      : undefined;
  const pinSalt =
    typeof raw.pinSalt === 'string' && raw.pinSalt.length > 0
      ? raw.pinSalt
      : undefined;

  return {
    appearance,
    profileName: asString(raw.profileName).trim() || fallback.profileName,
    profileEmail: asString(raw.profileEmail).trim() || fallback.profileEmail,
    lineNumbers: asBoolean(raw.lineNumbers, fallback.lineNumbers),
    autoScroll: asBoolean(raw.autoScroll, fallback.autoScroll),
    compact: asBoolean(raw.compact, fallback.compact),
    autoTranscribe: asBoolean(raw.autoTranscribe, fallback.autoTranscribe),
    eqPreset,
    eqBands,
    volumeLeveler: asBoolean(raw.volumeLeveler, fallback.volumeLeveler),
    playbackSpeed,
    pinHash: pinHash && pinSalt ? pinHash : undefined,
    pinSalt: pinHash && pinSalt ? pinSalt : undefined,
    autoLockMinutes,
    accentOverride:
      typeof raw.accentOverride === 'string' ? raw.accentOverride : undefined,
  };
}

export function sanitizeWorkspaceSnapshot(
  raw: unknown,
  seed: WorkspaceSnapshot
): WorkspaceSnapshot {
  if (!isRecord(raw)) {
    return seed;
  }
  const threads = sanitizeThreads(raw.threads, seed.threads);
  const fallbackThreadId = threads[0]?.id || 'c1';

  return {
    files: sanitizeFiles(raw.files, seed.files),
    projects: sanitizeProjects(raw.projects, seed.projects),
    artifacts: sanitizeArtifacts(raw.artifacts, seed.artifacts),
    trash: sanitizeTrash(raw.trash, seed.trash),
    threads,
    messages: sanitizeMessages(raw.messages, seed.messages, fallbackThreadId),
    bookmarks: sanitizeBookmarks(raw.bookmarks, seed.bookmarks),
    browserTabs: sanitizeBrowserTabs(raw.browserTabs, seed.browserTabs),
    vaultItems: sanitizeVaultItems(raw.vaultItems, seed.vaultItems),
    collections: sanitizeCollections(raw.collections, seed.collections),
    settings: sanitizeSettings(raw.settings, seed.settings),
  };
}

