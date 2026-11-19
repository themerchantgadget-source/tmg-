import type { TrashItem, VaultItem, WorkspaceFile } from '../types/workspace';

export function getDescendantFileIds(files: WorkspaceFile[], folderId: string): Set<string> {
  const ids = new Set<string>([folderId]);
  let found = true;
  while (found) {
    found = false;
    for (const file of files) {
      if (file.parentId && ids.has(file.parentId) && !ids.has(file.id)) {
        ids.add(file.id);
        found = true;
      }
    }
  }
  return ids;
}

export function collectFolderTrashItems(
  files: WorkspaceFile[],
  entry: WorkspaceFile
): TrashItem[] {
  if (entry.kind !== 'folder') {
    return [{
      id: crypto.randomUUID(), name: entry.name, kind: 'File', date: 'Today',
      origin: 'files', payload: entry,
    }];
  }

  const ids = getDescendantFileIds(files, entry.id);
  return files
    .filter((file) => ids.has(file.id))
    .map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      kind: file.kind === 'folder' ? 'Folder' : 'File',
      date: 'Today',
      origin: 'files' as const,
      payload: file,
    }))
    .sort((a, b) => {
      const aPayload = a.payload as WorkspaceFile;
      const bPayload = b.payload as WorkspaceFile;
      return (aPayload.kind === 'folder' ? 0 : 1) - (bPayload.kind === 'folder' ? 0 : 1);
    });
}

export function uniqueName(
  name: string,
  entries: WorkspaceFile[],
  parentId: string | null
): string {
  const siblingNames = new Set(
    entries
      .filter((entry) => (entry.parentId ?? null) === parentId)
      .map((entry) => entry.name.toLowerCase())
  );
  if (!siblingNames.has(name.toLowerCase())) return name;

  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let index = 1;
  while (siblingNames.has(`${base} copy ${index}${ext}`.toLowerCase())) index++;
  return `${base} copy ${index}${ext}`;
}

export function validateName(name: string, kind: 'file' | 'folder'): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Enter a name.';
  if (trimmed === '.' || trimmed === '..') return 'That name is reserved.';
  if (/[\\/:*?"<>|]/.test(trimmed)) return 'Names cannot contain / \\ : * ? " < > |.';
  if (kind === 'folder' && trimmed.endsWith('.')) return 'Folder names cannot end with a period.';
  return null;
}

export function restoreFolderEntries(
  items: TrashItem[],
  restored: WorkspaceFile,
  existingFiles: WorkspaceFile[]
): WorkspaceFile[] {
  if (restored.kind !== 'folder') return [restored];

  const descendants = items
    .filter((item) => item.origin === 'files')
    .map((item) => item.payload as WorkspaceFile)
    .filter((item) => item.id === restored.id || getDescendantFileIds([restored, ...items.map((i) => i.payload as WorkspaceFile)], restored.id).has(item.id));

  const ids = new Set(existingFiles.map((file) => file.id));
  return descendants.filter((file) => !ids.has(file.id)).map((file) => ({
    ...file,
    parentId: file.parentId && !existingFiles.some((existing) => existing.id === file.parentId)
      ? null
      : file.parentId,
  }));
}

export function canTrashVaultItem(item: VaultItem, activeId: string | null): boolean {
  return item.id !== activeId;
}
