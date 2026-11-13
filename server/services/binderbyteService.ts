import {
  BINDERBYTE_BASE_URL,
  BINDERBYTE_TIMEOUT_MS,
  COURIER_CACHE_TTL_MS,
  OFFICIAL_BINDERBYTE_COURIERS,
  TRACK_CACHE_TTL_MS,
  getBinderByteApiKey,
} from '../config/binderbyte.ts';
import { matchAwbPatterns, validateAwbFormat } from '../../shared/awbPatterns.ts';
import type {
  CourierInfo,
  CourierStatus,
  CouriersApiResponse,
  NormalizedTrackingResult,
  PackageStatus,
  TrackingHistoryItem,
} from '../../shared/types.ts';
import { TtlCache } from './cache.ts';

export class BinderByteServiceError extends Error {
  public readonly httpStatus: number;
  public readonly code: string;
  public readonly hint?: string;

  constructor(options: { message: string; httpStatus: number; code: string; hint?: string }) {
    super(options.message);
    this.name = 'BinderByteServiceError';
    this.httpStatus = options.httpStatus;
    this.code = options.code;
    this.hint = options.hint;
  }
}

interface BinderByteRawTrackResponse {
  status?: number | string;
  message?: string;
  data?: {
    summary?: {
      awb?: string;
      courier?: string;
      service?: string;
      status?: string;
      date?: string;
      desc?: string;
      amount?: string;
      weight?: string;
      eta?: string;
      estimated_delivery?: string;
    };
    detail?: {
      origin?: string;
      destination?: string;
      shipper?: string;
      receiver?: string;
    };
    history?: Array<{
      date?: string;
      desc?: string;
      location?: string;
    }>;
  };
}

interface BinderByteRawCourierItem {
  code?: string;
  name?: string;
  description?: string;
  status?: string;
}

const courierCache = new TtlCache<CourierInfo[]>(10);
const trackCache = new TtlCache<NormalizedTrackingResult>(400);

function safeString(val: unknown): string {
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  return '';
}

function normalizeCourierStatus(raw?: string): CourierStatus {
  const s = safeString(raw).toLowerCase();
  if (s === 'online' || s === 'active' || s === 'normal') return 'online';
  if (s === 'offline' || s === 'down') return 'offline';
  if (s === 'maintenance') return 'maintenance';
  return 'unknown';
}

/**
 * Menormalkan status dari respons BinderByte ke 4 status UI standar:
 * Menunggu (waiting), Dalam Pengiriman (in_transit), Diterima (delivered), Bermasalah (issue)
 */
export function parsePackageStatus(rawStatus: string, latestDesc = '', historyCount = 0): PackageStatus {
  const combined = `${rawStatus} ${latestDesc}`.toUpperCase();
  const statusOnly = rawStatus.toUpperCase();

  // Cek status bermasalah terlebih dahulu agar tidak tertukar dengan delivered/in_transit
  const issueKeywords = [
    'RETURN',
    'RTS',
    'RETUR',
    'GAGAL',
    'FAILED',
    'FAIL',
    'CANCEL',
    'DIBATALKAN',
    'BERMASALAH',
    'PROBLEM',
    'LOST',
    'HILANG',
    'REJECT',
    'DITOLAK',
    'UNDELIVERED',
    'TIDAK TERKIRIM',
    'ALAMAT TIDAK DITEMUKAN',
    'WRONG ADDRESS',
    'HOLD',
    'CRISS CROSS',
    'RUSAK',
    'DAMAGED',
  ];

  // "FAILED" pada percobaan antar tapi paket sudah DELIVERED harus tetap dianggap delivered jika summary DELIVERED
  const isSummaryDelivered =
    statusOnly.includes('DELIVERED') ||
    statusOnly.includes('TERKIRIM') ||
    statusOnly.includes('DITERIMA') ||
    statusOnly.includes('SELESAI') ||
    statusOnly === 'POD';

  if (isSummaryDelivered && !statusOnly.includes('FAIL') && !statusOnly.includes('RETURN') && !statusOnly.includes('UNDELIVERED')) {
    return 'delivered';
  }

  if (issueKeywords.some((kw) => statusOnly.includes(kw))) {
    return 'issue';
  }

  // Jika summary belum delivered, cek deskripsi riwayat terbaru untuk indikasi kendala serius
  const latestUpper = latestDesc.toUpperCase();
  if (
    latestUpper.includes('RETURN TO SHIPPER') ||
    latestUpper.includes('RETUR') ||
    latestUpper.includes('DELIVERY FAILED') ||
    latestUpper.includes('GAGAL ANTAR') ||
    latestUpper.includes('CANCELLED') ||
    latestUpper.includes('DIBATALKAN') ||
    latestUpper.includes('HILANG')
  ) {
    return 'issue';
  }

  const waitingKeywords = [
    'MANIFEST',
    'CREATED',
    'BOOKED',
    'PENDING',
    'MENUNGGU',
    'WAITING',
    'REQUEST PICKUP',
    'PICKUP REQUEST',
    'ORDER DIBUAT',
    'BELUM DIKIRIM',
    'SIAP DIKIRIM',
    'DATA RECEIVED',
  ];

  if (waitingKeywords.some((kw) => statusOnly.includes(kw))) {
    return 'waiting';
  }

  const transitKeywords = [
    'ON PROCESS',
    'ON_PROCESS',
    'IN TRANSIT',
    'TRANSIT',
    'ON DELIVERY',
    'WITH DELIVERY COURIER',
    'OUT FOR DELIVERY',
    'SHIPPED',
    'DISPATCHED',
    'SORTING',
    'DEPARTED',
    'ARRIVED',
    'RECEIVED AT',
    'SEDANG DIKIRIM',
    'DALAM PENGIRIMAN',
    'PROSES',
  ];

  if (transitKeywords.some((kw) => combined.includes(kw))) {
    return 'in_transit';
  }

  if (historyCount > 0) {
    return 'in_transit';
  }

  return 'waiting';
}

