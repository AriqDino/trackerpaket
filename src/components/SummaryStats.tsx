import { AlertTriangle, CheckCircle2, Clock, Package, Truck } from 'lucide-react';
import type { PackageStatus, SavedPackage } from '../../shared/types';

export type StatusFilter = 'all' | PackageStatus;

interface SummaryStatsProps {
  packages: SavedPackage[];
  activeFilter: StatusFilter;
  onSelectFilter: (filter: StatusFilter) => void;
}

export function SummaryStats({ packages, activeFilter, onSelectFilter }: SummaryStatsProps) {
  const counts = {
    all: packages.length,
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
  }> = [
    {
      key: 'all',
      label: 'Total Paket',
      count: counts.all,
      icon: Package,
      iconColor: 'text-slate-600 dark:text-slate-300',
    },
    {
      key: 'in_transit',
      label: 'Dalam Pengiriman',
      count: counts.in_transit,
      icon: Truck,
      iconColor: 'text-sky-600 dark:text-sky-400',
    },
    {
      key: 'waiting',
      label: 'Menunggu',
      count: counts.waiting,
      icon: Clock,
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      key: 'delivered',
      label: 'Diterima',
      count: counts.delivered,
      icon: CheckCircle2,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'issue',
      label: 'Bermasalah',
      count: counts.issue,
      icon: AlertTriangle,
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <section aria-label="Ringkasan jumlah paket" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter === card.key;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelectFilter(card.key)}
            className={`text-left p-4 rounded-xl border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-sky-500 ${
              isSelected
                ? 'bg-sky-50/70 border-sky-400 dark:bg-sky-950/30 dark:border-sky-500/70'
                : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                {card.label}
              </span>
              <Icon className={`w-4 h-4 shrink-0 ${card.iconColor}`} aria-hidden="true" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {card.count}
            </div>
          </button>
        );
      })}
    </section>
  );
}
