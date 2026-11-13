import { ArrowRight, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CourierInfo } from '../../shared/types';

interface CourierDirectoryProps {
  couriers: CourierInfo[];
  source: 'live' | 'catalog';
  warning?: string;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectCourierToTrack: (courierCode: string) => void;
}

export function CourierDirectory({
  couriers,
  source,
  warning,
  isLoading,
  onRefresh,
  onSelectCourierToTrack,
}: CourierDirectoryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'other'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return couriers.filter((c) => {
      const matchesText =
        !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'online'
            ? c.status === 'online' || c.status === 'unknown'
            : c.status === 'offline' || c.status === 'maintenance';
      return matchesText && matchesStatus;
    });
  }, [couriers, search, statusFilter]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white text-balance">
            Daftar Ekspedisi Didukung
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Seluruh kode ekspedisi resmi dari endpoint <code className="font-mono text-xs">/v1/list_courier</code> BinderByte ({source === 'live' ? 'data langsung API' : 'katalog standar'}).
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1320] hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Perbarui Daftar</span>
        </button>
      </div>

      {warning && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
          {warning}
        </div>
      )}

      {/* Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau kode ekspedisi (contoh: jne, spx, sicepat)..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0D1320] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 self-start">
          {(
            [
              { id: 'all', label: `Semua (${couriers.length})` },
              { id: 'online', label: 'Online' },
              { id: 'other', label: 'Offline / Gangguan' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-[#0D1320] text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Kurir */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0D1320] p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Tidak ada ekspedisi yang cocok dengan pencarian Anda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => {
            const isOnline = c.status === 'online' || c.status === 'unknown';
            return (
              <div
                key={c.code}
                className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0D1320] p-4 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-slate-950 dark:text-white truncate">
                    {c.name}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono uppercase">{c.code}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        isOnline
                          ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                          : 'text-amber-700 dark:text-amber-400 font-medium'
                      }
                    >
                      {c.status === 'online'
                        ? 'Online'
                        : c.status === 'offline'
                          ? 'Offline'
                          : c.status === 'maintenance'
                            ? 'Pemeliharaan'
                            : 'Tersedia'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCourierToTrack(c.code)}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-950 text-slate-800 hover:text-white dark:bg-slate-800 dark:hover:bg-sky-500 dark:text-slate-200 dark:hover:text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                >
                  <span>Lacak</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
