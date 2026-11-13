import { RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function PWAUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const onSwUpdateReady = () => setUpdateAvailable(true);
    window.addEventListener('mpt:pwa-update-ready', onSwUpdateReady);
    return () => {
      window.removeEventListener('mpt:pwa-update-ready', onSwUpdateReady);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 md:bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-50 rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 shadow-lg p-3.5 flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-900 dark:text-white">
          Pembaruan Aplikasi Tersedia
        </p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          Muat ulang untuk memakai versi LacakPaket terbaru.
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-[34px] px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Muat Ulang</span>
        </button>
        <button
          type="button"
          onClick={() => setUpdateAvailable(false)}
          aria-label="Tutup pemberitahuan pembaruan"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
