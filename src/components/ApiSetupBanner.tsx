import { KeyRound, X } from 'lucide-react';
import { useState } from 'react';

interface ApiSetupBannerProps {
  apiConfigured: boolean;
}

export function ApiSetupBanner({ apiConfigured }: ApiSetupBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  if (apiConfigured || dismissed) return null;

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-sm text-amber-950 dark:text-amber-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1.5">
            <p className="font-semibold">
              Konfigurasi API Key BinderByte Diperlukan untuk Pelacakan Langsung
            </p>
            <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
              Server belum mendeteksi environment variable <code className="font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60">BINDERBYTE_API_KEY</code>. Daftar ekspedisi tetap dapat dilihat, namun pelacakan resi membutuhkan API Key resmi dari BinderByte.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowGuide((prev) => !prev)}
                className="text-xs font-semibold text-amber-800 dark:text-amber-300 underline underline-offset-4 hover:text-amber-950 dark:hover:text-amber-100"
              >
                {showGuide ? 'Tutup panduan konfigurasi' : 'Lihat cara konfigurasi API Key'}
              </button>
            </div>
            {showGuide && (
              <ol className="mt-2 space-y-1.5 text-xs text-amber-900 dark:text-amber-200 list-decimal list-inside leading-relaxed">
                <li>
                  Buat akun &amp; salin API Key Anda di situs resmi <span className="font-medium">binderbyte.com</span>.
                </li>
                <li>
                  Tambahkan <code className="font-mono px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60">BINDERBYTE_API_KEY=api_key_anda</code> pada file <code className="font-mono">.env</code> di server atau melalui panel Secrets AI Studio.
                </li>
                <li>
                  Muat ulang server agar backend proxy dapat mengautentikasi permintaan ke BinderByte secara aman.
                </li>
              </ol>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Tutup pemberitahuan konfigurasi API"
          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40 shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
