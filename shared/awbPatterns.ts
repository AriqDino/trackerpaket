export interface AwbPatternMatch {
  courierCode: string;
  courierName: string;
  confidence: 'tinggi' | 'sedang';
  reason: string;
}

interface PatternRule {
  courierCode: string;
  courierName: string;
  regex: RegExp;
  confidence: 'tinggi' | 'sedang';
  reason: string;
}

const AWB_PATTERN_RULES: PatternRule[] = [
  {
    courierCode: 'spx',
    courierName: 'Shopee Express (SPX)',
    regex: /^SPXID[A-Z0-9]{8,}$/i,
    confidence: 'tinggi',
    reason: 'Awalan SPXID khas Shopee Express',
  },
  {
    courierCode: 'jnt',
    courierName: 'J&T Express',
    regex: /^(JP|JX|JD|JT)[0-9]{8,14}$/i,
    confidence: 'tinggi',
    reason: 'Awalan JP/JX/JD/JT khas J&T Express',
  },
  {
    courierCode: 'ninja',
    courierName: 'Ninja Xpress',
    regex: /^(NLID|NVID|NINJA)[A-Z0-9]{6,}$/i,
    confidence: 'tinggi',
    reason: 'Awalan NLID/NVID khas Ninja Xpress',
  },
  {
    courierCode: 'ide',
    courierName: 'ID Express',
    regex: /^(IDS|IDE)[0-9]{9,}$/i,
    confidence: 'tinggi',
    reason: 'Awalan IDS/IDE khas ID Express',
  },
  {
    courierCode: 'lion',
    courierName: 'Lion Parcel',
    regex: /^(11LP|19LP|88LP|99LP)[0-9]{8,}$/i,
    confidence: 'tinggi',
    reason: 'Format LP khas Lion Parcel',
  },
  {
    courierCode: 'lex',
    courierName: 'Lazada Express (LEX)',
    regex: /^(LXAD|LX)[0-9A-Z]{8,}$/i,
    confidence: 'tinggi',
    reason: 'Awalan LXAD/LX khas Lazada Express',
  },
  {
    courierCode: 'kurir_tokopedia',
    courierName: 'Kurir Tokopedia',
    regex: /^TKP[0-9A-Z]{7,}$/i,
    confidence: 'tinggi',
    reason: 'Awalan TKP khas Kurir Tokopedia',
  },
  {
    courierCode: 'jne',
    courierName: 'JNE Express',
    regex: /^(SOCAG|CGK|BDO|SUB|TLJR|JNE)[A-Z0-9]{6,}$/i,
    confidence: 'tinggi',
    reason: 'Prefix kode cabang JNE',
  },
  {
    courierCode: 'anteraja',
    courierName: 'AnterAja',
    regex: /^1000[0-9]{10}$/,
    confidence: 'sedang',
    reason: '14 digit diawali 1000 khas AnterAja',
  },
  {
    courierCode: 'sicepat',
    courierName: 'SiCepat Express',
    regex: /^00[0-9]{10}$/,
    confidence: 'sedang',
    reason: '12 digit diawali 00 khas SiCepat',
  },
  {
    courierCode: 'tiki',
    courierName: 'TIKI',
    regex: /^030[0-9]{9}$/,
    confidence: 'sedang',
    reason: '12 digit diawali 030 khas TIKI',
  },
  {
    courierCode: 'jnt_cargo',
    courierName: 'J&T Cargo',
    regex: /^(200[0-9]{9,12}|JTC[0-9A-Z]{7,})$/i,
    confidence: 'sedang',
    reason: 'Format resi J&T Cargo',
  },
  {
    courierCode: 'jne',
    courierName: 'JNE Express',
    regex: /^[0-9]{15,16}$/,
    confidence: 'sedang',
    reason: '15–16 digit numerik umum digunakan JNE',
  },
  {
    courierCode: 'pos',
    courierName: 'POS Indonesia',
    regex: /^(P[0-9]{10,14}|[0-9]{11})$/,
    confidence: 'sedang',
    reason: '11 digit atau awalan P khas POS Indonesia',
  },
];

export function matchAwbPatterns(rawAwb: string): AwbPatternMatch[] {
  const awb = rawAwb.trim().toUpperCase();
  if (awb.length < 5) return [];

  const matches: AwbPatternMatch[] = [];
  const seen = new Set<string>();

  for (const rule of AWB_PATTERN_RULES) {
    if (rule.regex.test(awb) && !seen.has(rule.courierCode)) {
      seen.add(rule.courierCode);
      matches.push({
        courierCode: rule.courierCode,
        courierName: rule.courierName,
        confidence: rule.confidence,
        reason: rule.reason,
      });
    }
  }

  return matches.slice(0, 3);
}

export function validateAwbFormat(rawAwb: string): { valid: boolean; cleaned: string; message?: string } {
  const cleaned = rawAwb.trim().replace(/\s+/g, '');
  if (!cleaned) {
    return { valid: false, cleaned: '', message: 'Nomor resi wajib diisi.' };
  }
  if (cleaned.length < 5) {
    return { valid: false, cleaned, message: 'Nomor resi terlalu pendek (minimal 5 karakter).' };
  }
  if (cleaned.length > 40) {
    return { valid: false, cleaned, message: 'Nomor resi terlalu panjang (maksimal 40 karakter).' };
  }
  if (!/^[A-Za-z0-9\-_]+$/.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      message: 'Nomor resi hanya boleh berisi huruf, angka, tanda hubung (-), atau garis bawah (_).',
    };
  }
  return { valid: true, cleaned };
}
