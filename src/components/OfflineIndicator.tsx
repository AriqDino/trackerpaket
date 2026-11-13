import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 md:bottom-4 left-4 right-4 sm:right-auto z-50 inline-flex items-center gap-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/90 px-3.5 py-2 text-xs font-medium text-amber-900 dark:text-amber-100 shadow-lg"
    >
      <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
      <span>Mode Offline — Data paket tersimpan tetap tersedia.</span>
    </div>
  );
}
