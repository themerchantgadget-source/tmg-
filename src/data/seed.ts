import type {
  Artifact,
  BookmarkItem,
  BrowserTabItem,
  ChatMessage,
  ChatThread,
  Project,
  VaultCollection,
  WorkspaceFile,
  WorkspaceSettings,
  WorkspaceSnapshot,
} from '../types/workspace';

const NOW = 1763557949000;

export const INITIAL_FILES: WorkspaceFile[] = [
  {
    id: 'f1',
    name: 'index.html',
    kind: 'file',
    ext: 'html',
    date: 'Today',
    parentId: null,
    pinned: true,
    updatedAt: NOW - 1000 * 60 * 10,
    content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Merchant Site</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header>
      <h1>Merchant</h1>
      <p>Goods, made carefully.</p>
    </header>
    <main>
      <section class="hero">
        <h2>New collection</h2>
        <p class="lead">Small-batch studio essentials crafted in warm stone and brushed steel.</p>
        <a class="cta" href="#shop" data-open="collection">Shop now</a>
      </section>
    </main>
    <script src="app.js"></script>
  </body>
</html>`,
  },
  {
    id: 'f2',
    name: 'styles.css',
    kind: 'file',
    ext: 'css',
    date: 'Today',
    parentId: null,
    updatedAt: NOW - 1000 * 60 * 25,
    content: `:root {
  --ink: #161614;
  --paper: #F2F1ED;
  --accent: #D94E32;
}

body {
  margin: 0;
  color: var(--ink);
  background: var(--paper);
  font-family: system-ui, -apple-system, sans-serif;
}

header {
  padding: 28px 32px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid #DFDCD4;
}

header h1 {
  margin: 0;
  font-size: 20px;
}

header p {
  margin: 0;
  color: #5F5C54;
  font-size: 14px;
}

.hero {
  padding: 64px 32px;
  max-width: 720px;
}

.hero h2 {
  margin: 0 0 12px;
  font-size: 36px;
  letter-spacing: -0.02em;
}

.lead {
  color: #5F5C54;
  margin: 0 0 24px;
  line-height: 1.6;
}

.cta {
  display: inline-block;
  background: var(--ink);
  color: var(--paper);
  text-decoration: none;
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
}`,
  },
  {
    id: 'f3',
    name: 'app.js',
    kind: 'file',
    ext: 'js',
    date: 'Yesterday',
    parentId: null,
    updatedAt: NOW - 1000 * 60 * 60 * 18,
    content: `const items = [
  { name: "Merchant Site", status: "active" },
  { name: "Brand Launch — Spring", status: "active" },
];

function render(list) {
  return list
    .filter((item) => item.status === "active")
    .map((item) => item.name);
}

const active = render(items);
console.log("Active entries:", active);

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-open]") : null;
  if (target) {
    event.preventDefault();
    target.textContent = "Collection opened";
  }
});`,
  },
  {
    id: 'f4',
    name: 'README.md',
    kind: 'file',
    ext: 'md',
    date: 'Yesterday',
    parentId: null,
    pinned: true,
    updatedAt: NOW - 1000 * 60 * 60 * 24,
    content: `# Merchant Site

A small storefront for goods made carefully.

## Run

Open index.html in the live preview tab or Browser view.

## Structure

- index.html — markup
- styles.css — styles
- app.js — behaviour

## Notes

Keep the layout calm. One idea per screen.`,
  },
  {
    id: 'f5',
    name: 'notes.md',
    kind: 'file',
    ext: 'md',
    date: 'Mon',
    parentId: null,
    updatedAt: NOW - 1000 * 60 * 60 * 48,
    content: `# Launch Notes

