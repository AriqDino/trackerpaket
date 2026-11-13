import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly } from 'workbox-strategies';
import {
  BACKGROUND_SYNC_INTERVAL_MS,
  BROADCAST_CHANNEL_NAME,
  ONESHOT_SYNC_TAG,
  PERIODIC_SYNC_TAG,
  idbGetAllPackages,
  idbGetMeta,
  idbPutPackage,
  idbSetMeta,
  type BackgroundSyncMeta,
  type BackgroundSyncRunResult,
  type BackgroundSyncSettings,
  type BackgroundSyncStatusChange,
} from '../shared/backgroundSync';
import type { NormalizedTrackingResult, PackageStatus, SavedPackage } from '../shared/types';

interface SwExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface SwPeriodicSyncEvent extends SwExtendableEvent {
  readonly tag: string;
}

interface SwSyncEvent extends SwExtendableEvent {
  readonly tag: string;
}

interface SwMessageEvent extends SwExtendableEvent {
  readonly data: unknown;
}

interface SwNotificationEvent extends SwExtendableEvent {
  readonly notification: Notification;
}

interface SwClient {
  url: string;
  postMessage(message: unknown): void;
  focus?: () => Promise<SwClient>;
}

interface SwGlobalScope {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>;
  skipWaiting(): Promise<void>;
  clients: {
    matchAll(options?: { type?: 'window' | 'worker' | 'sharedworker' | 'all'; includeUncontrolled?: boolean }): Promise<SwClient[]>;
    openWindow(url: string): Promise<SwClient | null>;
  };
  registration: ServiceWorkerRegistration;
  addEventListener(type: 'periodicsync', listener: (event: SwPeriodicSyncEvent) => void): void;
  addEventListener(type: 'sync', listener: (event: SwSyncEvent) => void): void;
  addEventListener(type: 'message', listener: (event: SwMessageEvent) => void): void;
  addEventListener(type: 'notificationclick', listener: (event: SwNotificationEvent) => void): void;
  addEventListener(type: string, listener: (event: Event) => void): void;
}

declare const self: SwGlobalScope;

const swManifest = self.__WB_MANIFEST || [];
precacheAndRoute(swManifest);
cleanupOutdatedCaches();
clientsClaim();
void self.skipWaiting();

// Pastikan /api/* selalu langsung ke server (tidak pernah cache offline stale)
registerRoute(/^\/api\/.*/i, new NetworkOnly());

// Cache font Google Fonts
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

const hasPrecachedIndex = swManifest.some((entry) =>
  typeof entry === 'string' ? entry.endsWith('index.html') : entry.url.endsWith('index.html')
);

if (hasPrecachedIndex) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
      denylist: [/^\/api\//],
    })
  );
}

const STATUS_LABELS: Record<PackageStatus, string> = {
  waiting: 'Menunggu',
  in_transit: 'Dalam Pengiriman',
  delivered: 'Diterima',
  issue: 'Bermasalah',
};

let activeSyncPromise: Promise<BackgroundSyncRunResult> | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function notifyClients(payload: {
  type: 'BACKGROUND_SYNC_COMPLETE';
  result: BackgroundSyncRunResult;
  packages: SavedPackage[];
}): Promise<void> {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // Abaikan jika BroadcastChannel tidak didukung
  }

  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage(payload);
    }
  } catch {
    // Abaikan error client messaging
  }
}

