import { ArrowRight, Check, Copy, Pencil, RefreshCw, RotateCcw, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { PackageStatus, SavedPackage } from '../../shared/types';
import { formatDateTimeId, formatRelativeTimeId } from '../utils/statusConfig';
import { StatusBadge } from './StatusBadge';

interface PackageCardProps {
  pkg: SavedPackage;
  isSelected: boolean;
  isRefreshing: boolean;
  onSelect: (pkg: SavedPackage) => void;
  onRefresh: (pkg: SavedPackage) => void;
  onRetrack: (pkg: SavedPackage) => void;
  onRename: (id: string, newLabel: string) => void;
  onDelete: (id: string) => void;
}

const ROUTE_PROGRESS: Record<PackageStatus, { width: string; barClass: string }> = {
  waiting: { width: '25%', barClass: 'bg-amber-500 dark:bg-amber-400' },
  in_transit: { width: '64%', barClass: 'bg-sky-500 dark:bg-sky-400' },
  delivered: { width: '100%', barClass: 'bg-emerald-500 dark:bg-emerald-400' },
  issue: { width: '68%', barClass: 'bg-rose-500 dark:bg-rose-400' },
};

export function PackageCard({
  pkg,
  isSelected,
  isRefreshing,
  onSelect,
  onRefresh,
  onRetrack,
  onRename,
  onDelete,
}: PackageCardProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [draftLabel, setDraftLabel] = useState(pkg.label);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedAwb, setCopiedAwb] = useState(false);

  const latestCheckpoint = pkg.tracking.history[0];
  const origin = pkg.tracking.detail.origin;
  const destination = pkg.tracking.detail.destination;
  const routeStyle = ROUTE_PROGRESS[pkg.normalizedStatus];

  const saveLabel = () => {
    onRename(pkg.id, draftLabel);
    setIsEditingLabel(false);
  };

  const handleCopyAwb = async () => {
    try {
      await navigator.clipboard.writeText(pkg.awb);
      setCopiedAwb(true);
      setTimeout(() => setCopiedAwb(false), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <article
      className={`rounded-2xl border transition-all duration-150 p-4 sm:p-5 space-y-3.5 ${
        isSelected
          ? 'bg-white border-sky-500 ring-1 ring-sky-500/25 dark:bg-[#0D1320] dark:border-sky-400/90 dark:ring-sky-400/20 shadow-xs'
          : 'bg-white border-slate-200/90 hover:border-slate-300 dark:bg-[#0D1320] dark:border-slate-800/90 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Row: Label + Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isEditingLabel ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveLabel();
                  if (e.key === 'Escape') {
                    setDraftLabel(pkg.label);
                    setIsEditingLabel(false);
                  }
                }}
                maxLength={60}
                autoFocus
                aria-label="Edit nama label paket"
                className="w-full min-h-[36px] px-2.5 py-1 rounded-lg border border-sky-400 dark:border-sky-500 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={saveLabel}
                aria-label="Simpan label"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-sky-600 text-white hover:bg-sky-700"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftLabel(pkg.label);
                  setIsEditingLabel(false);
                }}
                aria-label="Batal ubah label"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelect(pkg)}
                className="font-display text-left text-base font-bold text-slate-950 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 truncate transition-colors"
              >
                {pkg.label}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftLabel(pkg.label);
                  setIsEditingLabel(true);
                }}
                aria-label={`Ubah nama paket ${pkg.label}`}
                title="Ubah nama paket"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Unboxed Metadata Row (Zero-Pill Discipline) */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{pkg.courierName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">{pkg.awb}</span>
            <button
              type="button"
              onClick={() => void handleCopyAwb()}
              aria-label={`Salin resi ${pkg.awb}`}
              title="Salin nomor resi"
              className="p-0.5 rounded text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              {copiedAwb ? (
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="w-3 h-3" aria-hidden="true" />
              )}
            </button>
            {pkg.tracking.summary.service && (
              <>
                <span aria-hidden="true">·</span>
                <span>{pkg.tracking.summary.service}</span>
              </>
            )}
          </div>
        </div>

        <StatusBadge status={pkg.normalizedStatus} />
      </div>

      {/* Clickable Body Area: Visual Route Bar & Latest Checkpoint */}
      <button
        type="button"
        onClick={() => onSelect(pkg)}
        className="w-full text-left block space-y-2.5 pt-0.5 focus-visible:outline-2 focus-visible:outline-sky-500 rounded-lg"
      >
        {(origin || destination) && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span className="truncate max-w-[44%]">{origin || 'Asal tidak tercatat'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[44%] text-right">{destination || 'Tujuan tidak tercatat'}</span>
            </div>
            <div
              aria-hidden="true"
              className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${routeStyle.barClass}`}
                style={{ width: routeStyle.width }}
              />
            </div>
          </div>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-300/90 line-clamp-2 leading-relaxed">
          {latestCheckpoint?.desc || pkg.tracking.summary.desc || pkg.tracking.rawStatus || 'Belum ada detail riwayat.'}
        </p>

        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
          <span>
            {latestCheckpoint?.date ? formatDateTimeId(latestCheckpoint.date) : 'Tanggal belum tersedia'}
          </span>
          <span>Dicek {formatRelativeTimeId(pkg.updatedAt)}</span>
        </div>
      </button>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelect(pkg)}
          className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
            isSelected
              ? 'bg-slate-950 text-white dark:bg-sky-500 dark:text-slate-950'
              : 'text-sky-700 dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/70'
          }`}
        >
          Lihat Timeline
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onRefresh(pkg)}
            disabled={isRefreshing}
            title="Perbarui status terbaru"
            aria-label={`Refresh status ${pkg.label}`}
            className="min-h-[36px] min-w-[36px] px-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => onRetrack(pkg)}
            title="Lacak ulang di formulir"
            aria-label={`Lacak ulang ${pkg.label}`}
            className="min-h-[36px] min-w-[36px] px-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden xl:inline">Lacak Ulang</span>
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete(pkg.id);
                }}
                className="min-h-[36px] px-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white whitespace-nowrap"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[36px] px-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title="Hapus paket dari daftar"
              aria-label={`Hapus ${pkg.label}`}
              className="min-h-[36px] min-w-[36px] px-2 rounded-xl text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
