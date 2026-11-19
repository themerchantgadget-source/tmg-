import type { Artifact, BookmarkItem, BrowserTabItem, ChatMessage, ChatThread, Project, VaultCollection, WorkspaceFile, WorkspaceSettings, WorkspaceSnapshot } from '../types/workspace';

const NOW = 1763557949000;

export const INITIAL_FILES: WorkspaceFile[] = [
  { id:'f1', name:'index.html', kind:'file', ext:'html', date:'Today', parentId:null, pinned:true, updatedAt:NOW-600000, content:'<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>Merchant Site</title><link rel="stylesheet" href="styles.css"></head>\n<body><header><h1>Merchant</h1><p>Goods, made carefully.</p></header><main><h2>New collection</h2><p>Small-batch studio essentials.</p></main><script src="app.js"></script></body>\n</html>' },
  { id:'f2', name:'styles.css', kind:'file', ext:'css', date:'Today', parentId:null, updatedAt:NOW-1500000, content:'body{margin:0;font-family:system-ui;background:#F2F1ED;color:#161614}header{padding:28px 32px;border-bottom:1px solid #DFDCD4}main{padding:64px 32px}' },
  { id:'f3', name:'app.js', kind:'file', ext:'js', date:'Yesterday', parentId:null, updatedAt:NOW-64800000, content:'document.body.dataset.ready="true";' },
  { id:'f4', name:'README.md', kind:'file', ext:'md', date:'Yesterday', parentId:null, pinned:true, updatedAt:NOW-86400000, content:'# Merchant Site\n\nA small storefront for goods made carefully.' },
  { id:'f5', name:'notes.md', kind:'file', ext:'md', date:'Mon', parentId:null, updatedAt:NOW-172800000, content:'# Launch Notes\n\n- Keep the workspace focused.\n- One project at a time.' },
  { id:'f6', name:'Design', kind:'folder', ext:'folder', date:'Mon', parentId:null, updatedAt:NOW-187200000, content:'' },
];

export const INITIAL_PROJECTS: Project[] = [
  { id:'p1', name:'Brand Launch — Spring', description:'Identity, landing page, and studio launch kit.', date:'Fri, 14 Jun · 10:00', location:'Studio · Lisbon', members:['M','A','J'], accent:'#D94E32', updatedAt:NOW-900000, tasks:[{id:'t1',text:'Finalise logo lockup',done:true},{id:'t2',text:'Landing hero + copy',done:true},{id:'t3',text:'Social kit export',done:false}] },
  { id:'p2', name:'Product Site Redesign', description:'A calmer product website.', date:'Mon, 17 Jun · 14:30', location:'Remote', members:['M','K'], accent:'#46A171', updatedAt:NOW-43200000, tasks:[{id:'t5',text:'Wireframes',done:true},{id:'t6',text:'Design system tokens',done:false}] },
];

export const INITIAL_ARTIFACTS: Artifact[] = [
  { id:'a1', name:'Launch Deck', date:'Today · 10:20', updatedAt:NOW-2400000, content:'LAUNCH DECK\n\n1. One clear promise\n2. Three proof points\n3. Start now', detail:'Structured slide outline.' },
  { id:'a2', name:'Dashboard Concept', date:'Yesterday', updatedAt:NOW-72000000, content:'One structured workspace rail, active projects nearby, and clear hierarchy.', detail:'Layout note.' },
];

export const INITIAL_THREADS: ChatThread[] = [
  { id:'c1', name:'Merchant', avatar:'M', role:'Workspace assistant', unread:2 },
  { id:'c2', name:'Design Team', avatar:'D', role:'Studio review', unread:0 },
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  { id:'m1', threadId:'c1', role:'ai', text:'Morning! I tightened the hero and kept the layout calm — one focus, lots of space.', time:'09:38', code:'<header>\n  <h1>Merchant</h1>\n  <p>Goods, made carefully.</p>\n</header>', lang:'HTML' },
  { id:'m2', threadId:'c1', role:'user', text:'Make the hero calmer and keep the nav to three links.', time:'09:40' },
];

export const INITIAL_BOOKMARKS: BookmarkItem[] = [
  { id:'b1', title:'Docs', url:'tmg.app/docs' },
  { id:'b2', title:'Workspace Preview', url:'tmg.app/preview' },
];

export const INITIAL_BROWSER_TABS: BrowserTabItem[] = [
  { id:'tab-1', title:'Docs', url:'tmg.app/docs' },
  { id:'tab-2', title:'Live Preview', url:'tmg.app/preview' },
];

export const INITIAL_COLLECTIONS: VaultCollection[] = [
  { id:'col-studio', name:'Studio Mixes', color:'#D97757', glyph:'♪', scope:'audio' },
  { id:'col-refs', name:'Visual Refs', color:'#2783DE', glyph:'✦', scope:'photo' },
];

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  appearance:'Light', profileName:'Merchant', profileEmail:'m@tmg.app', lineNumbers:true,
  autoScroll:true, compact:false, autoTranscribe:false, eqPreset:'Flat', eqBands:[0,0,0,0,0],
  volumeLeveler:false, playbackSpeed:1, autoLockMinutes:0,
  aiProvider:'gemini', aiModel:'gemini-2.5-flash', aiEndpoint:'https://generativelanguage.googleapis.com/v1beta',
};

export function createInitialSnapshot(): WorkspaceSnapshot {
  return {
    files:INITIAL_FILES.map((item)=>({...item})),
    projects:INITIAL_PROJECTS.map((project)=>({...project,members:project.members?[...project.members]:undefined,tasks:project.tasks.map((task)=>({...task}))})),
    artifacts:INITIAL_ARTIFACTS.map((artifact)=>({...artifact})), trash:[],
    threads:INITIAL_THREADS.map((thread)=>({...thread})), messages:INITIAL_MESSAGES.map((message)=>({...message})),
    bookmarks:INITIAL_BOOKMARKS.map((bookmark)=>({...bookmark})), browserTabs:INITIAL_BROWSER_TABS.map((tab)=>({...tab})),
    vaultItems:[], collections:INITIAL_COLLECTIONS.map((collection)=>({...collection})),
    settings:{...DEFAULT_SETTINGS,eqBands:[...DEFAULT_SETTINGS.eqBands] as [number,number,number,number,number]},
  };
}
