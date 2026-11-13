import { Cloud, LogOut, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';

export function GoogleLogoIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.64Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.29V6.61H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4 3.1C6.23 6.87 8.88 4.76 12 4.76Z"
      />
    </svg>
  );
}

interface AuthAccountControlProps {
  onSignedOut?: () => void;
}

export function AuthAccountControl({ onSignedOut }: AuthAccountControlProps) {
  const { user, authReady, isSigningIn, signInWithGoogle, signOutUser } = useFirebaseAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setImgFailed(false);
  }, [user?.photoURL]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  if (!authReady) {
    return (
      <div
        aria-hidden="true"
        className="h-[40px] md:h-[38px] w-24 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"
      />
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        disabled={isSigningIn}
        className="min-h-[40px] md:min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-sky-500"
      >
        {isSigningIn ? (
          <Loader2 className="w-4 h-4 animate-spin text-sky-600 dark:text-sky-400" aria-hidden="true" />
        ) : (
          <GoogleLogoIcon className="w-4 h-4 shrink-0" />
        )}
        <span>{isSigningIn ? 'Masuk...' : 'Masuk'}</span>
      </button>
    );
  }

  const displayName = user.displayName || user.email || 'Akun Google';
  const firstName = displayName.split(' ')[0] || 'Akun';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`Menu akun ${displayName}`}
        className="min-h-[40px] md:min-h-[38px] pl-1.5 pr-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-sky-500"
      >
        {user.photoURL && !imgFailed ? (
          <img
            src={user.photoURL}
            alt={displayName}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-6 h-6 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-[11px] font-semibold inline-flex items-center justify-center shrink-0">
            {initials || 'U'}
          </span>
        )}
        <span className="hidden lg:inline text-xs font-medium max-w-[110px] truncate">
          {firstName}
        </span>
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-3 z-50 space-y-3"
        >
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {displayName}
            </p>
            {user.email && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            )}
          </div>

          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 text-xs text-sky-800 dark:text-sky-200">
            <Cloud className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            <span>Tersinkron ke Cloud Firestore</span>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setMenuOpen(false);
              await signOutUser();
              onSignedOut?.();
            }}
            className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 inline-flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      )}
    </div>
  );
}
