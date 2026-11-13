import { Cloud, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { GoogleLogoIcon } from './AuthAccountControl';

interface CloudSyncBannerProps {
  localPackageCount: number;
}

export function CloudSyncBanner({ localPackageCount }: CloudSyncBannerProps) {
  const { user, authReady, isSigningIn, signInWithGoogle } = useFirebaseAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!authReady || user || dismissed) {
    return null;
  }

  return (
    <section
      aria-label="Sinkronisasi Cloud Akun Google"
      className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0D1320] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
          <Cloud className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
            Simpan &amp; Sinkronkan Paket Antar Perangkat
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {localPackageCount > 0
              ? `Masuk dengan Google agar ${localPackageCount} resi yang tersimpan di perangkat ini otomatis dicadangkan ke Cloud Firestore.`
              : 'Masuk dengan Google untuk mencadangkan daftar resi Anda ke Cloud Firestore dan membukanya dari perangkat mana saja.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={isSigningIn}
          className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-60 transition-colors"
        >
          {isSigningIn ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-600 dark:text-sky-400" aria-hidden="true" />
          ) : (
            <GoogleLogoIcon className="w-4 h-4 shrink-0" />
          )}
          <span>{isSigningIn ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Tutup banner sinkronisasi cloud"
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
