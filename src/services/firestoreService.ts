import type { User } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { BackgroundSyncSettings } from '../../shared/backgroundSync';
import type { NormalizedTrackingResult, PackageStatus, SavedPackage } from '../../shared/types';
import { auth, db } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isQuotaExceededError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.toLowerCase().includes('quota exceeded');
}

function clampString(value: unknown, maxLength: number, fallback = ''): string {
  const str = typeof value === 'string' ? value : fallback;
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}

export function toFirestorePackageDocId(packageId: string): string {
  const cleaned = packageId.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '');
  const safe = cleaned || 'pkg';
  return safe.slice(0, 128);
}

function sanitizeTrackingPayload(tracking: NormalizedTrackingResult): NormalizedTrackingResult {
  const safeHistory = Array.isArray(tracking.history)
    ? tracking.history.slice(0, 100).map((item) => ({
        date: clampString(item?.date, 64),
        desc: clampString(item?.desc, 500),
        location: clampString(item?.location, 200),
      }))
    : [];

  const sanitized: NormalizedTrackingResult = {
    awb: clampString(tracking.awb, 80, 'UNKNOWN'),
    courierCode: clampString(tracking.courierCode, 40, 'unknown'),
    courierName: clampString(tracking.courierName, 80, 'Ekspedisi'),
    normalizedStatus: tracking.normalizedStatus,
    rawStatus: clampString(tracking.rawStatus, 80),
    estimatedArrival:
      typeof tracking.estimatedArrival === 'string' && tracking.estimatedArrival.trim()
        ? clampString(tracking.estimatedArrival, 80)
        : null,
    summary: {
      awb: clampString(tracking.summary?.awb, 80),
      courier: clampString(tracking.summary?.courier, 80),
      service: clampString(tracking.summary?.service, 80),
      status: clampString(tracking.summary?.status, 80),
      date: clampString(tracking.summary?.date, 64),
      desc: clampString(tracking.summary?.desc, 500),
      amount: clampString(tracking.summary?.amount, 40),
      weight: clampString(tracking.summary?.weight, 40),
    },
    detail: {
      origin: clampString(tracking.detail?.origin, 200),
      destination: clampString(tracking.detail?.destination, 200),
      shipper: clampString(tracking.detail?.shipper, 160),
      receiver: clampString(tracking.detail?.receiver, 160),
    },
    history: safeHistory,
    cached: Boolean(tracking.cached),
    fetchedAt: clampString(tracking.fetchedAt, 64, new Date().toISOString()),
  };

  if (typeof tracking.detectedAutomatically === 'boolean') {
    sanitized.detectedAutomatically = tracking.detectedAutomatically;
  }

  return sanitized;
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return new Date().toISOString();
}

