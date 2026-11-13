export type PackageStatus = 'waiting' | 'in_transit' | 'delivered' | 'issue';

export type CourierStatus = 'online' | 'offline' | 'maintenance' | 'unknown';

export interface CourierInfo {
  code: string;
  name: string;
  status: CourierStatus;
  requiresPhoneSuffix?: boolean;
  requiresDate?: boolean;
}

export interface TrackingHistoryItem {
  date: string;
  desc: string;
  location: string;
}

export interface TrackingSummary {
  awb: string;
  courier: string;
  service: string;
  status: string;
  date: string;
  desc: string;
  amount: string;
  weight: string;
}

export interface TrackingDetail {
  origin: string;
  destination: string;
  shipper: string;
  receiver: string;
}

export interface NormalizedTrackingResult {
  awb: string;
  courierCode: string;
  courierName: string;
  normalizedStatus: PackageStatus;
  rawStatus: string;
  estimatedArrival: string | null;
  summary: TrackingSummary;
  detail: TrackingDetail;
  history: TrackingHistoryItem[];
  cached: boolean;
  fetchedAt: string;
  detectedAutomatically?: boolean;
}

export interface SavedPackage {
  id: string;
  label: string;
  awb: string;
  courierCode: string;
  courierName: string;
  phoneLast5?: string;
  transactionDate?: string;
  normalizedStatus: PackageStatus;
  tracking: NormalizedTrackingResult;
  savedAt: string;
  updatedAt: string;
}

export interface CouriersApiResponse {
  couriers: CourierInfo[];
  source: 'live' | 'catalog';
  apiConfigured: boolean;
  cached: boolean;
  fetchedAt: string;
  warning?: string;
}

export interface ApiErrorPayload {
  error: true;
  code: string;
  message: string;
  hint?: string;
  httpStatus: number;
}

export interface HealthStatusResponse {
  ok: boolean;
  apiConfigured: boolean;
  timestamp: string;
}
