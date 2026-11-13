import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BackgroundSyncSettings } from '../shared/backgroundSync';
import type { CourierInfo, SavedPackage } from '../shared/types';
import { ApiSetupBanner } from './components/ApiSetupBanner';
import { BackgroundSyncPanel } from './components/BackgroundSyncPanel';
import { CloudSyncBanner } from './components/CloudSyncBanner';
import { CourierDirectory } from './components/CourierDirectory';
import { HeaderNav, type ActiveTab } from './components/HeaderNav';
import { DetailSkeleton } from './components/LoadingSkeleton';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PackageCard } from './components/PackageCard';
import { PackageDetailView } from './components/PackageDetailView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { PWAUpdateBanner } from './components/PWAUpdateBanner';
import { SummaryStats, type StatusFilter } from './components/SummaryStats';
import { TrackingForm } from './components/TrackingForm';
import { useFirebaseAuth } from './context/FirebaseAuthContext';
import { useBackgroundSync } from './hooks/useBackgroundSync';
import {
  deleteCloudPackage,
  ensureUserAccount,
  isQuotaExceededError,
  migrateLocalPackagesToCloud,
  renameCloudPackage,
  subscribeUserPackages,
  updateCloudSyncSettings,
  upsertCloudPackage,
} from './services/firestoreService';
import {
  applyAndSaveTheme,
  buildPackageId,
  clearLocalPackagesMirror,
  deleteSavedPackage,
  loadSavedPackages,
  loadThemePreference,
  renameSavedPackage,
  replaceLocalPackagesMirror,
  saveOrUpdatePackage,
  type ThemeMode,
} from './services/storageService';
import {
  TrackingApiError,
  fetchCouriersList,
  fetchHealthStatus,
  trackPackageRequest,
} from './services/trackingApi';