export async function ensureUserAccount(
  user: User,
  defaultSettings: BackgroundSyncSettings
): Promise<BackgroundSyncSettings> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const displayName = clampString(user.displayName || user.email || 'Pengguna LacakPaket', 120);
  const photoURL = clampString(user.photoURL || '', 500);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (!snap.exists()) {
    try {
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        photoURL,
        backgroundSyncEnabled: Boolean(defaultSettings.enabled),
        notifyOnChange: Boolean(defaultSettings.notifyOnChange),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
    return defaultSettings;
  }

  const data = snap.data() as {
    displayName?: string;
    photoURL?: string;
    backgroundSyncEnabled?: boolean;
    notifyOnChange?: boolean;
  };

  if (data.displayName !== displayName || data.photoURL !== photoURL) {
    try {
      await updateDoc(userRef, {
        displayName,
        photoURL,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }

  return {
    enabled: data.backgroundSyncEnabled !== false,
    notifyOnChange: Boolean(data.notifyOnChange),
  };
}

export async function updateCloudSyncSettings(
  uid: string,
  settings: BackgroundSyncSettings
): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      backgroundSyncEnabled: Boolean(settings.enabled),
      notifyOnChange: Boolean(settings.notifyOnChange),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export function subscribeUserPackages(
  uid: string,
  onPackages: (packages: SavedPackage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const collectionPath = `users/${uid}/packages`;
  const packagesQuery = query(
    collection(db, 'users', uid, 'packages'),
    where('ownerId', '==', uid)
  );

  return onSnapshot(
    packagesQuery,
    (snapshot) => {
      const items: SavedPackage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        if (!data || typeof data.id !== 'string' || typeof data.awb !== 'string') return;
        const pkg: SavedPackage = {
          id: data.id,
          label: typeof data.label === 'string' ? data.label : data.awb,
          awb: data.awb,
          courierCode: typeof data.courierCode === 'string' ? data.courierCode : 'unknown',
          courierName: typeof data.courierName === 'string' ? data.courierName : 'Ekspedisi',
          normalizedStatus: (data.normalizedStatus as PackageStatus) || 'waiting',
          tracking: data.tracking as NormalizedTrackingResult,
          savedAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        };
        if (typeof data.phoneLast5 === 'string' && data.phoneLast5) {
          pkg.phoneLast5 = data.phoneLast5;
        }
        if (typeof data.transactionDate === 'string' && data.transactionDate) {
          pkg.transactionDate = data.transactionDate;
        }
        items.push(pkg);
      });

      items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      onPackages(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      } catch (wrappedError) {
        if (onError && wrappedError instanceof Error) {
          onError(wrappedError);
        }
      }
    }
  );
}

export async function upsertCloudPackage(uid: string, pkg: SavedPackage): Promise<void> {
  const docId = toFirestorePackageDocId(pkg.id);
  const path = `users/${uid}/packages/${docId}`;
  const ref = doc(db, 'users', uid, 'packages', docId);

  let existingSnap;
  try {
    existingSnap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const safeLabel = clampString(pkg.label?.trim() || `Paket ${pkg.courierName}`, 120);
  const safeTracking = sanitizeTrackingPayload(pkg.tracking);

  if (!existingSnap.exists()) {
    const payload: Record<string, unknown> = {
      id: clampString(pkg.id, 128),
      ownerId: uid,
      label: safeLabel,
      awb: clampString(pkg.awb, 80),
      courierCode: clampString(pkg.courierCode, 40),
      courierName: clampString(pkg.courierName, 80),
      normalizedStatus: pkg.normalizedStatus,
      tracking: safeTracking,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (pkg.phoneLast5?.trim()) {
      payload.phoneLast5 = clampString(pkg.phoneLast5.trim(), 10);
    }
    if (pkg.transactionDate?.trim()) {
      payload.transactionDate = clampString(pkg.transactionDate.trim(), 20);
    }

    try {
      await setDoc(ref, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    return;
  }

  const existingData = existingSnap.data() as {
    normalizedStatus?: PackageStatus;
    label?: string;
  };

  // Hormati Terminal State Locking: paket yang sudah 'delivered' hanya boleh diubah labelnya
  if (existingData.normalizedStatus === 'delivered') {
    if (existingData.label !== safeLabel) {
      try {
        await updateDoc(ref, {
          label: safeLabel,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
    return;
  }

  const updatePayload: Record<string, unknown> = {
    label: safeLabel,
    normalizedStatus: pkg.normalizedStatus,
    tracking: safeTracking,
    updatedAt: serverTimestamp(),
  };
  if (pkg.phoneLast5?.trim()) {
    updatePayload.phoneLast5 = clampString(pkg.phoneLast5.trim(), 10);
  }
  if (pkg.transactionDate?.trim()) {
    updatePayload.transactionDate = clampString(pkg.transactionDate.trim(), 20);
  }

  try {
    await updateDoc(ref, updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function renameCloudPackage(
  uid: string,
  packageId: string,
  newLabel: string
): Promise<void> {
  const docId = toFirestorePackageDocId(packageId);
  const path = `users/${uid}/packages/${docId}`;
  const ref = doc(db, 'users', uid, 'packages', docId);
  const cleanLabel = clampString(newLabel.trim() || packageId, 120);

  try {
    await updateDoc(ref, {
      label: cleanLabel,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCloudPackage(uid: string, packageId: string): Promise<void> {
  const docId = toFirestorePackageDocId(packageId);
  const path = `users/${uid}/packages/${docId}`;
  const ref = doc(db, 'users', uid, 'packages', docId);

  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function migrateLocalPackagesToCloud(
  uid: string,
  localPackages: SavedPackage[]
): Promise<number> {
  let migratedCount = 0;
  for (const pkg of localPackages) {
    const docId = toFirestorePackageDocId(pkg.id);
    const path = `users/${uid}/packages/${docId}`;
    const ref = doc(db, 'users', uid, 'packages', docId);
    let snap;
    try {
      snap = await getDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    if (!snap.exists()) {
      await upsertCloudPackage(uid, pkg);
      migratedCount += 1;
    }
  }
  return migratedCount;
}
