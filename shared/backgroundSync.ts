import type { PackageStatus, SavedPackage } from './types';

export const BACKGROUND_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 jam
export const PERIODIC_SYNC_TAG = 'mpt-refresh-active-packages';
export const ONESHOT_SYNC_TAG = 'mpt-sync-active-packages';
export const BROADCAST_CHANNEL_NAME = 'mpt-background-sync';

const DB_NAME = 'mpt_background_sync_db';
const DB_VERSION = 1;
const PACKAGES_STORE = 'packages';
const META_STORE = 'meta';

export interface BackgroundSyncSettings {
  enabled: boolean;
  notifyOnChange: boolean;
}

export interface BackgroundSyncStatusChange {
  id: string;
  label: string;
  awb: string;
  courierName: string;
  from: PackageStatus;
  to: PackageStatus;
}

export interface BackgroundSyncRunResult {
  source: 'periodic-sync' | 'oneshot-sync' | 'manual-or-timer';
  totalActive: number;
  updated: number;
  skipped: number;
  failed: number;
  statusChanges: BackgroundSyncStatusChange[];
  completedAt: string;
}

export interface BackgroundSyncMeta {
  lastSyncAt: string | null;
  lastRunResult: BackgroundSyncRunResult | null;
}

function openSyncDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia di lingkungan ini.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PACKAGES_STORE)) {
        db.createObjectStore(PACKAGES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Gagal membuka IndexedDB.'));
  });
}

export async function idbGetAllPackages(): Promise<SavedPackage[]> {
  try {
    const db = await openSyncDb();
    return await new Promise<SavedPackage[]>((resolve, reject) => {
      const tx = db.transaction(PACKAGES_STORE, 'readonly');
      const store = tx.objectStore(PACKAGES_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}

export async function idbReplaceAllPackages(packages: SavedPackage[]): Promise<void> {
  try {
    const db = await openSyncDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PACKAGES_STORE, 'readwrite');
      const store = tx.objectStore(PACKAGES_STORE);
      store.clear();
      for (const pkg of packages) {
        store.put(pkg);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // Abaikan jika IndexedDB diblokir (misal private browsing tertentu)
  }
}

export async function idbPutPackage(pkg: SavedPackage): Promise<void> {
  try {
    const db = await openSyncDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PACKAGES_STORE, 'readwrite');
      tx.objectStore(PACKAGES_STORE).put(pkg);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // Abaikan error IDB
  }
}

export async function idbGetMeta<T>(key: string): Promise<T | null> {
  try {
    const db = await openSyncDb();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const req = tx.objectStore(META_STORE).get(key);
      req.onsuccess = () => {
        const record = req.result as { key: string; value: T } | undefined;
        resolve(record ? record.value : null);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function idbSetMeta<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openSyncDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put({ key, value });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // Abaikan error IDB
  }
}
