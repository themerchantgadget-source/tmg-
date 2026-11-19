import { unzipSync } from 'fflate';
import type { VaultKind } from '../types/workspace';

export type ImportClassification = VaultKind | 'doc' | 'zip' | null;

const AUDIO_RE = /\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|weba|mka|aiff?|caf)$/i;
const VIDEO_RE = /\.(mp4|m4v|webm|mov|ogv|mkv)$/i;
const PHOTO_RE = /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)$/i;
const DOC_RE =
  /\.(txt|md|markdown|html?|css|m?[jt]sx?|json|csv|py|sh|xml|ya?ml|log|ini|toml)$/i;

const MIME_BY_EXT: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  jsx: 'text/javascript; charset=utf-8',
  ts: 'text/typescript; charset=utf-8',
  tsx: 'text/typescript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/opus',
  weba: 'audio/webm',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mkv: 'video/x-matroska',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  markdown: 'text/markdown; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
};

export function inferMimeFromName(
  name: string,
  fallback = 'application/octet-stream'
): string {
  const parts = name.split('.');
  const ext = parts.length > 1 ? (parts.pop() || '').toLowerCase() : '';
  return MIME_BY_EXT[ext] || fallback;
}

export function classifyImportFile(
  name: string,
  mimeType = ''
): ImportClassification {
  const lower = name.toLowerCase();
  const mime = mimeType.toLowerCase();

  if (
    lower.endsWith('.zip') ||
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed'
  ) {
    return 'zip';
  }
  if (lower.endsWith('.mka') || mime === 'audio/x-matroska') {
    return 'audio';
  }
  if (mime.startsWith('video/') || VIDEO_RE.test(lower)) {
    return 'video';
  }
  if (mime.startsWith('audio/') || AUDIO_RE.test(lower)) {
    return 'audio';
  }
  if (mime.startsWith('image/') || PHOTO_RE.test(lower)) {
    return 'photo';
  }
  if (mime.startsWith('text/') || DOC_RE.test(lower)) {
    return 'doc';
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export function formatMediaClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(
      2,
      '0'
    )}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function sanitizeRelativePath(rawPath: string): string | null {
  const normalized = rawPath.replace(/\\/g, '/').trim();
  if (!normalized || normalized.endsWith('/')) return null;

  const segments = normalized.split('/').filter(Boolean);
  const clean: string[] = [];
  for (const seg of segments) {
    if (seg === '.' || seg === '..') continue;
    if (seg === '__MACOSX' || seg === '.DS_Store') return null;
    clean.push(seg);
  }
  return clean.length > 0 ? clean.join('/') : null;
}

export function stripCommonTopFolder(paths: string[]): Map<string, string> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;

  const firstSegments = new Set(paths.map((p) => p.split('/')[0]));
  const allNested =
    firstSegments.size === 1 && paths.every((p) => p.includes('/'));

  for (const p of paths) {
    map.set(p, allNested ? p.split('/').slice(1).join('/') : p);
  }
  return map;
}

export function detectBundleEntryHtml(paths: string[]): string {
  const htmlFiles = paths.filter((p) => /\.html?$/i.test(p));
  if (htmlFiles.length === 0) return paths[0] || '';
  const rootIndex = htmlFiles.find((p) => /^index\.html?$/i.test(p));
  if (rootIndex) return rootIndex;
  const anyIndex = htmlFiles.find((p) => /(^|\/)index\.html?$/i.test(p));
  if (anyIndex) return anyIndex;
  return [...htmlFiles].sort((a, b) => a.length - b.length)[0];
}

