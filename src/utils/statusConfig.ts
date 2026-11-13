import type { PackageStatus } from '../../shared/types';

export interface StatusDisplayMeta {
  key: PackageStatus;
  label: string;
  shortDesc: string;
  badgeClasses: string;
  accentTextClasses: string;
  iconBgClasses: string;
}

export const PACKAGE_STATUS_META: Record<PackageStatus, StatusDisplayMeta> = {
  waiting: {
    key: 'waiting',
    label: 'Menunggu',
    shortDesc: 'Menunggu penjemputan atau manifest kurir',
    badgeClasses:
      'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
    accentTextClasses: 'text-amber-700 dark:text-amber-300',
    iconBgClasses: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  },
  in_transit: {
    key: 'in_transit',
    label: 'Dalam Pengiriman',
    shortDesc: 'Paket sedang dalam perjalanan menuju tujuan',
    badgeClasses:
      'bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/70',
    accentTextClasses: 'text-sky-700 dark:text-sky-300',
    iconBgClasses: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300',
  },
  delivered: {
    key: 'delivered',
    label: 'Diterima',
    shortDesc: 'Paket telah tiba dan diterima tujuan',
    badgeClasses:
      'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
    accentTextClasses: 'text-emerald-700 dark:text-emerald-300',
    iconBgClasses: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
  },
  issue: {
    key: 'issue',
    label: 'Bermasalah',
    shortDesc: 'Terdapat kendala pengiriman atau pengembalian',
    badgeClasses:
      'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/70',
    accentTextClasses: 'text-rose-700 dark:text-rose-300',
    iconBgClasses: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
  },
};

export function formatDateTimeId(raw?: string | null): string {
  if (!raw || !raw.trim()) return '-';
  const normalized = raw.trim().replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return raw.trim();
  }
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

export function formatRelativeTimeId(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '-';
  const diffSec = Math.floor((Date.now() - parsed.getTime()) / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari lalu`;
}
