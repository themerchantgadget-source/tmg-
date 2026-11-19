import type { VaultItem, WorkspaceSnapshot } from '../types/workspace';
import { getVaultBlob, putVaultBlob } from './vaultDb';

export interface VaultBackupBlob {
  key: string;
  itemId: string;
  mime: string;
  data: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(typeof result === 'string' ? result.split(',')[1] || '' : '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataAsURL(blob);
  });
}

export async function buildVaultBackup(vaultItems: VaultItem[]): Promise<VaultBackupBlob[]> {
  const blobs: VaultBackupBlob[] = [];
  for (const item of vaultItems) {
    if (item.kind === 'bundle' && item.bundlePaths) {
      for (const path of item.bundlePaths) {
        const key = `bundle:${item.id}:${path}`;
        const blob = await getVaultBlob(key);
        if (blob) {
          blobs.push({ key, itemId: item.id, mime: blob.type || item.mime, data: await blobToBase64(blob) });
        }
      }
    } else {
      const blob = await getVaultBlob(item.id);
      if (blob) {
        blobs.push({ key: item.id, itemId: item.id, mime: blob.type || item.mime, data: await blobToBase64(blob) });
      }
    }
  }
  return blobs;
}

export async function restoreVaultBackup(blobs: VaultBackupBlob[] | undefined): Promise<void> {
  if (!Array.isArray(blobs)) return;
  await Promise.all(blobs.map(async (blob) => {
    if (!blob?.key || typeof blob.data !== 'string') return;
    const binary = atob(blob.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    await putVaultBlob(blob.key, new Blob([bytes], { type: blob.mime || 'application/octet-stream' }));
  }));
}

export interface CompleteWorkspaceBackup {
  format: 'tmg-workspace';
  version: 2;
  snapshot: WorkspaceSnapshot;
  vaultBlobs: VaultBackupBlob[];
}