export function resolveBundleRelativePath(
  entryPath: string,
  ref: string
): string | null {
  const cleanedRef = ref.split('#')[0].split('?')[0].trim();
  if (
    !cleanedRef ||
    /^(https?:|data:|blob:|mailto:|tel:|javascript:|#)/i.test(cleanedRef)
  ) {
    return null;
  }

  const baseDirParts = entryPath.includes('/')
    ? entryPath.split('/').slice(0, -1)
    : [];
  const rawParts = cleanedRef.startsWith('/')
    ? cleanedRef.slice(1).split('/')
    : [...baseDirParts, ...cleanedRef.split('/')];

  const resolved: string[] = [];
  for (const seg of rawParts) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      resolved.pop();
    } else {
      resolved.push(seg);
    }
  }
  return resolved.join('/');
}

export function rewriteBundleHtml(
  html: string,
  entryPath: string,
  urlLookup: Record<string, string>
): string {
  const resolveUrl = (ref: string) => {
    const resolved = resolveBundleRelativePath(entryPath, ref);
    if (!resolved) return null;
    return urlLookup[resolved] || null;
  };

  let next = html.replace(
    /\b(src|href|poster|data)\s*=\s*(["'])([^"']+)\2/gi,
    (full, attr: string, quote: string, val: string) => {
      const blobUrl = resolveUrl(val);
      return blobUrl ? `${attr}=${quote}${blobUrl}${quote}` : full;
    }
  );

  next = next.replace(
    /url\(\s*(["']?)([^)"']+)\1\s*\)/gi,
    (full, _q: string, val: string) => {
      const blobUrl = resolveUrl(val);
      return blobUrl ? `url("${blobUrl}")` : full;
    }
  );

  const shim = `<script>
(function(){
  try {
    void window.localStorage;
  } catch (e) {
    var mem = {};
    var storageStub = {
      getItem: function(k){ return Object.prototype.hasOwnProperty.call(mem, String(k)) ? mem[String(k)] : null; },
      setItem: function(k, v){ mem[String(k)] = String(v); },
      removeItem: function(k){ delete mem[String(k)]; },
      clear: function(){ mem = {}; },
      key: function(i){ return Object.keys(mem)[i] || null; },
      get length(){ return Object.keys(mem).length; }
    };
    try { Object.defineProperty(window, 'localStorage', { value: storageStub, configurable: true }); } catch (_){}
    try { Object.defineProperty(window, 'sessionStorage', { value: storageStub, configurable: true }); } catch (_){}
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
  var map = ${JSON.stringify(urlLookup)};
  var base = ${JSON.stringify(entryPath)};
  function resolve(u){
    if(typeof u !== 'string') return u;
    if(/^(https?:|data:|blob:|#)/i.test(u)) return u;
    var clean = u.split('#')[0].split('?')[0].trim();
    var parts = base.indexOf('/') > -1 ? base.split('/').slice(0, -1) : [];
    var segs = clean.startsWith('/') ? clean.slice(1).split('/') : parts.concat(clean.split('/'));
    var out = [];
    for(var i=0;i<segs.length;i++){
      if(!segs[i] || segs[i]==='.') continue;
      if(segs[i]==='..') out.pop();
      else out.push(segs[i]);
    }
    return map[out.join('/')] || u;
  }
  var origFetch = window.fetch;
  if(origFetch){
    window.fetch = function(input, init){
      if(typeof input === 'string') return origFetch.call(this, resolve(input), init);
      return origFetch.call(this, input, init);
    };
  }
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url){
    var args = Array.prototype.slice.call(arguments);
    if(typeof url === 'string') args[1] = resolve(url);
    return origOpen.apply(this, args);
  };
})();
</script>`;

  if (/<head[^>]*>/i.test(next)) {
    next = next.replace(/<head[^>]*>/i, (m) => `${m}\n${shim}`);
  } else {
    next = `${shim}\n${next}`;
  }
  return next;
}

export function unpackZipArchive(
  bytes: Uint8Array
): Array<{ path: string; data: Uint8Array; mime: string }> {
  const raw = unzipSync(bytes);
  const rawPaths: string[] = [];
  const byRawPath = new Map<string, Uint8Array>();

  for (const [key, data] of Object.entries(raw)) {
    const clean = sanitizeRelativePath(key);
    if (!clean) continue;
    rawPaths.push(clean);
    byRawPath.set(clean, data);
  }

  const stripped = stripCommonTopFolder(rawPaths);
  const entries: Array<{ path: string; data: Uint8Array; mime: string }> = [];
  for (const [rawPath, data] of byRawPath.entries()) {
    const finalPath = stripped.get(rawPath) || rawPath;
    if (!finalPath) continue;
    entries.push({
      path: finalPath,
      data,
      mime: inferMimeFromName(finalPath),
    });
  }
  return entries;
}

export async function extractPhotoThumb(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 240;
    const scale = Math.max(240 / (img.width || 1), 240 / (img.height || 1));
    const w = (img.width || 240) * scale;
    const h = (img.height || 240) * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(img, (240 - w) / 2, (240 - h) / 2, w, h);
    return canvas.toDataURL('image/jpeg', 0.78);
  } catch {
    return '';
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function extractVideoThumb(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';

  try {
    const ready = await new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (ok: boolean) => {
        if (!settled) {
          settled = true;
          resolve(ok);
        }
      };
      const timer = window.setTimeout(() => done(false), 4500);
      video.onloadeddata = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const seekTo =
            Number.isFinite(video.duration) && video.duration > 1.5
              ? Math.min(video.duration * 0.15, 4)
              : 0;
          if (seekTo > 0.1) {
            video.currentTime = seekTo;
          } else {
            window.clearTimeout(timer);
            done(true);
          }
        }
      };
      video.onseeked = () => {
        window.clearTimeout(timer);
        done(video.videoWidth > 0);
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        done(false);
      };
      video.src = url;
      video.load();
    });

    if (!ready || video.videoWidth <= 0) return '';
    const height = Math.max(
      120,
      Math.round((video.videoHeight / video.videoWidth) * 320)
    );
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, 320, height);
    return canvas.toDataURL('image/jpeg', 0.74);
  } catch {
    return '';
  } finally {
    video.onloadeddata = null;
    video.onseeked = null;
    video.onerror = null;
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

export function probeMediaDuration(
  blob: Blob,
  kind: 'audio' | 'video'
): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    const url = URL.createObjectURL(blob);
    let done = false;
    const finish = (dur: number) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      el.onloadedmetadata = null;
      el.onerror = null;
      el.removeAttribute('src');
      el.load();
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(dur) && dur > 0 ? dur : 0);
    };
    const timer = window.setTimeout(() => finish(0), 4000);
    el.preload = 'metadata';
    el.muted = true;
    el.onloadedmetadata = () => finish(el.duration);
    el.onerror = () => finish(0);
    el.src = url;
    el.load();
  });
}