- Keep the Today view focused on active work.
- One project at a time with clear task checkboxes.
- Drop audio, video, photos, or .zip web bundles directly into Files & Vault.
- Switch themes and tune the 5-band EQ inside Studio.`,
  },
  {
    id: 'f6',
    name: 'Design',
    kind: 'folder',
    ext: 'folder',
    date: 'Mon',
    parentId: null,
    updatedAt: NOW - 1000 * 60 * 60 * 52,
    content: '',
  },
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Brand Launch — Spring',
    description: 'Identity, landing page, and studio launch kit in one focused sprint.',
    date: 'Fri, 14 Jun · 10:00',
    location: 'Studio · Lisbon',
    members: ['M', 'A', 'J'],
    accent: '#D94E32',
    updatedAt: NOW - 1000 * 60 * 15,
    tasks: [
      { id: 't1', text: 'Finalise logo lockup', done: true },
      { id: 't2', text: 'Landing hero + copy', done: true },
      { id: 't3', text: 'Social kit export', done: false },
      { id: 't4', text: 'Launch checklist', done: false },
    ],
  },
  {
    id: 'p2',
    name: 'Product Site Redesign',
    description: 'New home, pricing, and developer docs with calmer hierarchy.',
    date: 'Mon, 17 Jun · 14:30',
    location: 'Remote · Studio',
    members: ['M', 'K'],
    accent: '#46A171',
    updatedAt: NOW - 1000 * 60 * 60 * 12,
    tasks: [
      { id: 't5', text: 'Wireframes', done: true },
      { id: 't6', text: 'Design system tokens', done: false },
      { id: 't7', text: 'Prototype review', done: false },
    ],
  },
  {
    id: 'p3',
    name: 'API Docs & SDK',
    description: 'Public developer reference and authentication examples.',
    date: 'Wed, 19 Jun · 09:00',
    location: 'Studio · Porto',
    members: ['M', 'S', 'L'],
    accent: '#2783DE',
    updatedAt: NOW - 1000 * 60 * 60 * 30,
    tasks: [
      { id: 't8', text: 'Outline endpoints', done: true },
      { id: 't9', text: 'Add SDK examples', done: true },
      { id: 't10', text: 'Review auth section', done: false },
    ],
  },
];

export const INITIAL_ARTIFACTS: Artifact[] = [
  {
    id: 'a1',
    name: 'Launch Deck',
    date: 'Today · 10:20',
    updatedAt: NOW - 1000 * 60 * 40,
    content: `LAUNCH DECK\n\n1. One clear promise\n2. Three proof points\n3. Soft clay CTA — Start now`,
    detail: 'Structured slide outline for the Spring storefront launch.',
  },
  {
    id: 'a2',
    name: 'Dashboard Concept',
    date: 'Yesterday',
    updatedAt: NOW - 1000 * 60 * 60 * 20,
    content: 'Overview · Today\n\nOne structured workspace rail, recent work at the top, active projects nearby, and zero competing panels.',
    detail: 'Layout note for the unified Today overview.',
  },
  {
    id: 'a3',
    name: 'Pricing Outline',
    date: 'Mon',
    updatedAt: NOW - 1000 * 60 * 60 * 50,
    content: `PRICING\n\nStarter — Free\nPro — $12 / mo\nStudio — $29 / mo`,
    detail: 'Three-tier plan structure with clean monthly cadence.',
  },
];

export const INITIAL_THREADS: ChatThread[] = [
  {
    id: 'c1',
    name: 'Merchant',
    avatar: 'M',
    role: 'Workspace assistant',
    unread: 2,
  },
  {
    id: 'c2',
    name: 'Design Team',
    avatar: 'D',
    role: 'Studio review',
    unread: 0,
  },
  {
    id: 'c3',
    name: 'Ava — Copy',
    avatar: 'A',
    role: 'Editorial',
    unread: 0,
  },
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    threadId: 'c1',
    role: 'ai',
    text: 'Morning! I tightened the hero and kept the layout calm — one focus, lots of space.',
    time: '09:38',
    code: `<header>\n  <h1>Merchant</h1>\n  <p>Goods, made carefully.</p>\n</header>`,
    lang: 'HTML',
  },
  {
    id: 'm2',
    threadId: 'c1',
    role: 'user',
    text: 'Make the hero calmer and keep the nav to three links.',
    time: '09:40',
  },
  {
    id: 'm3',
    threadId: 'c1',
    role: 'ai',
    text: 'Done. The hero now uses one line of copy, and the nav keeps only Home, Shop, and About.',
    time: '09:41',
  },
  {
    id: 'm10',
    threadId: 'c2',
    role: 'ai',
    text: 'Final files are ready to review — check Files & Vault for the latest export or run the preview bundle.',
    time: '08:12',
  },
  {
    id: 'm11',
    threadId: 'c3',
    role: 'ai',
    text: 'Headline v3 is in notes.md. Short, direct, zero filler.',
    time: 'Yesterday',
  },
];

export const INITIAL_BOOKMARKS: BookmarkItem[] = [
  { id: 'b1', title: 'Docs', url: 'tmg.app/docs' },
  { id: 'b2', title: 'Workspace Preview', url: 'tmg.app/preview' },
  { id: 'b3', title: 'Dashboard', url: 'tmg.app/dashboard' },
];

export const INITIAL_BROWSER_TABS: BrowserTabItem[] = [
  { id: 'tab-1', title: 'Docs', url: 'tmg.app/docs' },
  { id: 'tab-2', title: 'Live Preview', url: 'tmg.app/preview' },
];

export const INITIAL_COLLECTIONS: VaultCollection[] = [
  { id: 'col-studio', name: 'Studio Mixes', color: '#D97757', glyph: '♪', scope: 'audio' },
  { id: 'col-refs', name: 'Visual Refs', color: '#2783DE', glyph: '✦', scope: 'photo' },
  { id: 'col-builds', name: 'Web Builds', color: '#46A171', glyph: '❖', scope: 'bundle' },
];

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  appearance: 'Light',
  profileName: 'Merchant',
  profileEmail: 'm@tmg.app',
  lineNumbers: true,
  autoScroll: true,
  compact: false,
  autoTranscribe: false,
  eqPreset: 'Flat',
  eqBands: [0, 0, 0, 0, 0],
  volumeLeveler: false,
  playbackSpeed: 1,
  autoLockMinutes: 0,
};

export function createInitialSnapshot(): WorkspaceSnapshot {
  return {
    files: INITIAL_FILES.map((item) => ({ ...item })),
    projects: INITIAL_PROJECTS.map((project) => ({
      ...project,
      members: project.members ? [...project.members] : undefined,
      tasks: project.tasks.map((task) => ({ ...task })),
    })),
    artifacts: INITIAL_ARTIFACTS.map((artifact) => ({ ...artifact })),
    trash: [],
    threads: INITIAL_THREADS.map((t) => ({ ...t })),
    messages: INITIAL_MESSAGES.map((message) => ({ ...message })),
    bookmarks: INITIAL_BOOKMARKS.map((bookmark) => ({ ...bookmark })),
    browserTabs: INITIAL_BROWSER_TABS.map((tab) => ({ ...tab })),
    vaultItems: [],
    collections: INITIAL_COLLECTIONS.map((col) => ({ ...col })),
    settings: {
      ...DEFAULT_SETTINGS,
      eqBands: [...DEFAULT_SETTINGS.eqBands] as [number, number, number, number, number],
    },
  };
}
