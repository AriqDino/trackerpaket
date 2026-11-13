import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  Copy,
  MapPin,
  Pencil,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SavedPackage } from '../../shared/types';
import { formatDateTimeId, formatRelativeTimeId } from '../utils/statusConfig';
import { StatusBadge } from './StatusBadge';

interface PackageDetailViewProps {
  pkg: SavedPackage;
  isRefreshing: boolean;
  onBackMobile?: () => void;
  onRefresh: (pkg: SavedPackage) => void;
  onRetrack: (pkg: SavedPackage) => void;
  onRename: (id: string, newLabel: string) => void;
  onDelete: (id: string) => void;
}

export function PackageDetailView({
  pkg,
  isRefreshing,
  onBackMobile,
  onRefresh,
  onRetrack,
  onRename,
  onDelete,
}: PackageDetailViewProps) {
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [draftLabel, setDraftLabel] = useState(pkg.label);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const orderedHistory = useMemo(() => {
    const list = [...pkg.tracking.history];
    return sortOrder === 'oldest' ? list.reverse() : list;
  }, [pkg.tracking.history, sortOrder]);

  const handleCopyAwb = async () => {
    try {
      await navigator.clipboard.writeText(pkg.awb);
      setCopiedAwb(true);
      setTimeout(() => setCopiedAwb(false), 1800);
    } catch {
      // Abaikan jika clipboard diblokir
    }
  };

  const { summary, detail } = pkg.tracking;

  const infoRows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'Pengirim', value: detail.shipper || '-' },
    { label: 'Penerima', value: detail.receiver || '-' },
    { label: 'Kota Asal', value: detail.origin || '-' },
    { label: 'Kota Tujuan', value: detail.destination || '-' },
    {
      label: 'Ekspedisi & Layanan',
      value: [pkg.courierName, summary.service].filter(Boolean).join(' · ') || '-',
    },
    {
      label: 'Berat & Ongkos Kirim',
      value: [summary.weight, summary.amount ? `Rp ${summary.amount}` : ''].filter(Boolean).join(' · ') || '-',
    },
    {
      label: 'Tanggal Pengiriman',
      value: summary.date ? formatDateTimeId(summary.date) : '-',
      mono: true,
    },
    {
      label: 'Estimasi Tiba',
      value: pkg.tracking.estimatedArrival
        ? formatDateTimeId(pkg.tracking.estimatedArrival)
        : 'Tidak tersedia dari ekspedisi',
    },
  ];

  return (
    <section
      aria-label="Detail pelacakan paket"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
    >
      {/* Mobile Back Bar */}
      {onBackMobile && (
        <div className="lg:hidden px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackMobile}
            className="min-h-[40px] inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Kembali ke Daftar</span>
          </button>
        </div>
      )}

      {/* Header Paket */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            {isEditingLabel ? (
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onRename(pkg.id, draftLabel);
                      setIsEditingLabel(false);
                    }
                    if (e.key === 'Escape') {
                      setDraftLabel(pkg.label);
                      setIsEditingLabel(false);
                    }
                  }}
                  maxLength={60}
                  autoFocus
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-sky-400 bg-white dark:bg-slate-950 text-base font-bold text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    onRename(pkg.id, draftLabel);
                    setIsEditingLabel(false);
                  }}
                  aria-label="Simpan nama paket"
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-sky-600 text-white"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftLabel(pkg.label);
                    setIsEditingLabel(false);
                  }}
                  aria-label="Batal"
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  {pkg.label}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setDraftLabel(pkg.label);
                    setIsEditingLabel(true);
                  }}
                  aria-label="Ubah nama paket"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">{pkg.courierName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{pkg.awb}</span>
              <button
                type="button"
                onClick={handleCopyAwb}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors"
              >
                {copiedAwb ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Salin Resi</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <StatusBadge status={pkg.normalizedStatus} size="md" />
        </div>

        {/* Status Terkini + Aksi */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
            <p>
              Status ekspedisi: <span className="font-medium text-slate-800 dark:text-slate-200">{pkg.tracking.rawStatus || '-'}</span>
            </p>
            <p className="tabular-nums">
              Diperbarui {formatRelativeTimeId(pkg.updatedAt)} · {pkg.tracking.cached ? 'Dari cache server' : 'Data langsung BinderByte'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onRefresh(pkg)}
              disabled={isRefreshing}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{isRefreshing ? 'Memperbarui...' : 'Refresh Status'}</span>
            </button>

            <button
              type="button"
              onClick={() => onRetrack(pkg)}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Lacak Ulang</span>
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false);
                    onDelete(pkg.id);
                  }}
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold whitespace-nowrap"
                >
                  Konfirmasi Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Hapus paket"
                className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Hapus</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail Pengiriman (Flat Hairline Grid - tanpa nested cards) */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Detail Pengiriman
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
          {infoRows.map((row) => (
            <div key={row.label} className="pb-2.5 border-b border-slate-100 dark:border-slate-800/70">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{row.label}</dt>
              <dd
                className={`mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100 break-words ${
                  row.mono ? 'tabular-nums' : ''
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Timeline Kronologis Perjalanan Paket */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Riwayat Perjalanan Paket
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {orderedHistory.length} catatan perjalanan dari ekspedisi
            </p>
          </div>

          {orderedHistory.length > 1 && (
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{sortOrder === 'newest' ? 'Terbaru di atas' : 'Urutan kronologis'}</span>
            </button>
          )}
        </div>

        {orderedHistory.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Ekspedisi belum menyediakan riwayat perjalanan terperinci untuk resi ini.
          </div>
        ) : (
          <ol className="relative space-y-5 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
            {orderedHistory.map((step, index) => {
              const isLatest =
                (sortOrder === 'newest' && index === 0) ||
                (sortOrder === 'oldest' && index === orderedHistory.length - 1);

              return (
                <li key={`${step.date}-${index}`} className="relative pl-8">
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-1 w-[19px] h-[19px] rounded-full flex items-center justify-center border-2 ${
                      isLatest
                        ? 'bg-sky-600 border-sky-200 dark:bg-sky-400 dark:border-sky-900'
                        : 'bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-700'
                    }`}
                  >
                    {isLatest && <span className="w-2 h-2 rounded-full bg-white dark:bg-slate-950" />}
                  </span>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span className={isLatest ? 'font-semibold text-sky-700 dark:text-sky-300' : ''}>
                        {formatDateTimeId(step.date)}
                      </span>
                      {step.location && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <MapPin className="w-3 h-3" aria-hidden="true" />
                            <span>{step.location}</span>
                          </span>
                        </>
                      )}
                    </div>
                    <p
                      className={`text-sm leading-relaxed ${
                        isLatest
                          ? 'font-medium text-slate-900 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {step.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
