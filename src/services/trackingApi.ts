import type {
  ApiErrorPayload,
  CouriersApiResponse,
  HealthStatusResponse,
  NormalizedTrackingResult,
} from '../../shared/types';

export class TrackingApiError extends Error {
  public readonly code: string;
  public readonly hint?: string;
  public readonly httpStatus: number;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'TrackingApiError';
    this.code = payload.code;
    this.hint = payload.hint;
    this.httpStatus = payload.httpStatus;
  }
}

const inFlightTrackRequests = new Map<string, Promise<NormalizedTrackingResult>>();

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new TrackingApiError({
      error: true,
      code: 'EMPTY_RESPONSE',
      message: 'Server mengembalikan respons kosong.',
      httpStatus: res.status || 502,
    });
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new TrackingApiError({
      error: true,
      code: 'INVALID_JSON',
      message: 'Format respons server tidak valid.',
      httpStatus: res.status || 502,
    });
  }

  if (!res.ok) {
    const err = data as Partial<ApiErrorPayload>;
    throw new TrackingApiError({
      error: true,
      code: err.code || 'API_ERROR',
      message: err.message || 'Gagal memproses permintaan.',
      hint: err.hint,
      httpStatus: res.status,
    });
  }

  return data as T;
}

export async function fetchHealthStatus(): Promise<HealthStatusResponse> {
  const res = await fetch('/api/health', {
    headers: { Accept: 'application/json' },
  });
  return parseJsonResponse<HealthStatusResponse>(res);
}

export async function fetchCouriersList(forceRefresh = false): Promise<CouriersApiResponse> {
  const url = forceRefresh ? '/api/couriers?refresh=true' : '/api/couriers';
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  return parseJsonResponse<CouriersApiResponse>(res);
}

export interface TrackPackageRequest {
  awb: string;
  courier: string;
  number?: string;
  date?: string;
  refresh?: boolean;
}

export async function trackPackageRequest(
  params: TrackPackageRequest
): Promise<NormalizedTrackingResult> {
  const cleanAwb = params.awb.trim();
  const cleanCourier = params.courier.trim().toLowerCase() || 'auto';
  const dedupeKey = `${cleanCourier}:${cleanAwb.toUpperCase()}:${params.number || ''}:${params.date || ''}:${Boolean(params.refresh)}`;

  const existing = inFlightTrackRequests.get(dedupeKey);
  if (existing) {
    return existing;
  }

  const query = new URLSearchParams({
    awb: cleanAwb,
    courier: cleanCourier,
  });
  if (params.number?.trim()) {
    query.set('number', params.number.trim());
  }
  if (params.date?.trim()) {
    query.set('date', params.date.trim());
  }
  if (params.refresh) {
    query.set('refresh', 'true');
  }

  const requestPromise = (async () => {
    try {
      const res = await fetch(`/api/track?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      return await parseJsonResponse<NormalizedTrackingResult>(res);
    } finally {
      inFlightTrackRequests.delete(dedupeKey);
    }
  })();

  inFlightTrackRequests.set(dedupeKey, requestPromise);
  return requestPromise;
}
