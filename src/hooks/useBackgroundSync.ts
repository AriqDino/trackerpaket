import { useCallback, useEffect, useState } from 'react';
import {
  BACKGROUND_SYNC_INTERVAL_MS,
  BROADCAST_CHANNEL_NAME,
  ONESHOT_SYNC_TAG,
  PERIODIC_SYNC_TAG,
  idbGetMeta,
  idbSetMeta,
  type BackgroundSyncMeta,
  type BackgroundSyncRunResult,
  type BackgroundSyncSettings,
} from '../../shared/backgroundSync';
import type { SavedPackage } from '../../shared/types';
import { applyPackagesFromServiceWorker, syncPackagesWithIndexedDb } from '../services/storageService';

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval?: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface SyncManager {
  register(tag: string): Promise<void>;
}

interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  periodicSync?: PeriodicSyncManager;
  sync?: SyncManager;
}

const SETTINGS_LS_KEY = 'mpt_bg_sync_settings_v1';

function loadLocalSettings(): BackgroundSyncSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BackgroundSyncSettings>;
      return {
        enabled: parsed.enabled !== false,
        notifyOnChange: Boolean(parsed.notifyOnChange),
      };
    }
  } catch {
    // ignore
  }
  return { enabled: true, notifyOnChange: false };
}

