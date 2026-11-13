import { Moon, Plus, Sun } from 'lucide-react';
import type { ThemeMode } from '../services/storageService';
import { AuthAccountControl } from './AuthAccountControl';

export type ActiveTab = 'dashboard' | 'track' | 'couriers';

interface HeaderNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenNewTrack: () => void;
  onSignedOut?: () => void;
}

export function HeaderNav({
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
  onOpenNewTrack,
  onSignedOut,
}: HeaderNavProps) {
  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'track', label: 'Lacak Paket' },
    { id: 'couriers', label: 'Daftar Ekspedisi' },
  ];

  return (
    <header className="sticky top-0 z-30 h-14 md:h-16 border-b border-slate-200/90 dark:border-slate-800/90 bg-white/85 dark:bg-[#060911]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Title */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 rounded-lg"
        >
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center shrink-0 shadow-xs">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden="true">
              <path
                d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M12 12L20 7.5M12 12V21M12 12L4 7.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            LacakPaket
          </span>
        </button>

        {/* Zone 2: Desktop Single-Line Navigation Links */}
        <nav aria-label="Navigasi utama" className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-500 ${
                  isActive
                    ? 'text-slate-950 dark:text-white font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[17px] h-0.5 bg-sky-600 dark:bg-sky-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Auth + Theme Switch + Primary Action */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <AuthAccountControl onSignedOut={onSignedOut} />

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            className="min-h-[40px] min-w-[40px] md:min-h-[38px] md:min-w-[38px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-[#0D1320] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-sky-500"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenNewTrack}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-slate-950 hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Lacak Resi</span>
          </button>
        </div>
      </div>
    </header>
  );
}