function extractEstimatedArrival(summary?: BinderByteRawTrackResponse['data'] extends infer D
  ? D extends { summary?: infer S }
    ? S
    : never
  : never): string | null {
  if (!summary) return null;
  const direct = safeString(summary.eta) || safeString(summary.estimated_delivery);
  return direct || null;
}

async function fetchJsonWithTimeout(url: string): Promise<{ httpStatus: number; rawText: string; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BINDERBYTE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    const rawText = await response.text();
    if (!rawText || !rawText.trim()) {
      return { httpStatus: response.status, rawText: '', json: null };
    }

    try {
      const json = JSON.parse(rawText);
      return { httpStatus: response.status, rawText, json };
    } catch {
      return { httpStatus: response.status, rawText, json: null };
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new BinderByteServiceError({
        code: 'API_TIMEOUT',
        httpStatus: 504,
        message: 'Koneksi ke server BinderByte melebihi batas waktu (timeout).',
        hint: 'Periksa koneksi internet Anda atau coba lacak ulang beberapa saat lagi.',
      });
    }
    throw new BinderByteServiceError({
      code: 'NETWORK_ERROR',
      httpStatus: 502,
      message: 'Gagal terhubung ke server BinderByte.',
      hint: 'Pastikan server memiliki akses internet keluar ke api.binderbyte.com.',
    });
  } finally {
    clearTimeout(timer);
  }
}

