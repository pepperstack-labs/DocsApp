import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../src/app.js';
import type { Appointment, Booking, Store } from '../src/store.js';

const doctorId = '00000000-0000-4000-8000-000000000001';
const input: Booking = {
  patient_name: 'Test Patient',
  doctor_id: doctorId,
  starts_at: new Date(Date.now() + 86400000).toISOString(),
  reason: 'General consultation',
};
function fixture() {
  const rows: Appointment[] = [];
  const store: Store = {
    async health() {},
    async doctors() {
      return [
        {
          id: doctorId,
          name: 'Test Doctor',
          specialty: 'General medicine',
          initials: 'TD',
        },
      ];
    },
    async appointments() {
      return rows;
    },
    async create(booking) {
      const result: Appointment = {
        ...booking,
        id: randomUUID(),
        status: 'scheduled',
        created_at: new Date().toISOString(),
      };
      rows.push(result);
      return result;
    },
    async status(id, status) {
      const row = rows.find((item) => item.id === id);
      if (row) row.status = status;
      return row;
    },
    async close() {},
  };
  return { store, app: buildApp(store) };
}
test('books, lists and updates an appointment through the public API', async (t) => {
  const { app } = fixture();
  t.after(() => app.close());
  assert.equal((await app.inject('/api/health')).json().database, 'connected');
  assert.equal((await app.inject('/api/doctors')).json()[0].id, doctorId);
  const created = await app.inject({
    method: 'POST',
    url: '/api/appointments',
    payload: input,
  });
  assert.equal(created.statusCode, 201);
  assert.equal(
    (await app.inject('/api/appointments')).json()[0].patient_name,
    input.patient_name,
  );
  const updated = await app.inject({
    method: 'PATCH',
    url: '/api/appointments/' + created.json().id,
    payload: { status: 'cancelled' },
  });
  assert.equal(updated.json().status, 'cancelled');
});
test('rejects invalid, past, unknown and oversized input without writing', async (t) => {
  const { app, store } = fixture();
  t.after(() => app.close());
  for (const payload of [
    { ...input, patient_name: ' ' },
    { ...input, doctor_id: 'invalid' },
    { ...input, starts_at: '2020-01-01T10:00:00Z' },
    { ...input, starts_at: 'tomorrow' },
    { ...input, reason: 'a'.repeat(251) },
    { ...input, status: 'completed' },
  ])
    assert.equal(
      (await app.inject({ method: 'POST', url: '/api/appointments', payload }))
        .statusCode,
      400,
    );
  assert.equal((await store.appointments()).length, 0);
  assert.equal(
    (
      await app.inject({
        method: 'PATCH',
        url: '/api/appointments/' + randomUUID(),
        payload: { status: 'invalid' },
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await app.inject({
        method: 'PATCH',
        url: '/api/appointments/nope',
        payload: { status: 'completed' },
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await app.inject({
        method: 'PATCH',
        url: '/api/appointments/' + randomUUID(),
        payload: { status: 'completed' },
      })
    ).statusCode,
    404,
  );
});
test('maps conflicts, missing doctors and unavailable database to safe errors', async (t) => {
  const { app, store } = fixture();
  t.after(() => app.close());
  for (const [code, expected] of [
    ['23P01', 409],
    ['23503', 400],
    ['ECONNREFUSED', 503],
  ] as const) {
    store.create = async () => {
      throw Object.assign(new Error('private database details'), { code });
    };
    const response = await app.inject({
      method: 'POST',
      url: '/api/appointments',
      payload: input,
    });
    assert.equal(response.statusCode, expected);
    assert.ok(!response.body.includes('private'));
  }
  store.health = async () => {
    throw new Error('private connection URL');
  };
  assert.equal((await app.inject('/api/health')).statusCode, 503);
});