interface ToastNotice {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadThemePreference());
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam === 'track' || tabParam === 'couriers' || tabParam === 'dashboard') {
      return tabParam;
    }
    return 'dashboard';
  });

  const [apiConfigured, setApiConfigured] = useState<boolean>(true);
  const [couriers, setCouriers] = useState<CourierInfo[]>([]);
  const [couriersSource, setCouriersSource] = useState<'live' | 'catalog'>('catalog');
  const [couriersWarning, setCouriersWarning] = useState<string | undefined>(undefined);
  const [couriersLoading, setCouriersLoading] = useState<boolean>(true);

  const [packages, setPackages] = useState<SavedPackage[]>(() => loadSavedPackages());
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(() => {
    const initial = loadSavedPackages();
    return initial[0]?.id ?? null;
  });
  const [mobileDetailOpen, setMobileDetailOpen] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [trackError, setTrackError] = useState<TrackingApiError | { message: string; hint?: string } | null>(null);
  const [refreshingIds, setRefreshingIds] = useState<Record<string, boolean>>({});
  const [isRefreshingAll, setIsRefreshingAll] = useState<boolean>(false);

  const [formDefaults, setFormDefaults] = useState<{
    awb: string;
    courier: string;
    label: string;
    phoneLast5: string;
    date: string;
  }>({
    awb: '',
    courier: 'auto',
    label: '',
    phoneLast5: '',
    date: '',
  });
  const [quickAwb, setQuickAwb] = useState<string>('');

  const { user, authReady, authError, clearAuthError } = useFirebaseAuth();
  const [cloudLoading, setCloudLoading] = useState<boolean>(false);

  const [toast, setToast] = useState<ToastNotice | null>(null);

  const showToast = useCallback((type: ToastNotice['type'], message: string) => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  }, []);

  useEffect(() => {
    if (authError) {
      showToast('error', authError);
      clearAuthError();
    }
  }, [authError, clearAuthError, showToast]);

  useEffect(() => {
    applyAndSaveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.has('tab')) {
      url.searchParams.delete('tab');
      const cleaned = url.pathname + (url.search ? url.search : '') + url.hash;
      window.history.replaceState({}, '', cleaned);
    }
  }, []);

  const activePackageCount = useMemo(
    () => packages.filter((p) => p.normalizedStatus !== 'delivered').length,
    [packages]
  );

  const handleBackgroundPackagesUpdated = useCallback(
    (updatedPackages: SavedPackage[], result: import('../shared/backgroundSync').BackgroundSyncRunResult) => {
      setPackages(updatedPackages);
      if (user) {
        const activeUpdated = updatedPackages.filter((pkg) => pkg.normalizedStatus !== 'delivered');
        void Promise.all(
          activeUpdated.map((pkg) => upsertCloudPackage(user.uid, pkg).catch(() => undefined))
        );
      }
      if (result.source === 'manual-or-timer' && result.updated > 0) {
        showToast('success', `Sinkronisasi latar belakang selesai: ${result.updated} paket diperbarui.`);
      } else if (result.source === 'manual-or-timer' && result.failed > 0 && result.updated === 0) {
        showToast('error', 'Sinkronisasi latar belakang gagal memperbarui paket.');
      }
    },
    [showToast, user]
  );

  const handleCloudSettingsChange = useCallback(
    (nextSettings: BackgroundSyncSettings) => {
      if (!user) return;
      void updateCloudSyncSettings(user.uid, nextSettings).catch((err) => {
        if (isQuotaExceededError(err)) {
          showToast('error', 'Kuota harian Firestore tercapai. Pengaturan disimpan secara lokal.');
        }
      });
    },
    [user, showToast]
  );

  const backgroundSync = useBackgroundSync({
    activePackageCount,
    onPackagesUpdated: handleBackgroundPackagesUpdated,
    onSettingsChanged: handleCloudSettingsChange,
  });

  const backgroundSyncRef = useRef(backgroundSync);
  backgroundSyncRef.current = backgroundSync;

  useEffect(() => {
    if (!authReady || !user) {
      setCloudLoading(false);
      return;
    }

    let cancelled = false;
    let unsubscribePackages: (() => void) | null = null;
    const uid = user.uid;

    async function connectFirestore() {
      setCloudLoading(true);
      try {
        const preLoginLocal = loadSavedPackages();
        const cloudSettings = await ensureUserAccount(user!, backgroundSyncRef.current.settings);
        if (cancelled) return;

        await backgroundSyncRef.current.applyCloudSettings(cloudSettings);
        if (cancelled) return;

        if (preLoginLocal.length > 0) {
          const migrated = await migrateLocalPackagesToCloud(uid, preLoginLocal);
          if (!cancelled && migrated > 0) {
            showToast(
              'success',
              `${migrated} resi lokal berhasil disinkronkan ke akun Google Anda.`
            );
          }
        }

        if (cancelled) return;
        unsubscribePackages = subscribeUserPackages(
          uid,
          (cloudPackages) => {
            if (cancelled) return;
            setPackages(cloudPackages);
            replaceLocalPackagesMirror(cloudPackages);
            setSelectedPackageId((prev) => {
              if (prev && cloudPackages.some((p) => p.id === prev)) return prev;
              return cloudPackages[0]?.id ?? null;
            });
            setCloudLoading(false);
          },
          (err) => {
            if (cancelled) return;
            setCloudLoading(false);
            if (isQuotaExceededError(err)) {
              showToast(
                'error',
                'Kuota baca harian Firestore habis dan akan direset besok. Menampilkan data lokal sementara.'
              );
            } else {
              showToast('error', 'Gagal menyinkronkan data paket dari Cloud Firestore.');
            }
          }
        );
      } catch (err) {
        if (cancelled) return;
        setCloudLoading(false);
        if (isQuotaExceededError(err)) {
          showToast(
            'error',
            'Kuota harian Firestore tercapai dan akan direset besok.'
          );
        } else {
          showToast('error', 'Gagal terhubung ke Cloud Firestore.');
        }
      }
    }

    void connectFirestore();

    return () => {
      cancelled = true;
      if (unsubscribePackages) {
        unsubscribePackages();
      }
    };
  }, [authReady, user, showToast]);

  const loadInitialMeta = useCallback(async (forceCouriers = false) => {
    setCouriersLoading(true);
    try {
      const [healthRes, couriersRes] = await Promise.all([
        fetchHealthStatus().catch(() => null),
        fetchCouriersList(forceCouriers),
      ]);
      if (healthRes) {
        setApiConfigured(healthRes.apiConfigured);
      } else {
        setApiConfigured(couriersRes.apiConfigured);
      }
      setCouriers(couriersRes.couriers);
      setCouriersSource(couriersRes.source);
      setCouriersWarning(couriersRes.warning);
    } catch (err) {
      if (err instanceof TrackingApiError) {
        setCouriersWarning(err.message);
      } else {
        setCouriersWarning('Gagal memuat daftar ekspedisi dari server.');
      }
    } finally {
      setCouriersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialMeta(false);
  }, [loadInitialMeta]);

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packages.filter((pkg) => {
      const matchesStatus =
        statusFilter === 'all' ? true : pkg.normalizedStatus === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      const haystack = [
        pkg.label,
        pkg.awb,
        pkg.courierName,
        pkg.courierCode,
        pkg.tracking.detail.shipper,
        pkg.tracking.detail.receiver,
        pkg.tracking.detail.origin,
        pkg.tracking.detail.destination,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [packages, searchQuery, statusFilter]);

  const selectedPackage = useMemo(() => {
    if (selectedPackageId) {
      const found = packages.find((p) => p.id === selectedPackageId);
      if (found) return found;
    }
    return filteredPackages[0] ?? packages[0] ?? null;
  }, [packages, filteredPackages, selectedPackageId]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleOpenNewTrack = () => {
    setTrackError(null);
    setFormDefaults({
      awb: '',
      courier: 'auto',
      label: '',
      phoneLast5: '',
      date: '',
    });
    setActiveTab('track');
    setMobileDetailOpen(false);
  };

  const handleTrackSubmit = async (payload: {
    awb: string;
    courier: string;
    label: string;
    number?: string;
    date?: string;
  }) => {
    setIsTracking(true);
    setTrackError(null);
    try {
      const result = await trackPackageRequest({
        awb: payload.awb,
        courier: payload.courier,
        number: payload.number,
        date: payload.date,
        refresh: false,
      });

      const updatedList = saveOrUpdatePackage(result, {
        label: payload.label,
        phoneLast5: payload.number,
        transactionDate: payload.date,
      });

      const newId = buildPackageId(result.courierCode, result.awb);
      setPackages(updatedList);
      setSelectedPackageId(newId);
      setStatusFilter('all');
      setSearchQuery('');
      setActiveTab('dashboard');
      setMobileDetailOpen(true);

      const savedTarget = updatedList.find((p) => p.id === newId);
      if (user && savedTarget) {
        void upsertCloudPackage(user.uid, savedTarget).catch((err) => {
          showToast(
            'error',
            isQuotaExceededError(err)
              ? 'Kuota harian Firestore tercapai. Paket hanya tersimpan lokal.'
              : 'Paket tersimpan lokal, tetapi gagal menyinkronkan ke Cloud.'
          );
        });
      }

      showToast(
        'success',
        result.detectedAutomatically
          ? `Berhasil mendeteksi ${result.courierName} dan menyimpan resi ${result.awb}.`
          : `Resi ${result.awb} (${result.courierName}) berhasil dilacak dan disimpan.`
      );
    } catch (err) {
      if (err instanceof TrackingApiError) {
        setTrackError(err);
      } else {
        setTrackError({
          message: 'Gagal melacak paket. Terjadi kesalahan jaringan atau server.',
        });
      }
    } finally {
      setIsTracking(false);
    }
  };

  const handleRefreshPackage = async (pkg: SavedPackage) => {
    setRefreshingIds((prev) => ({ ...prev, [pkg.id]: true }));
    try {
      const result = await trackPackageRequest({
        awb: pkg.awb,
        courier: pkg.courierCode,
        number: pkg.phoneLast5,
        date: pkg.transactionDate,
        refresh: true,
      });
      const updatedList = saveOrUpdatePackage(result);
      setPackages(updatedList);
      const refreshedTarget = updatedList.find((p) => p.id === pkg.id);
      if (user && refreshedTarget) {
        void upsertCloudPackage(user.uid, refreshedTarget).catch(() => {
          showToast('error', 'Status diperbarui secara lokal, gagal menyimpan ke Cloud.');
        });
      }
      showToast('success', `Status paket "${pkg.label}" berhasil diperbarui.`);
    } catch (err) {
      const msg =
        err instanceof TrackingApiError
          ? err.message
          : 'Gagal memperbarui status paket.';
      showToast('error', msg);
    } finally {
      setRefreshingIds((prev) => {
        const next = { ...prev };
        delete next[pkg.id];
        return next;
      });
    }
  };

  const handleRefreshActivePackages = async () => {
    const targets = packages.filter((p) => p.normalizedStatus !== 'delivered');
    if (targets.length === 0) {
      showToast('info', 'Semua paket tersimpan sudah berstatus Diterima.');
      return;
    }

    setIsRefreshingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const pkg of targets) {
      setRefreshingIds((prev) => ({ ...prev, [pkg.id]: true }));
      try {
        const result = await trackPackageRequest({
          awb: pkg.awb,
          courier: pkg.courierCode,
          number: pkg.phoneLast5,
          date: pkg.transactionDate,
          refresh: true,
        });
        const updatedList = saveOrUpdatePackage(result);
        setPackages(updatedList);
        const refreshedTarget = updatedList.find((p) => p.id === pkg.id);
        if (user && refreshedTarget) {
          void upsertCloudPackage(user.uid, refreshedTarget).catch(() => undefined);
        }
        successCount += 1;
      } catch {
        failCount += 1;
      } finally {
        setRefreshingIds((prev) => {
          const next = { ...prev };
          delete next[pkg.id];
          return next;
        });
      }
    }

    setIsRefreshingAll(false);
    if (failCount === 0) {
      showToast('success', `${successCount} paket aktif berhasil diperbarui.`);
    } else {
      showToast(
        'info',
        `${successCount} paket diperbarui, ${failCount} paket gagal diperbarui.`
      );
    }
  };

  const handleRetrack = (pkg: SavedPackage) => {
    setTrackError(null);
    setFormDefaults({
      awb: pkg.awb,
      courier: pkg.courierCode,
      label: pkg.label,
      phoneLast5: pkg.phoneLast5 || '',
      date: pkg.transactionDate || '',
    });
    setActiveTab('track');
    setMobileDetailOpen(false);
  };

  const handleRename = (id: string, newLabel: string) => {
    const updated = renameSavedPackage(id, newLabel);
    setPackages(updated);
    if (user) {
      void renameCloudPackage(user.uid, id, newLabel).catch(() => {
        showToast('error', 'Nama paket diperbarui lokal, gagal menyinkronkan ke Cloud.');
      });
    }
    showToast('success', 'Nama paket berhasil diperbarui.');
  };

  const handleDelete = (id: string) => {
    const updated = deleteSavedPackage(id);
    setPackages(updated);
    if (selectedPackageId === id) {
      setSelectedPackageId(updated[0]?.id ?? null);
      setMobileDetailOpen(false);
    }
    if (user) {
      void deleteCloudPackage(user.uid, id).catch(() => {
        showToast('error', 'Paket dihapus lokal, gagal menghapus dari Cloud.');
      });
    }
    showToast('info', 'Paket dihapus dari daftar tersimpan.');
  };

  const handleSignedOut = () => {
    clearLocalPackagesMirror();
    setPackages([]);
    setSelectedPackageId(null);
    setMobileDetailOpen(false);
    showToast('info', 'Anda telah keluar dari akun Google.');
  };

  const handleSelectCourierFromDirectory = (courierCode: string) => {
    setTrackError(null);
    setFormDefaults({
      awb: '',
      courier: courierCode,
      label: '',
      phoneLast5: '',
      date: '',
    });
    setActiveTab('track');
  };

  const handleQuickAwbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = quickAwb.trim().toUpperCase();
    setTrackError(null);
    setFormDefaults({
      awb: cleaned,
      courier: 'auto',
      label: '',
      phoneLast5: '',
      date: '',
    });
    setQuickAwb('');
    setActiveTab('track');
    setMobileDetailOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9] dark:bg-[#060911] canvas-grid-subtle text-slate-900 dark:text-slate-100 pb-20 md:pb-10">
      <HeaderNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'dashboard') setMobileDetailOpen(false);
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenNewTrack={handleOpenNewTrack}
        onSignedOut={handleSignedOut}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.16 }}
            role="status"
            aria-live="polite"
            className="fixed top-16 md:top-20 right-4 left-4 sm:left-auto sm:max-w-md z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg px-4 py-3 flex items-start gap-3"
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            )}
            <p className="text-sm text-slate-800 dark:text-slate-100 flex-1 leading-snug">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Tutup notifikasi"
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <ApiSetupBanner apiConfigured={apiConfigured} />

        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-6"
          >
            {/* Hero Command Strip */}
            <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0D1320] p-5 sm:p-7 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white text-balance">
                    Pusat Pantau Pengiriman Paket
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Kelola seluruh nomor resi lintas ekspedisi, beri label khusus, dan pantau progres perjalanan paket secara real-time.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
                  <PWAInstallButton />

                  {packages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRefreshActivePackages}
                      disabled={isRefreshingAll}
                      className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 disabled:opacity-60 whitespace-nowrap transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshingAll ? 'animate-spin' : ''}`} aria-hidden="true" />
                      <span>{isRefreshingAll ? 'Memperbarui...' : 'Perbarui Paket Aktif'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick AWB Track Bar */}
              <form
                onSubmit={handleQuickAwbSubmit}
                className="flex flex-col sm:flex-row gap-2.5 pt-1"
              >
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={quickAwb}
                    onChange={(e) => setQuickAwb(e.target.value)}
                    placeholder="Tempel nomor resi baru di sini untuk langsung melacak (contoh: SPXID04... atau JP...)"
                    aria-label="Nomor resi pelacakan cepat"
                    spellCheck={false}
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-sm text-slate-950 dark:text-white placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[46px] px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
                >
                  <span>Lacak Cepat</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </section>

            <CloudSyncBanner localPackageCount={packages.length} />

            {/* Ringkasan KPI */}
            <SummaryStats
              packages={packages}
              activeFilter={statusFilter}
              onSelectFilter={(f) => {
                setStatusFilter(f);
                setMobileDetailOpen(false);
              }}
            />

            {cloudLoading && packages.length === 0 && (
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0D1320] p-6 text-center text-sm text-slate-600 dark:text-slate-400">
                Memuat daftar paket tersimpan dari Cloud Firestore...
              </div>
            )}

            {packages.length > 0 && (
              <BackgroundSyncPanel
                settings={backgroundSync.settings}
                activePackageCount={activePackageCount}
                lastSyncAt={backgroundSync.lastSyncAt}
                lastRunResult={backgroundSync.lastRunResult}
                isSyncing={backgroundSync.isSyncing}
                periodicSupported={backgroundSync.periodicSupported}
                periodicRegistered={backgroundSync.periodicRegistered}
                notificationPermission={backgroundSync.notificationPermission}
                onToggleAutoSync={(enabled) => void backgroundSync.toggleAutoSync(enabled)}
                onToggleNotifications={(enabled) => void backgroundSync.toggleNotifications(enabled)}
                onSyncNow={() => void backgroundSync.syncNow()}
              />
            )}

            {/* Empty State Global bila belum ada paket sama sekali */}
            {packages.length === 0 ? (
              <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0D1320] p-8 sm:p-12 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <PackageOpen className="w-7 h-7" aria-hidden="true" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                    Belum Ada Resi yang Tersimpan
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Mulai lacak nomor resi dari JNE, J&amp;T, SiCepat, Shopee Express, AnterAja, dan puluhan ekspedisi lain. Paket yang Anda lacak akan tersimpan otomatis di sini.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOpenNewTrack}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Lacak Paket Pertama</span>
                  </button>
                </div>
              </section>
            ) : (
              /* Toolbar Pencarian + Master-Detail Workspace */
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                  <div className="relative flex-1 max-w-xl">
                    <Search
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari label paket, nomor resi, kurir, kota, atau nama penerima..."
                      aria-label="Cari resi tersimpan"
                      className="w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0D1320] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Hapus pencarian"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Segmented Filter Controls */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 overflow-x-auto">
                    {(
                      [
                        { id: 'all', label: 'Semua' },
                        { id: 'in_transit', label: 'Dikirim' },
                        { id: 'waiting', label: 'Menunggu' },
                        { id: 'delivered', label: 'Diterima' },
                        { id: 'issue', label: 'Bermasalah' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setStatusFilter(tab.id);
                          setMobileDetailOpen(false);
                        }}
                        className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
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

                {/* Master-Detail Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Package List */}
                  <div
                    className={`lg:col-span-5 space-y-3 ${
                      mobileDetailOpen ? 'hidden lg:block' : 'block'
                    }`}
                  >
                    {filteredPackages.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0D1320] p-8 text-center space-y-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          Tidak ada paket yang sesuai filter
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Ubah kata kunci pencarian atau pilih tab status lain.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                          }}
                          className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                        >
                          Reset Filter
                        </button>
                      </div>
                    ) : (
                      filteredPackages.map((pkg) => (
                        <PackageCard
                          key={pkg.id}
                          pkg={pkg}
                          isSelected={selectedPackage?.id === pkg.id}
                          isRefreshing={Boolean(refreshingIds[pkg.id])}
                          onSelect={(chosen) => {
                            setSelectedPackageId(chosen.id);
                            setMobileDetailOpen(true);
                          }}
                          onRefresh={handleRefreshPackage}
                          onRetrack={handleRetrack}
                          onRename={handleRename}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
                  </div>

                  {/* Right Column: Package Detail & Timeline */}
                  <div
                    className={`lg:col-span-7 lg:sticky lg:top-20 ${
                      mobileDetailOpen ? 'block' : 'hidden lg:block'
                    }`}
                  >
                    {selectedPackage ? (
                      <PackageDetailView
                        pkg={selectedPackage}
                        isRefreshing={Boolean(refreshingIds[selectedPackage.id])}
                        onBackMobile={() => setMobileDetailOpen(false)}
                        onRefresh={handleRefreshPackage}
                        onRetrack={handleRetrack}
                        onRename={handleRename}
                        onDelete={handleDelete}
                      />
                    ) : (
                      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0D1320] p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        Pilih salah satu paket di sebelah kiri untuk melihat detail pengiriman dan timeline perjalanan.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'track' && (
          <motion.div
            key="track"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            <div className="lg:col-span-7">
              <TrackingForm
                couriers={couriers}
                couriersLoading={couriersLoading}
                initialAwb={formDefaults.awb}
                initialCourier={formDefaults.courier}
                initialLabel={formDefaults.label}
                initialPhoneLast5={formDefaults.phoneLast5}
                initialDate={formDefaults.date}
                isSubmitting={isTracking}
                error={trackError}
                onSubmit={handleTrackSubmit}
                onClearError={() => setTrackError(null)}
              />
            </div>

            <aside className="lg:col-span-5 space-y-4">
              {isTracking ? (
                <DetailSkeleton />
              ) : (
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0D1320] p-5 sm:p-6 space-y-4">
                  <h3 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                    Panduan Pelacakan &amp; Deteksi Ekspedisi
                  </h3>
                  <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    <li>
                      <span className="font-medium text-slate-900 dark:text-slate-200">
                        Pilihan Manual Direkomendasikan:
                      </span>{' '}
                      API resmi BinderByte membutuhkan kode ekspedisi pada setiap pelacakan. Memilih kurir secara langsung memberi hasil tercepat dan menghemat kuota API.
                    </li>
                    <li>
                      <span className="font-medium text-slate-900 dark:text-slate-200">
                        Deteksi Otomatis Cerdas:
                      </span>{' '}
                      Saat Anda mengetik nomor resi dengan awalan khas (misalnya <code className="font-mono text-xs">SPXID</code>, <code className="font-mono text-xs">JP</code>, <code className="font-mono text-xs">11LP</code>, <code className="font-mono text-xs">IDS</code>, <code className="font-mono text-xs">NLID</code>), sistem mengenali pola secara instan sebelum mengirim permintaan ke API.
                    </li>
                    <li>
                      <span className="font-medium text-slate-900 dark:text-slate-200">
                        Khusus Kurir JNE &amp; Laris Cargo:
                      </span>{' '}
                      Beberapa resi JNE memerlukan 5 digit akhir nomor HP penerima sebagai verifikasi, sedangkan Laris Cargo dapat menyertakan tanggal transaksi.
                    </li>
                  </ul>

                  {packages.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Terakhir Dilacak
                      </p>
                      <div className="space-y-2">
                        {packages.slice(0, 3).map((pkg) => (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => {
                              setSelectedPackageId(pkg.id);
                              setActiveTab('dashboard');
                              setMobileDetailOpen(true);
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-600 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {pkg.label}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                                {pkg.courierName} · {pkg.awb}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-sky-600 dark:text-sky-400 shrink-0">
                              Lihat
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </aside>
          </motion.div>
        )}

        {activeTab === 'couriers' && (
          <motion.div
            key="couriers"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            <CourierDirectory
              couriers={couriers}
              source={couriersSource}
              warning={couriersWarning}
              isLoading={couriersLoading}
              onRefresh={() => loadInitialMeta(true)}
              onSelectCourierToTrack={handleSelectCourierFromDirectory}
            />
          </motion.div>
        )}
      </main>

      <OfflineIndicator />
      <PWAUpdateBanner />

      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'dashboard') setMobileDetailOpen(false);
        }}
        savedCount={packages.length}
      />
    </div>
  );
}
