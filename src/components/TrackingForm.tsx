import { AlertCircle, Loader2, Search, Sparkles, Tag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { matchAwbPatterns, validateAwbFormat } from '../../shared/awbPatterns';
import type { CourierInfo } from '../../shared/types';
import type { TrackingApiError } from '../services/trackingApi';

interface TrackingFormProps {
  couriers: CourierInfo[];
  couriersLoading: boolean;
  initialAwb?: string;
  initialCourier?: string;
  initialLabel?: string;
  initialPhoneLast5?: string;
  initialDate?: string;
  isSubmitting: boolean;
  error: TrackingApiError | { message: string; hint?: string } | null;
  onSubmit: (payload: {
    awb: string;
    courier: string;
    label: string;
    number?: string;
    date?: string;
  }) => Promise<void>;
  onClearError: () => void;
}

export function TrackingForm({
  couriers,
  couriersLoading,
  initialAwb = '',
  initialCourier = '',
  initialLabel = '',
  initialPhoneLast5 = '',
  initialDate = '',
  isSubmitting,
  error,
  onSubmit,
  onClearError,
}: TrackingFormProps) {
  const [awb, setAwb] = useState(initialAwb);
  const [courier, setCourier] = useState(initialCourier || 'auto');
  const [label, setLabel] = useState(initialLabel);
  const [phoneLast5, setPhoneLast5] = useState(initialPhoneLast5);
  const [transactionDate, setTransactionDate] = useState(initialDate);
  const [courierFilter, setCourierFilter] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAwb) setAwb(initialAwb);
  }, [initialAwb]);

  useEffect(() => {
    if (initialCourier) setCourier(initialCourier);
  }, [initialCourier]);

  useEffect(() => {
    if (initialLabel) setLabel(initialLabel);
  }, [initialLabel]);

  useEffect(() => {
    setPhoneLast5(initialPhoneLast5);
  }, [initialPhoneLast5]);

  useEffect(() => {
    setTransactionDate(initialDate);
  }, [initialDate]);

  const patternMatches = useMemo(() => matchAwbPatterns(awb), [awb]);

  const filteredCouriers = useMemo(() => {
    const q = courierFilter.trim().toLowerCase();
    if (!q) return couriers;
    return couriers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [couriers, courierFilter]);

  const selectedCourierObj = useMemo(
    () => couriers.find((c) => c.code === courier),
    [couriers, courier]
  );

  const showJnePhone =
    courier === 'jne' || (courier === 'auto' && patternMatches[0]?.courierCode === 'jne');
  const showLarisDate = courier === 'laris_cargo';

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    onClearError();

    const check = validateAwbFormat(awb);
    if (!check.valid) {
      setValidationError(check.message || 'Nomor resi tidak valid.');
      return;
    }

    const cleanPhone = phoneLast5.replace(/\D/g, '');
    if (showJnePhone && cleanPhone && cleanPhone.length !== 5) {
      setValidationError('Verifikasi nomor HP penerima JNE harus tepat 5 digit terakhir.');
      return;
    }

    if (courier === 'auto' && patternMatches.length === 0) {
      setValidationError(
        'Pola nomor resi belum dikenali otomatis. Silakan pilih ekspedisi secara manual pada daftar kurir.'
      );
      return;
    }

    await onSubmit({
      awb: check.cleaned,
      courier: courier || 'auto',
      label: label.trim(),
      number: showJnePhone && cleanPhone ? cleanPhone : undefined,
      date: showLarisDate && transactionDate ? transactionDate : undefined,
    });
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      noValidate
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Lacak Paket Baru
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Masukkan nomor resi dan pilih ekspedisi untuk melihat status terkini dan riwayat perjalanan paket.
        </p>
      </div>

      {/* Nomor Resi */}
      <div className="space-y-1.5">
        <label
          htmlFor="awb-input"
          className="block text-sm font-medium text-slate-800 dark:text-slate-200"
        >
          Nomor Resi / AWB <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            id="awb-input"
            type="text"
            value={awb}
            onChange={(e) => {
              setAwb(e.target.value);
              if (validationError) setValidationError(null);
              if (error) onClearError();
            }}
            placeholder="Contoh: 8825112045716759 atau SPXID04..."
            autoComplete="off"
            spellCheck={false}
            className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-sm placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>

        {/* Smart AWB Pattern Suggestion */}
        {patternMatches.length > 0 && (
          <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
            <span>Terdeteksi pola:</span>
            {patternMatches.map((m) => (
              <button
                key={m.courierCode}
                type="button"
                onClick={() => setCourier(m.courierCode)}
                className={`px-2 py-1 rounded-md font-medium transition-colors duration-150 ${
                  courier === m.courierCode
                    ? 'bg-sky-600 text-white dark:bg-sky-500 dark:text-slate-950'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/60'
                }`}
              >
                {m.courierName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pilihan Ekspedisi & Label Paket */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label
            htmlFor="courier-select"
            className="block text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            Ekspedisi <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={courierFilter}
            onChange={(e) => setCourierFilter(e.target.value)}
            placeholder="Cari ekspedisi (misal: JNE, J&T, SiCepat)..."
            aria-label="Filter daftar ekspedisi"
            className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-950/70 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <select
            id="courier-select"
            value={courier}
            onChange={(e) => {
              setCourier(e.target.value);
              if (validationError) setValidationError(null);
            }}
            disabled={couriersLoading && couriers.length === 0}
            className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="auto">
              Deteksi Otomatis (Berdasarkan Pola Resi)
            </option>
            {filteredCouriers.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name} ({item.code.toUpperCase()})
                {item.status === 'offline' ? ' — Offline' : item.status === 'maintenance' ? ' — Pemeliharaan' : ''}
              </option>
            ))}
          </select>
          {selectedCourierObj?.status && selectedCourierObj.status !== 'online' && selectedCourierObj.status !== 'unknown' && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Catatan: Ekspedisi ini sedang berstatus {selectedCourierObj.status} di BinderByte.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="package-label-input"
            className="block text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            Nama / Label Paket <span className="text-xs font-normal text-slate-500">(opsional)</span>
          </label>
          <div className="relative">
            <Tag
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="package-label-input"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
              placeholder="Misal: Sepatu Lari, Monitor Kerja"
              className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Memudahkan pencarian paket pada daftar tersimpan.
          </p>
        </div>
      </div>

      {/* Field Kondisional JNE / Laris Cargo */}
      {(showJnePhone || showLarisDate) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
          {showJnePhone && (
            <div className="space-y-1.5">
              <label
                htmlFor="jne-phone-input"
                className="block text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                5 Digit Akhir No. HP Penerima <span className="text-xs font-normal text-slate-500">(opsional khusus JNE)</span>
              </label>
              <input
                id="jne-phone-input"
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={phoneLast5}
                onChange={(e) => setPhoneLast5(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="Contoh: 12345"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-white placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Diperlukan sebagian resi JNE untuk verifikasi privasi penerima.
              </p>
            </div>
          )}

          {showLarisDate && (
            <div className="space-y-1.5">
              <label
                htmlFor="laris-date-input"
                className="block text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                Tanggal Transaksi <span className="text-xs font-normal text-slate-500">(khusus Laris Cargo)</span>
              </label>
              <input
                id="laris-date-input"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Validasi atau Error API */}
      {(validationError || error) && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-sm text-rose-900 dark:text-rose-100 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium">{validationError || error?.message}</p>
            {error && 'hint' in error && error.hint && (
              <p className="text-xs text-rose-800/90 dark:text-rose-200/90 leading-relaxed">
                {error.hint}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Hasil pelacakan otomatis tersimpan ke daftar paket Anda.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[46px] px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Melacak Paket...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" aria-hidden="true" />
              <span>Lacak Sekarang</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