async function runBackgroundPackageRefresh(options: {
  force: boolean;
  source: BackgroundSyncRunResult['source'];
}): Promise<BackgroundSyncRunResult> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    const settings = (await idbGetMeta<BackgroundSyncSettings>('settings')) ?? {
      enabled: true,
      notifyOnChange: false,
    };

    const allPackages = await idbGetAllPackages();
    const activePackages = allPackages.filter((pkg) => pkg.normalizedStatus !== 'delivered');

    if (!options.force && !settings.enabled) {
      return {
        source: options.source,
        totalActive: activePackages.length,
        updated: 0,
        skipped: activePackages.length,
        failed: 0,
        statusChanges: [],
        completedAt: new Date().toISOString(),
      };
    }

    // Cooldown 5.5 jam agar pemicu berdekatan tidak memboroskan kuota API BinderByte
    const minAgeBeforeAutoRefreshMs = BACKGROUND_SYNC_INTERVAL_MS - 30 * 60 * 1000;
    const nowMs = Date.now();

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const statusChanges: BackgroundSyncStatusChange[] = [];
    const updatedMap = new Map<string, SavedPackage>();

    for (let i = 0; i < activePackages.length; i++) {
      const pkg = activePackages[i];

      if (!options.force && pkg.updatedAt) {
        const lastUpdatedMs = Date.parse(pkg.updatedAt);
        if (!Number.isNaN(lastUpdatedMs) && nowMs - lastUpdatedMs < minAgeBeforeAutoRefreshMs) {
          skipped += 1;
          continue;
        }
      }

      try {
        const query = new URLSearchParams({
          awb: pkg.awb,
          courier: pkg.courierCode,
          refresh: 'true',
        });
        if (pkg.phoneLast5) query.set('number', pkg.phoneLast5);
        if (pkg.transactionDate) query.set('date', pkg.transactionDate);

        const response = await fetch(`/api/track?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          failed += 1;
          // Hentikan loop lebih awal jika rate-limit atau kuota API habis
          if (response.status === 402 || response.status === 429 || response.status === 401) {
            break;
          }
          continue;
        }

        const freshTracking = (await response.json()) as NormalizedTrackingResult;
        const previousStatus = pkg.normalizedStatus;
        const nextPkg: SavedPackage = {
          ...pkg,
          courierCode: freshTracking.courierCode,
          courierName: freshTracking.courierName,
          normalizedStatus: freshTracking.normalizedStatus,
          tracking: freshTracking,
          updatedAt: new Date().toISOString(),
        };

        await idbPutPackage(nextPkg);
        updatedMap.set(nextPkg.id, nextPkg);
        updated += 1;

        if (previousStatus !== freshTracking.normalizedStatus) {
          statusChanges.push({
            id: pkg.id,
            label: pkg.label,
            awb: pkg.awb,
            courierName: freshTracking.courierName,
            from: previousStatus,
            to: freshTracking.normalizedStatus,
          });
        }

        // Jeda ringan antar request agar tidak memicu rate-limit API
        if (i < activePackages.length - 1) {
          await delay(350);
        }
      } catch {
        failed += 1;
      }
    }

    const completedAt = new Date().toISOString();
    const result: BackgroundSyncRunResult = {
      source: options.source,
      totalActive: activePackages.length,
      updated,
      skipped,
      failed,
      statusChanges,
      completedAt,
    };

    const meta: BackgroundSyncMeta = {
      lastSyncAt: completedAt,
      lastRunResult: result,
    };
    await idbSetMeta('lastSync', meta);

    const latestPackages = allPackages.map((pkg) => updatedMap.get(pkg.id) ?? pkg);
    await notifyClients({
      type: 'BACKGROUND_SYNC_COMPLETE',
      result,
      packages: latestPackages,
    });

    if (
      settings.notifyOnChange &&
      statusChanges.length > 0 &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      const first = statusChanges[0];
      const title =
        statusChanges.length === 1
          ? `Pembaruan Paket: ${first.label}`
          : `${statusChanges.length} Paket Mengalami Perubahan Status`;
      const body =
        statusChanges.length === 1
          ? `${first.courierName} (${first.awb}) kini berstatus ${STATUS_LABELS[first.to]}.`
          : statusChanges
              .slice(0, 3)
              .map((c) => `${c.label}: ${STATUS_LABELS[c.to]}`)
              .join(' · ');

      await self.registration.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'mpt-status-update',
      });
    }

    return result;
  })();

  try {
    return await activeSyncPromise;
  } finally {
    activeSyncPromise = null;
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(
      runBackgroundPackageRefresh({
        force: false,
        source: 'periodic-sync',
      })
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === ONESHOT_SYNC_TAG) {
    event.waitUntil(
      runBackgroundPackageRefresh({
        force: false,
        source: 'oneshot-sync',
      })
    );
  }
});

self.addEventListener('message', (event) => {
  const data = event.data as { type?: string; force?: boolean } | null;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
    return;
  }

  if (data.type === 'RUN_BACKGROUND_SYNC') {
    event.waitUntil(
      runBackgroundPackageRefresh({
        force: Boolean(data.force),
        source: 'manual-or-timer',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.focus) {
          return client.focus();
        }
      }
      return self.clients.openWindow('/');
    })
  );
});