function mapBinderByteHttpError(httpStatus: number, apiMessage: string): BinderByteServiceError {
  const lower = apiMessage.toLowerCase();

  if (httpStatus === 401 || lower.includes('invalid api key') || lower.includes('api key tidak valid')) {
    return new BinderByteServiceError({
      code: 'INVALID_API_KEY',
      httpStatus: 401,
      message: 'API Key BinderByte tidak valid atau kedaluwarsa.',
      hint: 'Periksa kembali nilai BINDERBYTE_API_KEY di environment server Anda.',
    });
  }

  if (httpStatus === 403 || lower.includes('tidak memiliki akses')) {
    return new BinderByteServiceError({
      code: 'API_FORBIDDEN',
      httpStatus: 403,
      message: apiMessage || 'API Key tidak memiliki izin akses ke endpoint BinderByte ini.',
      hint: 'Pastikan layanan API Cek Resi aktif pada akun BinderByte Anda.',
    });
  }

  if (httpStatus === 429 || lower.includes('too many') || lower.includes('rate limit')) {
    return new BinderByteServiceError({
      code: 'RATE_LIMIT_EXCEEDED',
      httpStatus: 429,
      message: 'Batas kecepatan permintaan API BinderByte tercapai (rate limit).',
      hint: 'Tunggu beberapa detik sebelum mencoba melacak ulang.',
    });
  }

  if (lower.includes('credit') || lower.includes('kuota') || lower.includes('saldo')) {
    return new BinderByteServiceError({
      code: 'QUOTA_EXHAUSTED',
      httpStatus: 402,
      message: apiMessage || 'Kuota atau kredit API BinderByte Anda telah habis.',
      hint: 'Silakan isi ulang kredit di dashboard resmi binderbyte.com.',
    });
  }

  if (httpStatus === 503 || httpStatus === 500 || lower.includes('pemeliharaan') || lower.includes('maintenance')) {
    return new BinderByteServiceError({
      code: 'SERVICE_UNAVAILABLE',
      httpStatus: 503,
      message: apiMessage || 'Layanan BinderByte atau sistem ekspedisi sedang dalam pemeliharaan.',
      hint: 'Silakan coba kembali beberapa saat lagi.',
    });
  }

  if (httpStatus === 400 || httpStatus === 404) {
    return new BinderByteServiceError({
      code: 'TRACKING_NOT_FOUND',
      httpStatus: 404,
      message: apiMessage || 'Data resi tidak ditemukan atau kombinasi kurir dan nomor resi tidak sesuai.',
      hint: 'Pastikan nomor resi benar, ekspedisi sesuai, dan paket sudah diproses oleh kurir (untuk JNE, coba isi 5 digit akhir nomor HP penerima).',
    });
  }

  return new BinderByteServiceError({
    code: 'BINDERBYTE_API_ERROR',
    httpStatus: httpStatus >= 400 ? httpStatus : 502,
    message: apiMessage || 'Terjadi kendala saat memproses permintaan dari BinderByte.',
  });
}

function enrichCourierMeta(item: { code: string; name: string; status: CourierStatus }): CourierInfo {
  const known = OFFICIAL_BINDERBYTE_COURIERS.find((c) => c.code === item.code);
  return {
    code: item.code,
    name: item.name || known?.name || item.code.toUpperCase(),
    status: item.status,
    requiresPhoneSuffix: known?.requiresPhoneSuffix || item.code === 'jne',
    requiresDate: known?.requiresDate || item.code === 'laris_cargo',
  };
}

export async function fetchCouriers(forceRefresh = false): Promise<CouriersApiResponse> {
  const apiKey = getBinderByteApiKey();
  if (!apiKey) {
    return {
      couriers: OFFICIAL_BINDERBYTE_COURIERS,
      source: 'catalog',
      apiConfigured: false,
      cached: false,
      fetchedAt: new Date().toISOString(),
      warning: 'BINDERBYTE_API_KEY belum dikonfigurasi. Menampilkan katalog resmi BinderByte.',
    };
  }

  const cacheKey = 'couriers_list';
  if (!forceRefresh) {
    const cached = courierCache.get(cacheKey);
    if (cached) {
      return {
        couriers: cached.value,
        source: 'live',
        apiConfigured: true,
        cached: true,
        fetchedAt: cached.storedAt,
      };
    }
  }

  try {
    const url = `${BINDERBYTE_BASE_URL}/list_courier?api_key=${encodeURIComponent(apiKey)}`;
    const { httpStatus, json } = await fetchJsonWithTimeout(url);

    if (!json || (httpStatus >= 400 && httpStatus !== 200)) {
      const msg =
        json && typeof json === 'object' && 'message' in json
          ? safeString((json as { message?: unknown }).message)
          : '';
      throw mapBinderByteHttpError(httpStatus, msg);
    }

    let rawList: BinderByteRawCourierItem[] = [];
    if (Array.isArray(json)) {
      rawList = json as BinderByteRawCourierItem[];
    } else if (typeof json === 'object' && json !== null && 'data' in json && Array.isArray((json as { data?: unknown }).data)) {
      rawList = (json as { data: BinderByteRawCourierItem[] }).data;
    }

    const normalized: CourierInfo[] = rawList
      .filter((item) => safeString(item.code).length > 0)
      .map((item) => {
        const code = safeString(item.code).toLowerCase();
        const name = safeString(item.name) || safeString(item.description);
        const status = normalizeCourierStatus(item.status);
        return enrichCourierMeta({ code, name, status });
      });

    if (normalized.length === 0) {
      return {
        couriers: OFFICIAL_BINDERBYTE_COURIERS,
        source: 'catalog',
        apiConfigured: true,
        cached: false,
        fetchedAt: new Date().toISOString(),
        warning: 'Respons daftar kurir dari BinderByte kosong. Menggunakan katalog standar.',
      };
    }

    const storedAt = courierCache.set(cacheKey, normalized, COURIER_CACHE_TTL_MS);
    return {
      couriers: normalized,
      source: 'live',
      apiConfigured: true,
      cached: false,
      fetchedAt: storedAt,
    };
  } catch (err) {
    if (err instanceof BinderByteServiceError && (err.code === 'INVALID_API_KEY' || err.code === 'API_FORBIDDEN')) {
      throw err;
    }
    return {
      couriers: OFFICIAL_BINDERBYTE_COURIERS,
      source: 'catalog',
      apiConfigured: true,
      cached: false,
      fetchedAt: new Date().toISOString(),
      warning:
        err instanceof Error
          ? `${err.message} Menampilkan daftar kurir cadangan sementara.`
          : 'Gagal mengambil daftar kurir terbaru. Menampilkan daftar cadangan.',
    };
  }
}