export function isEditableTextPath(path: string): boolean {
  return /\.(txt|md|markdown|html?|css|m?[jt]sx?|json|csv|py|sh|xml|ya?ml|log|ini|toml|svg)$/i.test(
    path
  );
}

function fallbackPinDigest(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let round = 0; round < 4096; round++) {
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i) ^ (round & 0xff);
      h1 = Math.imul(h1 ^ code, 0x01000193);
      h2 = Math.imul(h2 ^ (code + i), 0x85ebca6b);
    }
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

export async function hashPinSecret(
  pin: string,
  saltHex?: string
): Promise<{ hash: string; salt: string }> {
  const randomBytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const saltBytes = saltHex
    ? new Uint8Array(
        saltHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? []
      )
    : randomBytes;
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(pin),
        'PBKDF2',
        false,
        ['deriveBits']
      );
      const bits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 60000,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );
      const hash = Array.from(new Uint8Array(bits))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      return { hash, salt };
    } catch {
      // Fallback below if SubtleCrypto rejects in restricted context
    }
  }

  return { hash: fallbackPinDigest(`${salt}:${pin}`), salt };
}

export async function verifyPinSecret(
  pin: string,
  expectedHash: string,
  salt: string
): Promise<boolean> {
  const { hash } = await hashPinSecret(pin, salt);
  return hash === expectedHash;
}
