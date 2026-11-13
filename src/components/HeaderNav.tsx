import { Moon, Package, Plus, Sun } from 'lucide-react';
import type { ThemeMode } from '../services/storageService';

export type ActiveTab = 'dashboard' | 'track' | 'couriers';

interface HeaderNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenNewTrack: () => void;
}

export function HeaderNav({
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
  onOpenNewTrack,
}: HeaderNavProps) {
  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'track', label: 'Lacak Paket' },
    { id: 'couriers', label: 'Daftar Ekspedisi' },
  ];

  return (
    <header className="sticky top-0 z-30 h-14 md:h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0B111E]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 rounded-md"
        >
          <span className="w-8 h-8 rounded-lg bg-sky-600 dark:bg-sky-500 text-white flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            My Package Tracker
          </span>
        </button>

        {/* Zone 2: Desktop Single-Line Navigation Links */}
        <nav aria-label="Navigasi utama" className="hidden md:flex items-center gap-7">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-500 ${
                  isActive
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
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

        {/* Zone 3: Primary Action + Theme Switch */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            className="min-h-[40px] min-w-[40px] md:min-h-[38px] md:min-w-[38px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-sky-500"
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
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Lacak Resi</span>
          </button>
        </div>
      </div>
    </header>
  );
}
