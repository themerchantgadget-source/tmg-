export type NavSection = 'home' | 'files' | 'editor' | 'studio' | 'terminal' | 'chat' | 'browser' | 'projects' | 'artifacts' | 'trash' | 'settings';
export type ThemeId = 'Light' | 'Claude' | 'Dark' | 'OLED' | 'Night' | 'Ocean' | 'Forest' | 'Teal' | 'System';
export type FileKind = 'file' | 'folder';
export type EqPresetId = 'Flat' | 'Bass' | 'Vocal' | 'Treble' | 'Rock' | 'Chill';

import type { AiProviderId } from '../utils/aiProviders';

export interface FileVersion { id: string; content: string; savedAt: number; }
export interface WorkspaceFile { id: string; name: string; kind: FileKind; ext: string; content: string; date: string; parentId: string | null; updatedAt: number; pinned?: boolean; versions?: FileVersion[]; }
export type VaultKind = 'audio' | 'video' | 'photo' | 'bundle';
export interface VaultItem { id: string; kind: VaultKind; name: string; title: string; artist?: string; ext: string; mime: string; size: number; duration?: number; thumb?: string; entryFile?: string; bundlePaths?: string[]; collectionId?: string; favorite?: boolean; pinned?: boolean; playCount: number; progress: number; notes?: string; createdAt: number; updatedAt: number; }
export interface VaultCollection { id: string; name: string; color: string; glyph: string; scope: 'all' | VaultKind; }
export interface ProjectTask { id: string; text: string; done: boolean; }
export interface Project { id: string; name: string; description?: string; date?: string; location?: string; members?: string[]; accent?: string; tasks: ProjectTask[]; updatedAt: number; }
export interface Artifact { id: string; name: string; date: string; content: string; detail: string; updatedAt: number; }
export interface ChatThread { id: string; name: string; avatar: string; role: string; unread: number; }
export interface ChatMessage { id: string; threadId: string; role: 'ai' | 'user'; text: string; time: string; code?: string; lang?: string; audioUrl?: string; duration?: number; transcript?: string; }
export type TrashOrigin = 'files' | 'artifacts' | 'projects' | 'vault';
export interface TrashItem { id: string; name: string; kind: 'File' | 'Folder' | 'Artifact' | 'Project' | 'Audio' | 'Video' | 'Photo' | 'Bundle'; date: string; origin: TrashOrigin; payload: WorkspaceFile | Artifact | Project | VaultItem; }
export interface TerminalEntry { id: string; text: string; kind: 'normal' | 'muted' | 'cmd' | 'error'; }
export interface BookmarkItem { id: string; title: string; url: string; }
export type BrowserTabKind = 'Docs' | 'Dashboard' | 'Keys' | 'Preview';
export interface BrowserTabItem { id: string; title: string; url: string; bundleId?: string; }

export interface WorkspaceSettings {
  appearance: ThemeId;
  profileName: string;
  profileEmail: string;
  lineNumbers: boolean;
  autoScroll: boolean;
  compact: boolean;
  autoTranscribe: boolean;
  eqPreset: EqPresetId;
  eqBands: [number, number, number, number, number];
  volumeLeveler: boolean;
  playbackSpeed: number;
  aiProvider: AiProviderId;
  aiModel: string;
  aiEndpoint: string;
  pinHash?: string;
  pinSalt?: string;
  autoLockMinutes: 0 | 1 | 5;
  accentOverride?: string;
}

export interface WorkspaceSnapshot { files: WorkspaceFile[]; projects: Project[]; artifacts: Artifact[]; trash: TrashItem[]; threads: ChatThread[]; messages: ChatMessage[]; bookmarks: BookmarkItem[]; browserTabs: BrowserTabItem[]; vaultItems: VaultItem[]; collections: VaultCollection[]; settings: WorkspaceSettings; }
