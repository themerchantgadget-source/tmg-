import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialSnapshot } from '../data/seed';
import {
  buildPreviewDocument,
  calculateProjectProgress,
  executeTerminalCommand,
  filterWorkspaceSearch,
  sanitizeWorkspaceSnapshot,
  sortAndFilterVaultItems,
} from './workspaceLogic';
import {
  classifyImportFile,
  detectBundleEntryHtml,
  resolveBundleRelativePath,
  rewriteBundleHtml,
  sanitizeRelativePath,
} from './vaultUtils';

test('calculateProjectProgress computes percentage accurately', () => {
  assert.deepEqual(calculateProjectProgress([]), {
    done: 0,
    total: 0,
    percent: 0,
  });

  assert.deepEqual(
    calculateProjectProgress([
      { id: '1', text: 'A', done: true },
      { id: '2', text: 'B', done: false },
      { id: '3', text: 'C', done: true },
      { id: '4', text: 'D', done: false },
    ]),
    { done: 2, total: 4, percent: 50 }
  );
});

test('filterWorkspaceSearch searches across files, vault items, projects, artifacts, and threads', () => {
  const seed = createInitialSnapshot();
  seed.vaultItems.push({
    id: 'v1',
    kind: 'audio',
    name: 'ambient-session.wav',
    title: 'Ambient Session',
    artist: 'Studio',
    ext: 'wav',
    mime: 'audio/wav',
    size: 4096,
    playCount: 3,
    progress: 0,
    createdAt: 1000,
    updatedAt: 2000,
  });

  const hits = filterWorkspaceSearch(
    'ambient',
    seed.files,
    seed.projects,
    seed.artifacts,
    seed.vaultItems,
    seed.threads
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0].kind, 'Audio');
  assert.equal(hits[0].label, 'Ambient Session');

  const threadHits = filterWorkspaceSearch(
    'Design Team',
    seed.files,
    seed.projects,
    seed.artifacts,
    seed.vaultItems,
    seed.threads
  );
  assert.ok(threadHits.some((h) => h.kind === 'Thread' && h.label === 'Design Team'));
});

test('sortAndFilterVaultItems filters by scope, favorite, collection, and pinned order', () => {
  const items = [
    {
      id: 'a',
      kind: 'audio' as const,
      name: 'track-a.mp3',
      title: 'Beta Track',
      ext: 'mp3',
      mime: 'audio/mpeg',
      size: 100,
      playCount: 2,
      progress: 0,
      favorite: false,
      pinned: false,
      createdAt: 100,
      updatedAt: 100,
    },
    {
      id: 'b',
      kind: 'audio' as const,
      name: 'track-b.mp3',
      title: 'Alpha Track',
      ext: 'mp3',
      mime: 'audio/mpeg',
      size: 500,
      playCount: 8,
      progress: 0,
      favorite: true,
      pinned: true,
      collectionId: 'col-1',
      createdAt: 200,
      updatedAt: 200,
    },
    {
      id: 'c',
      kind: 'video' as const,
      name: 'clip.mp4',
      title: 'Studio Clip',
      ext: 'mp4',
      mime: 'video/mp4',
      size: 900,
      playCount: 1,
      progress: 0,
      createdAt: 300,
      updatedAt: 300,
    },
  ];

  const byName = sortAndFilterVaultItems(items, {
    scope: 'audio',
    query: '',
    sortBy: 'name',
  });
  assert.deepEqual(
    byName.map((i) => i.id),
    ['b', 'a']
  );

  const favCol = sortAndFilterVaultItems(items, {
    scope: 'all',
    query: '',
    favoritesOnly: true,
    collectionId: 'col-1',
    sortBy: 'recent',
  });
  assert.deepEqual(
    favCol.map((i) => i.id),
    ['b']
  );
});

test('executeTerminalCommand handles files, folders, and media playback', () => {
  const seed = createInitialSnapshot();
  seed.vaultItems.push({
    id: 'v-demo',
    kind: 'audio',
    name: 'demo.wav',
    title: 'Demo Tone',
    ext: 'wav',
    mime: 'audio/wav',
    size: 2000,
    playCount: 0,
    progress: 0,
    createdAt: 1,
    updatedAt: 1,
  });

  const mkdirRes = executeTerminalCommand('mkdir assets', {
    files: seed.files,
    cwdId: null,
    history: [],
  });
  assert.equal(mkdirRes.effects?.[0].type, 'createFolder');

  const playRes = executeTerminalCommand('play demo.wav', {
    files: seed.files,
    vaultItems: seed.vaultItems,
    cwdId: null,
    history: [],
  });
  assert.deepEqual(playRes.effects?.[0], { type: 'openVault', id: 'v-demo' });
});

test('ZIP path sanitization and sandbox HTML relative URL rewriting', () => {
  assert.equal(sanitizeRelativePath('__MACOSX/._index.html'), null);
  assert.equal(sanitizeRelativePath('./app/../assets/logo.png'), 'app/assets/logo.png');
  assert.equal(
    detectBundleEntryHtml(['styles/main.css', 'nested/index.html', 'index.html']),
    'index.html'
  );
  assert.equal(
    resolveBundleRelativePath('pages/about.html', '../styles/app.css?v=1'),
    'styles/app.css'
  );

  const rewritten = rewriteBundleHtml(
    '<html><head><link rel="stylesheet" href="./app.css"></head><body><img src="img/pic.png"></body></html>',
    'index.html',
    {
      'app.css': 'blob:css-url',
      'img/pic.png': 'blob:img-url',
    }
  );
  assert.ok(rewritten.includes('blob:css-url'));
  assert.ok(rewritten.includes('blob:img-url'));
  assert.ok(rewritten.includes('XMLHttpRequest'));
  assert.ok(rewritten.includes('localStorage'));
});

