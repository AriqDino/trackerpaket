import { AlertTriangle, CheckCircle2, Clock, Package, Truck } from 'lucide-react';
import type { PackageStatus, SavedPackage } from '../../shared/types';

export type StatusFilter = 'all' | PackageStatus;

interface SummaryStatsProps {
  packages: SavedPackage[];
  activeFilter: StatusFilter;
  onSelectFilter: (filter: StatusFilter) => void;
}

export function SummaryStats({ packages, activeFilter, onSelectFilter }: SummaryStatsProps) {
  const total = packages.length;
  const counts = {
    all: total,
    waiting: packages.filter((p) => p.normalizedStatus === 'waiting').length,
    in_transit: packages.filter((p) => p.normalizedStatus === 'in_transit').length,
    delivered: packages.filter((p) => p.normalizedStatus === 'delivered').length,
    issue: packages.filter((p) => p.normalizedStatus === 'issue').length,
  };

  const cards: Array<{
    key: StatusFilter;
    label: string;
    count: number;
    icon: typeof Package;
    iconColor: string;
    barColor: string;
  }> = [
    {
      key: 'all',
      label: 'Total Resi',
      count: counts.all,
      icon: Package,
      iconColor: 'text-slate-600 dark:text-slate-300',
      barColor: 'bg-slate-800 dark:bg-slate-200',
    },
    {
      key: 'in_transit',
      label: 'Dalam Pengiriman',
      count: counts.in_transit,
      icon: Truck,
      iconColor: 'text-sky-600 dark:text-sky-400',
      barColor: 'bg-sky-500 dark:bg-sky-400',
    },
    {
      key: 'waiting',
      label: 'Menunggu Pickup',
      count: counts.waiting,
      icon: Clock,
      iconColor: 'text-amber-600 dark:text-amber-400',
      barColor: 'bg-amber-500 dark:bg-amber-400',
    },
    {
      key: 'delivered',
      label: 'Sudah Diterima',
      count: counts.delivered,
      icon: CheckCircle2,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      barColor: 'bg-emerald-500 dark:bg-emerald-400',
    },
    {
      key: 'issue',
      label: 'Perlu Perhatian',
      count: counts.issue,
      icon: AlertTriangle,
      iconColor: 'text-rose-600 dark:text-rose-400',
      barColor: 'bg-rose-500 dark:bg-rose-400',
    },
  ];

  return (
    <section
      aria-label="Ringkasan jumlah paket"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter === card.key;
        const pct = total > 0 ? Math.round((card.count / total) * 100) : 0;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelectFilter(card.key)}
            className={`group text-left p-4 rounded-2xl border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-sky-500 flex flex-col justify-between gap-3 ${
              isSelected
                ? 'bg-slate-950 border-slate-950 text-white dark:bg-sky-500/15 dark:border-sky-400/80 dark:text-white shadow-sm'
                : 'bg-white border-slate-200/90 hover:border-slate-300 dark:bg-[#0D1320] dark:border-slate-800/90 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <span
                className={`text-xs font-medium truncate ${
                  isSelected
                    ? 'text-slate-300 dark:text-sky-200'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {card.label}
              </span>
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isSelected ? 'text-sky-400 dark:text-sky-300' : card.iconColor
                }`}
                aria-hidden="true"
              />
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`font-display text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${
                  isSelected ? 'text-white' : 'text-slate-950 dark:text-white'
                }`}
              >
                {card.count}
              </span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  isSelected
                    ? 'text-slate-400 dark:text-sky-200/80'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {pct}%
              </span>
            </div>

            <div
              aria-hidden="true"
              className={`w-full h-1 rounded-full overflow-hidden ${
                isSelected ? 'bg-white/15 dark:bg-sky-950/60' : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isSelected ? 'bg-sky-400' : card.barColor
                }`}
                style={{ width: `${card.count > 0 ? Math.max(pct, 8) : 0}%` }}
              />
            </div>
          </button>
        );
      })}
    </section>
  );
}
