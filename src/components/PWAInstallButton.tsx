import { Download, Share, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="min-h-[42px] px-3.5 py-2 rounded-xl border border-sky-200 dark:border-sky-800/70 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-sky-500"
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        <span>Instal Aplikasi</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
        >
          <Share className="w-4 h-4" aria-hidden="true" />
          <span>Instal di iOS</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h3 id="ios-install-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Instal di iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Tutup panduan instalasi"
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside leading-relaxed">
                <li>
                  Ketuk tombol <span className="font-semibold text-slate-900 dark:text-white">Bagikan (Share)</span> pada bilah alat Safari.
                </li>
                <li>
                  Gulir ke bawah dan pilih <span className="font-semibold text-slate-900 dark:text-white">Tambah ke Layar Utama</span>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[42px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
