import { Bell, BellOff, Clock, RefreshCw } from 'lucide-react';
import type { BackgroundSyncRunResult, BackgroundSyncSettings } from '../../shared/backgroundSync';
import { formatRelativeTimeId } from '../utils/statusConfig';

interface BackgroundSyncPanelProps {
  settings: BackgroundSyncSettings;
  activePackageCount: number;
  lastSyncAt: string | null;
  lastRunResult: BackgroundSyncRunResult | null;
  isSyncing: boolean;
  periodicSupported: boolean;
  periodicRegistered: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  onToggleAutoSync: (enabled: boolean) => void;
  onToggleNotifications: (enabled: boolean) => void;
  onSyncNow: () => void;
}

export function BackgroundSyncPanel({
  settings,
  activePackageCount,
  lastSyncAt,
  lastRunResult,
  isSyncing,
  periodicSupported,
  periodicRegistered,
  notificationPermission,
  onToggleAutoSync,
  onToggleNotifications,
  onSyncNow,
}: BackgroundSyncPanelProps) {
  const modeLabel = periodicRegistered
    ? 'Periodic Background Sync aktif (6 jam)'
    : periodicSupported
      ? 'Sinkronisasi otomatis 6 jam (menunggu izin PWA terinstal)'
      : 'Sinkronisasi otomatis 6 jam via Service Worker saat aplikasi dibuka / online';

  return (
    <section
      aria-label="Pengaturan sinkronisasi latar belakang"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
    >
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Sinkronisasi Otomatis (Setiap 6 Jam)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            · {activePackageCount} paket belum diterima
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {settings.enabled ? modeLabel : 'Sinkronisasi otomatis latar belakang dinonaktifkan.'}
          {lastSyncAt && (
            <>
              {' · '}
              <span className="tabular-nums">
                Terakhir disinkronkan {formatRelativeTimeId(lastSyncAt)}
              </span>
              {lastRunResult && lastRunResult.updated > 0 && (
                <span> ({lastRunResult.updated} paket diperbarui)</span>
              )}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {/* Toggle Auto Sync */}
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          onClick={() => onToggleAutoSync(!settings.enabled)}
          className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
            settings.enabled
              ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-200'
              : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <span>{settings.enabled ? 'Otomatis: Aktif' : 'Otomatis: Nonaktif'}</span>
        </button>

        {/* Toggle Notifikasi Perubahan Status */}
        {notificationPermission !== 'unsupported' && (
          <button
            type="button"
            onClick={() => onToggleNotifications(!settings.notifyOnChange)}
            title={
              notificationPermission === 'denied'
                ? 'Izin notifikasi diblokir browser'
                : 'Aktifkan notifikasi jika status paket berubah'
            }
            disabled={notificationPermission === 'denied'}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-50 ${
              settings.notifyOnChange
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {settings.notifyOnChange ? (
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <BellOff className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{settings.notifyOnChange ? 'Notifikasi: Aktif' : 'Notifikasi'}</span>
          </button>
        )}

        {/* Tombol Sinkronisasi Latar Belakang Sekarang */}
        <button
          type="button"
          onClick={onSyncNow}
          disabled={isSyncing || activePackageCount === 0}
          className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan SW'}</span>
        </button>
      </div>
    </section>
  );
}