export interface TrackPackageParams {
  awb: string;
  courier: string;
  number?: string;
  date?: string;
  forceRefresh?: boolean;
}

export async function trackPackage(params: TrackPackageParams): Promise<NormalizedTrackingResult> {
  const apiKey = getBinderByteApiKey();
  if (!apiKey) {
    throw new BinderByteServiceError({
      code: 'API_KEY_NOT_CONFIGURED',
      httpStatus: 503,
      message: 'API Key BinderByte belum dikonfigurasi di server.',
      hint: 'Tambahkan BINDERBYTE_API_KEY pada file .env atau menu Secrets AI Studio, lalu muat ulang aplikasi.',
    });
  }

  const awbCheck = validateAwbFormat(params.awb);
  if (!awbCheck.valid) {
    throw new BinderByteServiceError({
      code: 'INVALID_AWB',
      httpStatus: 400,
      message: awbCheck.message || 'Format nomor resi tidak valid.',
    });
  }

  const courierCode = safeString(params.courier).toLowerCase();
  if (!courierCode) {
    throw new BinderByteServiceError({
      code: 'COURIER_REQUIRED',
      httpStatus: 400,
      message: 'Kode ekspedisi wajib dipilih.',
    });
  }

  const phoneLast5 = safeString(params.number).replace(/\D/g, '');
  if (phoneLast5 && phoneLast5.length !== 5) {
    throw new BinderByteServiceError({
      code: 'INVALID_PHONE_SUFFIX',
      httpStatus: 400,
      message: 'Nomor verifikasi penerima JNE harus berupa tepat 5 digit terakhir nomor telepon.',
    });
  }

  const txDate = safeString(params.date);
  if (txDate && !/^\d{4}-\d{2}-\d{2}$/.test(txDate)) {
    throw new BinderByteServiceError({
      code: 'INVALID_DATE_FORMAT',
      httpStatus: 400,
      message: 'Format tanggal transaksi harus YYYY-MM-DD.',
    });
  }

  const cacheKey = `${courierCode}:${awbCheck.cleaned.toUpperCase()}:${phoneLast5}:${txDate}`;
  if (!params.forceRefresh) {
    const cached = trackCache.get(cacheKey);
    if (cached) {
      return {
        ...cached.value,
        cached: true,
        fetchedAt: cached.storedAt,
      };
    }
  }

  const query = new URLSearchParams({
    api_key: apiKey,
    courier: courierCode,
    awb: awbCheck.cleaned,
  });

  if (phoneLast5 && courierCode === 'jne') {
    query.set('number', phoneLast5);
  }
  if (txDate && courierCode === 'laris_cargo') {
    query.set('date', txDate);
  }

  const url = `${BINDERBYTE_BASE_URL}/track?${query.toString()}`;
  const { httpStatus, json } = await fetchJsonWithTimeout(url);

  if (!json || typeof json !== 'object') {
    throw new BinderByteServiceError({
      code: 'EMPTY_RESPONSE',
      httpStatus: 502,
      message: 'Server BinderByte mengembalikan respons kosong atau tidak valid.',
      hint: 'Silakan coba lacak ulang beberapa saat lagi.',
    });
  }

  const parsed = json as BinderByteRawTrackResponse;
  const bodyStatus = Number(parsed.status ?? httpStatus);
  const apiMessage = safeString(parsed.message);

  if (httpStatus >= 400 || bodyStatus !== 200 || !parsed.data) {
    throw mapBinderByteHttpError(httpStatus >= 400 ? httpStatus : bodyStatus || 400, apiMessage);
  }

  const rawSummary = parsed.data.summary ?? {};
  const rawDetail = parsed.data.detail ?? {};
  const rawHistory = Array.isArray(parsed.data.history) ? parsed.data.history : [];

  const history: TrackingHistoryItem[] = rawHistory
    .map((h) => ({
      date: safeString(h.date),
      desc: safeString(h.desc) || 'Pembaruan status pengiriman',
      location: safeString(h.location),
    }))
    .filter((h) => h.date || h.desc);

  const rawStatusText = safeString(rawSummary.status) || 'UNKNOWN';
  const latestDesc = history[0]?.desc || safeString(rawSummary.desc);
  const normalizedStatus = parsePackageStatus(rawStatusText, latestDesc, history.length);

  const knownCourier = OFFICIAL_BINDERBYTE_COURIERS.find((c) => c.code === courierCode);
  const courierName = safeString(rawSummary.courier) || knownCourier?.name || courierCode.toUpperCase();

  const normalizedResult: NormalizedTrackingResult = {
    awb: safeString(rawSummary.awb) || awbCheck.cleaned,
    courierCode,
    courierName,
    normalizedStatus,
    rawStatus: rawStatusText,
    estimatedArrival: extractEstimatedArrival(rawSummary),
    summary: {
      awb: safeString(rawSummary.awb) || awbCheck.cleaned,
      courier: courierName,
      service: safeString(rawSummary.service),
      status: rawStatusText,
      date: safeString(rawSummary.date),
      desc: safeString(rawSummary.desc),
      amount: safeString(rawSummary.amount),
      weight: safeString(rawSummary.weight),
    },
    detail: {
      origin: safeString(rawDetail.origin),
      destination: safeString(rawDetail.destination),
      shipper: safeString(rawDetail.shipper),
      receiver: safeString(rawDetail.receiver),
    },
    history,
    cached: false,
    fetchedAt: new Date().toISOString(),
  };

  const storedAt = trackCache.set(cacheKey, normalizedResult, TRACK_CACHE_TTL_MS);
  return {
    ...normalizedResult,
    fetchedAt: storedAt,
  };
}

