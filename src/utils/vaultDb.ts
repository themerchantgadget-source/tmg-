const DB_NAME = 'tmg-vault-v1';
const DB_VERSION = 1;
const BLOB_STORE = 'blobs';

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memoryFallback = new Map<string, Blob>();

function openVaultDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(BLOB_STORE)) {
            db.createObjectStore(BLOB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

export function bundleBlobKey(bundleId: string, relativePath: string): string {
  return `bundle:${bundleId}:${relativePath}`;
}

export async function putVaultBlob(key: string, blob: Blob): Promise<void> {
  memoryFallback.set(key, blob);
  const db = await openVaultDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(BLOB_STORE, 'readwrite');
      tx.objectStore(BLOB_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getVaultBlob(key: string): Promise<Blob | null> {
  const db = await openVaultDb();
  if (db) {
    const result = await new Promise<Blob | null>((resolve) => {
      try {
        const tx = db.transaction(BLOB_STORE, 'readonly');
        const req = tx.objectStore(BLOB_STORE).get(key);
        req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    if (result) return result;
  }
  return memoryFallback.get(key) ?? null;
}

export async function deleteVaultBlob(key: string): Promise<void> {
  memoryFallback.delete(key);
  const db = await openVaultDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(BLOB_STORE, 'readwrite');
      tx.objectStore(BLOB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function deleteBundleBlobs(
  bundleId: string,
  paths: string[]
): Promise<void> {
  await Promise.all(
    paths.map((path) => deleteVaultBlob(bundleBlobKey(bundleId, path)))
  );
}

export async function clearAllVaultBlobs(): Promise<void> {
  memoryFallback.clear();
  const db = await openVaultDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(BLOB_STORE, 'readwrite');
      tx.objectStore(BLOB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function estimateVaultQuota(): Promise<{
  usedBytes: number;
  quotaBytes: number;
} | null> {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return {
        usedBytes: est.usage || 0,
        quotaBytes: est.quota || 0,
      };
    }
  } catch {
    // Ignore storage API errors
  }
  return null;
}
