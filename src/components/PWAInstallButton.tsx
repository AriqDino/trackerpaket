import { CheckCircle2, Download, Share, Smartphone, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

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

  const isSecure = typeof window !== 'undefined' && window.isSecureContext;
  const hasSw = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
      >
        {isIOS ? (
          <>
            <Share className="w-4 h-4" aria-hidden="true" />
            <span>Instal di iOS</span>
          </>
        ) : (
          <>
            <Smartphone className="w-4 h-4" aria-hidden="true" />
            <span>Pasang PWA</span>
          </>
        )}
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 id="pwa-install-guide-title" className="text-base font-bold text-slate-900 dark:text-white">
                {isIOS ? 'Instal LacakPaket di iPhone / iPad' : 'Pasang LacakPaket sebagai Aplikasi'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Tutup panduan instalasi"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside leading-relaxed">
                <li>
                  Buka aplikasi ini di browser <span className="font-semibold text-slate-900 dark:text-white">Safari</span>.
                </li>
                <li>
                  Ketuk tombol <span className="font-semibold text-slate-900 dark:text-white">Bagikan (Share)</span> pada bilah alat bawah/atas.
                </li>
                <li>
                  Gulir ke bawah dan pilih <span className="font-semibold text-slate-900 dark:text-white">Tambah ke Layar Utama</span>.
                </li>
              </ol>
            ) : isSecure ? (
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Browser mendukung instalasi PWA. Anda dapat memasangnya melalui:
                </p>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li>
                    <span className="font-semibold text-slate-900 dark:text-white">Chrome / Edge Desktop:</span> Klik ikon instalasi di sisi kanan address bar, atau menu <span className="font-medium">⋮ → Simpan dan bagikan → Instal LacakPaket</span>.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900 dark:text-white">Chrome Android:</span> Ketuk menu <span className="font-medium">⋮ → Tambahkan ke layar utama / Instal aplikasi</span>.
                  </li>
                </ul>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-amber-900 dark:text-amber-200 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 p-3.5 leading-relaxed">
                <p className="font-semibold">Koneksi Saat Ini Belum HTTPS</p>
                <p className="text-xs">
                  Browser hanya mengizinkan instalasi PWA penuh dan Service Worker di alamat <code className="font-mono">https://</code> (atau <code className="font-mono">localhost</code>). Aktifkan HTTPS di server Anda (misalnya memakai Caddy + <code className="font-mono">sslip.io</code> atau DuckDNS) agar tombol instal otomatis muncul.
                </p>
              </div>
            )}

            <div className="pt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSecure && hasSw ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} aria-hidden="true" />
              <span>
                {isSecure && hasSw
                  ? 'HTTPS & Service Worker aktif (siap diinstal)'
                  : 'Menunggu konteks aman HTTPS untuk aktivasi Service Worker'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
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