export function useBackgroundSync(options: {
  activePackageCount: number;
  onPackagesUpdated: (packages: SavedPackage[], result: BackgroundSyncRunResult) => void;
  onSettingsChanged?: (settings: BackgroundSyncSettings) => void;
}) {
  const { activePackageCount, onPackagesUpdated, onSettingsChanged } = options;

  const [settings, setSettings] = useState<BackgroundSyncSettings>(() => loadLocalSettings());
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastRunResult, setLastRunResult] = useState<BackgroundSyncRunResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [periodicSupported, setPeriodicSupported] = useState(false);
  const [periodicRegistered, setPeriodicRegistered] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const registerOrUnregisterPeriodicSync = useCallback(async (enabled: boolean) => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = (await navigator.serviceWorker.ready) as ExtendedServiceWorkerRegistration;
      const hasPeriodic = Boolean(reg.periodicSync);
      setPeriodicSupported(hasPeriodic);

      if (!reg.periodicSync) {
        setPeriodicRegistered(false);
        return;
      }

      if (!enabled) {
        const tags = await reg.periodicSync.getTags();
        if (tags.includes(PERIODIC_SYNC_TAG)) {
          await reg.periodicSync.unregister(PERIODIC_SYNC_TAG);
        }
        setPeriodicRegistered(false);
        return;
      }

      // Cek izin periodic-background-sync jika Permissions API mendukung
      let granted = true;
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const perm = await navigator.permissions.query({
            name: 'periodic-background-sync' as PermissionName,
          });
          granted = perm.state === 'granted';
        } catch {
          // Beberapa browser mendukung periodicSync tanpa descriptor permission ini
        }
      }

      if (granted) {
        await reg.periodicSync.register(PERIODIC_SYNC_TAG, {
          minInterval: BACKGROUND_SYNC_INTERVAL_MS,
        });
        const tags = await reg.periodicSync.getTags();
        setPeriodicRegistered(tags.includes(PERIODIC_SYNC_TAG));
      } else {
        setPeriodicRegistered(false);
      }
    } catch {
      setPeriodicRegistered(false);
    }
  }, []);

  const triggerServiceWorkerSync = useCallback(async (force: boolean) => {
    if (!('serviceWorker' in navigator)) return false;

    setIsSyncing(true);
    try {
      const reg = (await navigator.serviceWorker.ready) as ExtendedServiceWorkerRegistration;
      const worker = reg.active || navigator.serviceWorker.controller;

      if (worker) {
        worker.postMessage({ type: 'RUN_BACKGROUND_SYNC', force });
        // Timeout pengaman jika SW tidak membalas dalam 30 detik
        setTimeout(() => setIsSyncing(false), 30000);
        return true;
      }

      if (reg.sync) {
        await reg.sync.register(ONESHOT_SYNC_TAG);
        return true;
      }
    } catch {
      setIsSyncing(false);
    }
    setIsSyncing(false);
    return false;
  }, []);

  // Inisialisasi metadata IndexedDB, sinkronisasi awal IDB <-> localStorage, dan registrasi periodicSync
  useEffect(() => {
    let mounted = true;

    async function init() {
      await idbSetMeta('settings', settings);
      const merged = await syncPackagesWithIndexedDb();
      const meta = await idbGetMeta<BackgroundSyncMeta>('lastSync');

      if (!mounted) return;
      if (meta) {
        setLastSyncAt(meta.lastSyncAt);
        setLastRunResult(meta.lastRunResult);
        if (meta.lastRunResult && merged.length > 0) {
          onPackagesUpdated(merged, meta.lastRunResult);
        }
      }

      await registerOrUnregisterPeriodicSync(settings.enabled);
    }

    void init();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dengarkan hasil background sync dari Service Worker (BroadcastChannel + SW message)
  useEffect(() => {
    const handleSyncPayload = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const msg = payload as {
        type?: string;
        result?: BackgroundSyncRunResult;
        packages?: SavedPackage[];
      };
      if (msg.type !== 'BACKGROUND_SYNC_COMPLETE' || !msg.result || !Array.isArray(msg.packages)) {
        return;
      }

      const merged = applyPackagesFromServiceWorker(msg.packages);
      setLastSyncAt(msg.result.completedAt);
      setLastRunResult(msg.result);
      setIsSyncing(false);
      onPackagesUpdated(merged, msg.result);
    };

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => handleSyncPayload(event.data);
    }

    const onSwMessage = (event: MessageEvent) => handleSyncPayload(event.data);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }

    return () => {
      channel?.close();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
    };
  }, [onPackagesUpdated]);

  // Fallback timer & visibility check setiap 6 jam saat tab/app kembali aktif atau tetap terbuka
  useEffect(() => {
    if (!settings.enabled || activePackageCount === 0) return;

    const checkDueAndTrigger = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const meta = await idbGetMeta<BackgroundSyncMeta>('lastSync');
      const lastMs = meta?.lastSyncAt ? Date.parse(meta.lastSyncAt) : 0;
      const due = !lastMs || Number.isNaN(lastMs) || Date.now() - lastMs >= BACKGROUND_SYNC_INTERVAL_MS;
      if (due) {
        await triggerServiceWorkerSync(false);
      } else {
        // Pastikan update SW saat tab tertutup langsung tersinkron ke UI
        const merged = await syncPackagesWithIndexedDb();
        if (meta?.lastRunResult) {
          setLastSyncAt(meta.lastSyncAt);
          setLastRunResult(meta.lastRunResult);
          onPackagesUpdated(merged, meta.lastRunResult);
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void checkDueAndTrigger();
    }, 15 * 60 * 1000);

    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === 'visible') {
        void checkDueAndTrigger();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    window.addEventListener('online', handleVisibilityOrOnline);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      window.removeEventListener('online', handleVisibilityOrOnline);
    };
  }, [settings.enabled, activePackageCount, triggerServiceWorkerSync, onPackagesUpdated]);

  const applyCloudSettings = useCallback(
    async (cloudSettings: BackgroundSyncSettings) => {
      setSettings(cloudSettings);
      try {
        localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(cloudSettings));
      } catch {
        // ignore
      }
      await idbSetMeta('settings', cloudSettings);
      await registerOrUnregisterPeriodicSync(cloudSettings.enabled);
    },
    [registerOrUnregisterPeriodicSync]
  );

  const toggleAutoSync = async (enabled: boolean) => {
    const next: BackgroundSyncSettings = { ...settings, enabled };
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    await idbSetMeta('settings', next);
    await registerOrUnregisterPeriodicSync(enabled);
    onSettingsChanged?.(next);
  };

  const toggleNotifications = async (enable: boolean) => {
    let allow = enable;
    if (enable && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      allow = result === 'granted';
    }
    const next: BackgroundSyncSettings = { ...settings, notifyOnChange: allow };
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    await idbSetMeta('settings', next);
    onSettingsChanged?.(next);
  };

  const syncNow = () => triggerServiceWorkerSync(true);

  return {
    settings,
    lastSyncAt,
    lastRunResult,
    isSyncing,
    periodicSupported,
    periodicRegistered,
    notificationPermission,
    toggleAutoSync,
    toggleNotifications,
    applyCloudSettings,
    syncNow,
  };
}
