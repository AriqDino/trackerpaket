import { Router } from 'express';
import { getBinderByteApiKey } from '../config/binderbyte.ts';
import {
  BinderByteServiceError,
  detectAndTrack,
  fetchCouriers,
  trackPackage,
} from '../services/binderbyteService.ts';
import type { ApiErrorPayload, HealthStatusResponse } from '../../shared/types.ts';

export const trackingRouter = Router();

function sendServiceError(res: import('express').Response, err: unknown): void {
  if (err instanceof BinderByteServiceError) {
    const payload: ApiErrorPayload = {
      error: true,
      code: err.code,
      message: err.message,
      hint: err.hint,
      httpStatus: err.httpStatus,
    };
    res.status(err.httpStatus).json(payload);
    return;
  }

  const payload: ApiErrorPayload = {
    error: true,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Terjadi kesalahan internal pada server saat memproses pelacakan.',
    httpStatus: 500,
  };
  res.status(500).json(payload);
}

trackingRouter.get('/health', (_req, res) => {
  const payload: HealthStatusResponse = {
    ok: true,
    apiConfigured: Boolean(getBinderByteApiKey()),
    timestamp: new Date().toISOString(),
  };
  res.json(payload);
});

trackingRouter.get('/couriers', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const result = await fetchCouriers(forceRefresh);
    res.json(result);
  } catch (err) {
    sendServiceError(res, err);
  }
});

trackingRouter.get('/track', async (req, res) => {
  try {
    const awb = typeof req.query.awb === 'string' ? req.query.awb : '';
    const courier = typeof req.query.courier === 'string' ? req.query.courier : '';
    const number = typeof req.query.number === 'string' ? req.query.number : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';

    if (!awb.trim()) {
      throw new BinderByteServiceError({
        code: 'INVALID_AWB',
        httpStatus: 400,
        message: 'Parameter nomor resi (awb) wajib diisi.',
      });
    }

    const result =
      !courier || courier.toLowerCase() === 'auto'
        ? await detectAndTrack({ awb, number, date, forceRefresh })
        : await trackPackage({ awb, courier, number, date, forceRefresh });

    res.json(result);
  } catch (err) {
    sendServiceError(res, err);
  }
});
