import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BinderByteServiceError,
  detectAndTrack,
  fetchCouriers,
  parsePackageStatus,
  trackPackage,
} from '../server/services/binderbyteService.ts';

test('parsePackageStatus memetakan status BinderByte ke 4 kategori standar', () => {
  assert.equal(parsePackageStatus('DELIVERED', 'DELIVERED TO [RESALINA]', 3), 'delivered');
  assert.equal(parsePackageStatus('ON PROCESS', 'WITH DELIVERY COURIER', 2), 'in_transit');
  assert.equal(parsePackageStatus('MANIFEST', 'DATA RECEIVED', 1), 'waiting');
  assert.equal(parsePackageStatus('RETURN TO SHIPPER', 'RETUR KE PENGIRIM', 3), 'issue');
  assert.equal(parsePackageStatus('ON PROCESS', 'DELIVERY FAILED - ALAMAT TIDAK DITEMUKAN', 3), 'issue');
});

test('trackPackage memproses respons resmi BinderByte v1/track dan menerapkan cache', async () => {
  process.env.BINDERBYTE_API_KEY = 'test-key-only-for-unit-test';
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  const officialMockPayload = {
    status: 200,
    message: 'Successfully tracked package',
    data: {
      summary: {
        awb: '8825112045716759',
        courier: 'JNE Express',
        service: 'REG*',
        status: 'DELIVERED',
        date: '2020-09-29 01:50:00',
        desc: '',
        amount: '37.000',
        weight: '0.4Kg',
      },
      detail: {
        origin: 'DEPOK',
        destination: 'PRINGSEWU, PRINGSEWU',
        shipper: 'TASIMPORTBATAMMURAH',
        receiver: 'RESALINA OKTARIA',
      },
      history: [
        {
          date: '2020-10-02 13:33:00',
          desc: 'DELIVERED TO [RESALINA | 02-10-2020 13:33 | PRINGSEWU]',
          location: '',
        },
        {
          date: '2020-10-02 09:09:00',
          desc: 'WITH DELIVERY COURIER []',
          location: '',
        },
        {
          date: '2020-09-29 01:50:00',
          desc: 'SHIPMENT RECEIVED BY JNE COUNTER OFFICER AT [DEPOK]',
          location: '',
        },
      ],
    },
  };

  globalThis.fetch = async (input) => {
    fetchCalls += 1;
    const urlStr = String(input);
    assert.ok(urlStr.includes('https://api.binderbyte.com/v1/track'));
    assert.ok(urlStr.includes('courier=jne'));
    assert.ok(urlStr.includes('awb=8825112045716759'));
    return new Response(JSON.stringify(officialMockPayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const first = await trackPackage({
      awb: '8825112045716759',
      courier: 'jne',
    });

    assert.equal(first.awb, '8825112045716759');
    assert.equal(first.courierCode, 'jne');
    assert.equal(first.normalizedStatus, 'delivered');
    assert.equal(first.detail.origin, 'DEPOK');
    assert.equal(first.detail.receiver, 'RESALINA OKTARIA');
    assert.equal(first.history.length, 3);
    assert.equal(first.cached, false);
    assert.equal(fetchCalls, 1);

    // Panggilan kedua harus mengambil dari cache tanpa memanggil API
    const second = await trackPackage({
      awb: '8825112045716759',
      courier: 'jne',
    });
    assert.equal(second.cached, true);
    assert.equal(fetchCalls, 1);

    // forceRefresh harus memanggil API ulang
    const refreshed = await trackPackage({
      awb: '8825112045716759',
      courier: 'jne',
      forceRefresh: true,
    });
    assert.equal(refreshed.cached, false);
    assert.equal(fetchCalls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.BINDERBYTE_API_KEY;
  }
});

test('fetchCouriers memproses respons resmi BinderByte v1/list_courier', async () => {
  process.env.BINDERBYTE_API_KEY = 'test-key-only-for-unit-test';
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        data: [
          { code: 'jne', name: 'Jalur Nugraha Ekakurir (JNE)', status: 'online' },
          { code: 'jnt', name: 'J&T Express', status: 'online' },
          { code: 'sicepat', name: 'SiCepat Express', status: 'maintenance' },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  try {
    const res = await fetchCouriers(true);
    assert.equal(res.source, 'live');
    assert.equal(res.couriers.length, 3);
    assert.equal(res.couriers[0].code, 'jne');
    assert.equal(res.couriers[0].requiresPhoneSuffix, true);
    assert.equal(res.couriers[2].status, 'maintenance');
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.BINDERBYTE_API_KEY;
  }
});

test('trackPackage menangani error kuota habis (400) dan rate limit (429)', async () => {
  process.env.BINDERBYTE_API_KEY = 'test-key-only-for-unit-test';
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: 400,
        message: 'Credit tidak cukup, silakan lakukan topup credit.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  try {
    await assert.rejects(
      () => trackPackage({ awb: 'JP1234567890', courier: 'jnt', forceRefresh: true }),
      (err: unknown) =>
        err instanceof BinderByteServiceError && err.code === 'QUOTA_EXHAUSTED'
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.BINDERBYTE_API_KEY;
  }
});

test('detectAndTrack mendeteksi pola SPXID tanpa membakar kuota pada resi acak', async () => {
  process.env.BINDERBYTE_API_KEY = 'test-key-only-for-unit-test';
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const urlStr = String(input);
    assert.ok(urlStr.includes('courier=spx'));
    return new Response(
      JSON.stringify({
        status: 200,
        message: 'Successfully tracked package',
        data: {
          summary: {
            awb: 'SPXID0499887766',
            courier: 'Shopee Express',
            service: 'Standard',
            status: 'ON PROCESS',
            date: '2026-11-12 10:00:00',
            desc: '',
            amount: '',
            weight: '1Kg',
          },
          detail: {
            origin: 'JAKARTA',
            destination: 'BANDUNG',
            shipper: 'TOKO A',
            receiver: 'BUDI',
          },
          history: [
            {
              date: '2026-11-13 08:00:00',
              desc: 'Paket sedang dalam perjalanan ke hub Bandung',
              location: 'Bandung DC',
            },
          ],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  try {
    const res = await detectAndTrack({ awb: 'SPXID0499887766' });
    assert.equal(res.courierCode, 'spx');
    assert.equal(res.detectedAutomatically, true);
    assert.equal(res.normalizedStatus, 'in_transit');

    await assert.rejects(
      () => detectAndTrack({ awb: 'ABC999XYZ' }),
      (err: unknown) =>
        err instanceof BinderByteServiceError &&
        err.code === 'COURIER_REQUIRED_FOR_DETECTION'
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.BINDERBYTE_API_KEY;
  }
});