test('classifyImportFile categorizes media, docs, and zip archives', () => {
  assert.equal(classifyImportFile('song.mp3', ''), 'audio');
  assert.equal(classifyImportFile('movie.mp4', ''), 'video');
  assert.equal(classifyImportFile('cover.webp', ''), 'photo');
  assert.equal(classifyImportFile('site.zip', ''), 'zip');
  assert.equal(classifyImportFile('notes.md', ''), 'doc');
  assert.equal(classifyImportFile('unknown.bin', ''), null);
});

test('buildPreviewDocument inlines styles.css and app.js and falls back safely', () => {
  const seed = createInitialSnapshot();
  const html = buildPreviewDocument(seed.files);
  assert.ok(html.includes('<style>'));
  assert.ok(html.includes('Merchant'));
  assert.ok(html.includes('<script>'));
  assert.ok(html.includes('localStorage'));

  const missingHtml = buildPreviewDocument([]);
  assert.ok(missingHtml.includes('No index.html found'));
});

test('sanitizeWorkspaceSnapshot recovers safely from null, legacy v1, and malformed fields', () => {
  const seed = createInitialSnapshot();
  assert.deepEqual(sanitizeWorkspaceSnapshot(null, seed), seed);
  assert.deepEqual(sanitizeWorkspaceSnapshot([], seed), seed);

  const malformed = {
    files: [{ id: 'x1', name: 'notes.md', content: 42 }, { bad: true }],
    projects: [{ id: 'p99', name: 'Migrated', tasks: 'not-an-array' }],
    messages: [
      { id: 'm-blob', role: 'user', text: 'stale', audioUrl: 'blob:http://localhost/1' },
      { id: 'm-ok', role: 'user', text: 'hello' },
    ],
    browserTabs: [{ id: 'bad-tab' }, { id: 't1', title: 123, url: 'tmg.app/docs' }],
    vaultItems: [{ id: 'v9', kind: 'unknown', title: 'Track 9' }],
    settings: {
      appearance: 'InvalidTheme',
      profileName: null,
      eqPreset: 'InvalidPreset',
      eqBands: 'bad-bands',
      playbackSpeed: 99,
      autoLockMinutes: 99,
      pinHash: 'abc',
      pinSalt: '',
    },
  };

  const sanitized = sanitizeWorkspaceSnapshot(malformed, seed);
  assert.equal(sanitized.files.length, 1);
  assert.equal(sanitized.files[0].ext, 'md');
  assert.equal(sanitized.files[0].content, '');
  assert.equal(sanitized.projects.length, 1);
  assert.deepEqual(sanitized.projects[0].tasks, []);
  assert.equal(sanitized.messages.length, 1);
  assert.equal(sanitized.messages[0].id, 'm-ok');
  assert.equal(sanitized.messages[0].threadId, seed.threads[0].id);
  assert.equal(sanitized.browserTabs.length, 1);
  assert.equal(sanitized.browserTabs[0].title, 'Tab');
  assert.equal(sanitized.vaultItems.length, 1);
  assert.equal(sanitized.vaultItems[0].kind, 'audio');
  assert.equal(sanitized.settings.appearance, seed.settings.appearance);
  assert.equal(sanitized.settings.profileName, seed.settings.profileName);
  assert.equal(sanitized.settings.eqPreset, seed.settings.eqPreset);
  assert.deepEqual(sanitized.settings.eqBands, seed.settings.eqBands);
  assert.equal(sanitized.settings.playbackSpeed, 3);
  assert.equal(sanitized.settings.autoLockMinutes, 0);
  assert.equal(sanitized.settings.pinHash, undefined);
});

test('buildPreviewDocument escapes closing script tags and injects sandbox history/cookie guards', () => {
  const html = buildPreviewDocument([
    {
      id: 'h1',
      name: 'index.html',
      kind: 'file',
      ext: 'html',
      parentId: null,
      content: '<html><head></head><body><script src="app.js"></script></body></html>',
      date: 'Nov 19',
      updatedAt: 1,
    },
    {
      id: 'j1',
      name: 'app.js',
      kind: 'file',
      ext: 'js',
      parentId: null,
      content: 'const tag = "</script>"; console.log(tag);',
      date: 'Nov 19',
      updatedAt: 1,
    },
  ]);

  assert.ok(html.includes('<\\/script>'));
  assert.ok(html.includes('pushState'));
  assert.ok(html.includes('document'));
});

test('executeTerminalCommand pwd does not hang on circular folder parentId chains', () => {
  const res = executeTerminalCommand('pwd', {
    cwdId: 'f1',
    history: [],
    files: [
      {
        id: 'f1',
        name: 'alpha',
        kind: 'folder',
        ext: '',
        parentId: 'f2',
        content: '',
        date: 'Nov 19',
        updatedAt: 1,
      },
      {
        id: 'f2',
        name: 'beta',
        kind: 'folder',
        ext: '',
        parentId: 'f1',
        content: '',
        date: 'Nov 19',
        updatedAt: 1,
      },
    ],
  });
  assert.equal(res.outputs[0].text, '~/workspace/beta/alpha');
});
