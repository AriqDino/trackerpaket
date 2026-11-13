import { Compass, LayoutGrid, Search } from 'lucide-react';
import type { ActiveTab } from './HeaderNav';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  savedCount: number;
}

export function MobileBottomNav({ activeTab, onSelectTab, savedCount }: MobileBottomNavProps) {
  const items: Array<{ id: ActiveTab; label: string; icon: typeof LayoutGrid; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, badge: savedCount },
    { id: 'track', label: 'Lacak Resi', icon: Search },
    { id: 'couriers', label: 'Ekspedisi', icon: Compass },
  ];

  return (
    <nav
      aria-label="Navigasi seluler"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B111E]/95 backdrop-blur-md"
    >
      <div className="grid grid-cols-3 h-14 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span className="relative inline-flex items-center justify-center">
                <Icon className="w-5 h-5" aria-hidden="true" />
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="ml-1 text-[10px] font-semibold tabular-nums">
                    ({item.badge})
                  </span>
                )}
              </span>
              <span className="text-[11px] font-medium leading-none whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
