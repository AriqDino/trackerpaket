import type { CourierInfo } from '../../shared/types.ts';

export const BINDERBYTE_BASE_URL = 'https://api.binderbyte.com/v1';
export const BINDERBYTE_TIMEOUT_MS = 12000;
export const COURIER_CACHE_TTL_MS = 15 * 60 * 1000; // 15 menit
export const TRACK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit

/**
 * Daftar ekspedisi resmi yang didukung BinderByte API v1
 * (/v1/list_courier & /v1/track).
 */
export const OFFICIAL_BINDERBYTE_COURIERS: CourierInfo[] = [
  { code: 'jne', name: 'JNE Express', status: 'online', requiresPhoneSuffix: true },
  { code: 'jnt', name: 'J&T Express', status: 'online' },
  { code: 'sicepat', name: 'SiCepat Express', status: 'online' },
  { code: 'anteraja', name: 'AnterAja', status: 'online' },
  { code: 'spx', name: 'Shopee Express (SPX)', status: 'online' },
  { code: 'pos', name: 'POS Indonesia', status: 'online' },
  { code: 'tiki', name: 'TIKI', status: 'online' },
  { code: 'wahana', name: 'Wahana Express', status: 'online' },
  { code: 'ninja', name: 'Ninja Xpress', status: 'online' },
  { code: 'lion', name: 'Lion Parcel', status: 'online' },
  { code: 'ide', name: 'ID Express', status: 'online' },
  { code: 'sap', name: 'SAP Express', status: 'online' },
  { code: 'jnt_cargo', name: 'J&T Cargo', status: 'online' },
  { code: 'lex', name: 'LEX (Lazada Express)', status: 'online' },
  { code: 'kurir_tokopedia', name: 'Kurir Tokopedia', status: 'online' },
  { code: 'indah_cargo', name: 'Indah Cargo', status: 'online' },
  { code: 'dakota', name: 'Dakota Cargo', status: 'online' },
  { code: 'rpx', name: 'RPX Holding', status: 'online' },
  { code: 'rex', name: 'REX Express', status: 'online' },
  { code: 'first', name: 'First Logistics', status: 'online' },
  { code: 'pcp', name: 'PCP Express', status: 'online' },
  { code: 'jet', name: 'JET Express', status: 'online' },
  { code: 'kgx', name: 'KGX Express', status: 'online' },
  { code: 'jxe', name: 'JX Express', status: 'online' },
  { code: 'ant_cargo', name: 'Ant Cargo', status: 'online' },
  { code: 'next_logistik', name: 'Next Logistik', status: 'online' },
  { code: 'gtl', name: 'GTL (Goto Logistics)', status: 'online' },
  { code: 'laris_cargo', name: 'Laris Cargo', status: 'online', requiresDate: true },
];

export function getBinderByteApiKey(): string | null {
  const key = process.env.BINDERBYTE_API_KEY?.trim();
  if (!key || key === 'MY_BINDERBYTE_API_KEY') {
    return null;
  }
  return key;
}
