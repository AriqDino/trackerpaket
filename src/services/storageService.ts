import { idbGetAllPackages, idbReplaceAllPackages } from '../../shared/backgroundSync';
import type { NormalizedTrackingResult, SavedPackage } from '../../shared/types';

const PACKAGES_STORAGE_KEY = 'mpt_saved_packages_v1';
const THEME_STORAGE_KEY = 'mpt_theme_preference';

export type ThemeMode = 'light' | 'dark';

export function loadSavedPackages(): SavedPackage[] {
  try {
    const raw = localStorage.getItem(PACKAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedPackage =>
        Boolean(item && typeof item === 'object' && typeof item.id === 'string' && typeof item.awb === 'string')
    );
  } catch {
    return [];
  }
}

function persistPackages(packages: SavedPackage[]): void {
  try {
    localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(packages));
  } catch {
    // Abaikan jika storage penuh atau diblokir browser
  }
  void idbReplaceAllPackages(packages);
}

export function applyPackagesFromServiceWorker(swPackages: SavedPackage[]): SavedPackage[] {
  const local = loadSavedPackages();
  const swMap = new Map(swPackages.map((p) => [p.id, p]));

  const merged = local.map((localPkg) => {
    const swPkg = swMap.get(localPkg.id);
    if (!swPkg) return localPkg;
    const localTime = Date.parse(localPkg.updatedAt || '');
    const swTime = Date.parse(swPkg.updatedAt || '');
    if (!Number.isNaN(swTime) && (Number.isNaN(localTime) || swTime > localTime)) {
      return {
        ...swPkg,
        // Pastikan label custom pengguna di localStorage tetap dipertahankan
        label: localPkg.label || swPkg.label,
      };
    }
    return localPkg;
  });

  try {
    localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
  void idbReplaceAllPackages(merged);
  return merged;
}

export async function syncPackagesWithIndexedDb(): Promise<SavedPackage[]> {
  const local = loadSavedPackages();
  const idbList = await idbGetAllPackages();

  if (idbList.length === 0 && local.length > 0) {
    await idbReplaceAllPackages(local);
    return local;
  }

  if (idbList.length > 0 && local.length > 0) {
    return applyPackagesFromServiceWorker(idbList);
  }

  return local;
}

export function buildPackageId(courierCode: string, awb: string): string {
  return `${courierCode.trim().toLowerCase()}:${awb.trim().toUpperCase()}`;
}

export function saveOrUpdatePackage(
  tracking: NormalizedTrackingResult,
  options?: {
    label?: string;
    phoneLast5?: string;
    transactionDate?: string;
  }
): SavedPackage[] {
  const current = loadSavedPackages();
  const id = buildPackageId(tracking.courierCode, tracking.awb);
  const now = new Date().toISOString();
  const existingIndex = current.findIndex((pkg) => pkg.id === id);

  const trimmedLabel = options?.label?.trim();

  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    const updated: SavedPackage = {
      ...existing,
      label: trimmedLabel || existing.label || `Paket ${tracking.courierName}`,
      courierCode: tracking.courierCode,
      courierName: tracking.courierName,
      phoneLast5: options?.phoneLast5 ?? existing.phoneLast5,
      transactionDate: options?.transactionDate ?? existing.transactionDate,
      normalizedStatus: tracking.normalizedStatus,
      tracking,
      updatedAt: now,
    };
    const next = [updated, ...current.filter((_, idx) => idx !== existingIndex)];
    persistPackages(next);
    return next;
  }

  const created: SavedPackage = {
    id,
    label: trimmedLabel || `Paket ${tracking.courierName}`,
    awb: tracking.awb,
    courierCode: tracking.courierCode,
    courierName: tracking.courierName,
    phoneLast5: options?.phoneLast5,
    transactionDate: options?.transactionDate,
    normalizedStatus: tracking.normalizedStatus,
    tracking,
    savedAt: now,
    updatedAt: now,
  };

  const next = [created, ...current];
  persistPackages(next);
  return next;
}

export function renameSavedPackage(id: string, newLabel: string): SavedPackage[] {
  const current = loadSavedPackages();
  const cleaned = newLabel.trim();
  const next = current.map((pkg) =>
    pkg.id === id
      ? {
          ...pkg,
          label: cleaned || pkg.awb,
          updatedAt: new Date().toISOString(),
        }
      : pkg
  );
  persistPackages(next);
  return next;
}

export function deleteSavedPackage(id: string): SavedPackage[] {
  const current = loadSavedPackages();
  const next = current.filter((pkg) => pkg.id !== id);
  persistPackages(next);
  return next;
}

export function loadThemePreference(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // fallback light
  }
  return 'light';
}

export function applyAndSaveTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore storage errors
  }
}
