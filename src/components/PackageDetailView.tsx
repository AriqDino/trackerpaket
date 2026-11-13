import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Check,
  Copy,
  MapPin,
  Pencil,
  RefreshCw,
  RotateCcw,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PackageStatus, SavedPackage } from '../../shared/types';
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

const STEP_INDEX: Record<PackageStatus, number> = {
  waiting: 0,
  in_transit: 2,
  delivered: 3,
  issue: 2,
};

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
  const [copiedSummary, setCopiedSummary] = useState(false);
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

  const handleCopySummary = async () => {
    const latest = pkg.tracking.history[0];
    const lines = [
      `Paket: ${pkg.label}`,
      `Ekspedisi: ${pkg.courierName}${pkg.tracking.summary.service ? ` (${pkg.tracking.summary.service})` : ''}`,
      `No. Resi: ${pkg.awb}`,
      `Status: ${pkg.tracking.rawStatus || pkg.normalizedStatus}`,
      pkg.tracking.detail.origin || pkg.tracking.detail.destination
        ? `Rute: ${pkg.tracking.detail.origin || '-'} -> ${pkg.tracking.detail.destination || '-'}`
        : '',
      latest ? `Update Terakhir: ${latest.desc} (${formatDateTimeId(latest.date)})` : '',
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 1800);
    } catch {
      // ignore
    }
  };

  const { summary, detail } = pkg.tracking;
  const activeStep = STEP_INDEX[pkg.normalizedStatus];
  const isIssue = pkg.normalizedStatus === 'issue';

  const milestones = [
    { label: 'Manifest' },
    { label: 'Diproses' },
    { label: isIssue ? 'Kendala' : 'Perjalanan' },
    { label: 'Diterima' },
  ];

  const infoRows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'Pengirim', value: detail.shipper || '-' },
    { label: 'Penerima', value: detail.receiver || '-' },
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
      className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0D1320] overflow-hidden"
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

      {/* Header Dossier Paket */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/90 space-y-5">
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
                <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white truncate">
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
              <span className="font-semibold text-slate-800 dark:text-slate-200">{pkg.courierName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{pkg.awb}</span>
              <button
                type="button"
                onClick={() => void handleCopyAwb()}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors"
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

        {/* 4-Stage Shipment Milestone Stepper */}
        <div aria-label="Tahapan perjalanan paket" className="pt-1">
          <div className="grid grid-cols-4 gap-2">
            {milestones.map((step, idx) => {
              const reached = idx <= activeStep;
              const isCurrent = idx === activeStep;
              const barColor = !reached
                ? 'bg-slate-200 dark:bg-slate-800'
                : isIssue && isCurrent
                  ? 'bg-rose-500 dark:bg-rose-400'
                  : pkg.normalizedStatus === 'delivered'
                    ? 'bg-emerald-500 dark:bg-emerald-400'
                    : 'bg-sky-500 dark:bg-sky-400';

              return (
                <div key={step.label} className="space-y-1.5">
                  <div className={`h-1.5 rounded-full transition-colors ${barColor}`} />
                  <p
                    className={`text-[11px] font-medium truncate ${
                      isCurrent
                        ? isIssue
                          ? 'text-rose-700 dark:text-rose-300 font-semibold'
                          : 'text-slate-950 dark:text-white font-semibold'
                        : reached
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Route Origin -> Destination */}
        {(detail.origin || detail.destination) && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Kota Asal</p>
              <p className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                {detail.origin || '-'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0">
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Kota Tujuan</p>
              <p className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                {detail.destination || '-'}
              </p>
            </div>
          </div>
        )}

        {/* Status Terkini + Aksi */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
            <p>
              Status kurir:{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {pkg.tracking.rawStatus || '-'}
              </span>
            </p>
            <p className="tabular-nums">
              Diperbarui {formatRelativeTimeId(pkg.updatedAt)} ·{' '}
              {pkg.tracking.cached ? 'Dari cache server' : 'Data langsung BinderByte'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onRefresh(pkg)}
              disabled={isRefreshing}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{isRefreshing ? 'Memperbarui...' : 'Refresh Status'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCopySummary()}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Ringkasan Tersalin</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Salin Ringkasan</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onRetrack(pkg)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
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
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold whitespace-nowrap"
                >
                  Konfirmasi Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Hapus paket"
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Hapus</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail Pengiriman (Flat Hairline Grid) */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/90">
        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Rincian Pengiriman
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
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
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
              className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
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
                        : 'bg-white border-slate-300 dark:bg-[#0D1320] dark:border-slate-700'
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
                          ? 'font-semibold text-slate-950 dark:text-white'
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