export async function detectAndTrack(params: {
  awb: string;
  number?: string;
  date?: string;
  forceRefresh?: boolean;
}): Promise<NormalizedTrackingResult> {
  const awbCheck = validateAwbFormat(params.awb);
  if (!awbCheck.valid) {
    throw new BinderByteServiceError({
      code: 'INVALID_AWB',
      httpStatus: 400,
      message: awbCheck.message || 'Format nomor resi tidak valid.',
    });
  }

  const candidates = matchAwbPatterns(awbCheck.cleaned);
  if (candidates.length === 0) {
    throw new BinderByteServiceError({
      code: 'COURIER_REQUIRED_FOR_DETECTION',
      httpStatus: 400,
      message: 'Pola nomor resi tidak dapat dikenali secara otomatis.',
      hint: 'API BinderByte membutuhkan kode ekspedisi secara eksplisit. Silakan pilih ekspedisi secara manual agar tidak memboroskan kuota API.',
    });
  }

  let lastNotFoundError: BinderByteServiceError | null = null;

  for (const candidate of candidates) {
    try {
      const result = await trackPackage({
        awb: awbCheck.cleaned,
        courier: candidate.courierCode,
        number: params.number,
        date: params.date,
        forceRefresh: params.forceRefresh,
      });
      return {
        ...result,
        detectedAutomatically: true,
      };
    } catch (err) {
      if (err instanceof BinderByteServiceError) {
        // Jangan ulangi jika error berasal dari konfigurasi, kuota, atau rate limit
        if (
          err.code === 'API_KEY_NOT_CONFIGURED' ||
          err.code === 'INVALID_API_KEY' ||
          err.code === 'API_FORBIDDEN' ||
          err.code === 'QUOTA_EXHAUSTED' ||
          err.code === 'RATE_LIMIT_EXCEEDED'
        ) {
          throw err;
        }
        lastNotFoundError = err;
        continue;
      }
      throw err;
    }
  }

  throw (
    lastNotFoundError ||
    new BinderByteServiceError({
      code: 'TRACKING_NOT_FOUND',
      httpStatus: 404,
      message: `Resi tidak ditemukan pada kandidat kurir (${candidates.map((c) => c.courierName).join(', ')}).`,
      hint: 'Coba pilih ekspedisi secara manual dari daftar.',
    })
  );
}
