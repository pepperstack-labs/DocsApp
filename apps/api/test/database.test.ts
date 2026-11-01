import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { buildApp } from '../src/app.js';
import { createStore } from '../src/store.js';

// Uses real local Supabase; a dedicated doctor isolates the test from sample/user bookings.
test('Supabase persists bookings, serializes concurrent overlap conflicts, and releases cancelled slots', async (t) => {
  const url =
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  const sql = postgres(url);
  const id = randomUUID();
  await sql`insert into public.doctors (id, name, specialty, initials) values (${id}, 'Integration Doctor', 'Test', 'IT')`;
  const app = buildApp(createStore(url));
  t.after(async () => {
    await app.close();
    await sql`delete from public.appointments where doctor_id = ${id}`;
    await sql`delete from public.doctors where id = ${id}`;
    await sql.end();
  });
  const starts = Date.now() + 7 * 86400000;
  const input = {
    patient_name: 'Integration Patient',
    doctor_id: id,
    starts_at: new Date(starts).toISOString(),
    reason: 'Fictional test visit',
  };
  const responses = await Promise.all(
    [0, 1].map(() =>
      app.inject({ method: 'POST', url: '/api/appointments', payload: input }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.statusCode).sort(), [201, 409]);
  const appointment = responses.find((r) => r.statusCode === 201)!.json();
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/appointments',
        payload: {
          ...input,
          starts_at: new Date(starts + 15 * 60000).toISOString(),
        },
      })
    ).statusCode,
    409,
  );
  // Adjacent appointments are allowed.
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/appointments',
        payload: {
          ...input,
          starts_at: new Date(starts + 30 * 60000).toISOString(),
        },
      })
    ).statusCode,
    201,
  );
  await app.inject({
    method: 'PATCH',
    url: '/api/appointments/' + appointment.id,
    payload: { status: 'completed' },
  });
  const independent = createStore(url);
  assert.equal(
    (await independent.appointments()).find((a) => a.id === appointment.id)
      ?.status,
    'completed',
  );
  await independent.close();
  await app.inject({
    method: 'PATCH',
    url: '/api/appointments/' + appointment.id,
    payload: { status: 'cancelled' },
  });
  const rebooked = await app.inject({
    method: 'POST',
    url: '/api/appointments',
    payload: input,
  });
  assert.equal(rebooked.statusCode, 201);
  // Reactivating a cancelled booking must also honor the exclusion constraint.
  assert.equal(
    (
      await app.inject({
        method: 'PATCH',
        url: '/api/appointments/' + appointment.id,
        payload: { status: 'scheduled' },
      })
    ).statusCode,
    409,
  );
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/appointments',
        payload: { ...input, doctor_id: randomUUID() },
      })
    ).statusCode,
    400,
  );
  const [permissions] =
    await sql`select has_table_privilege('anon', 'public.appointments', 'SELECT') as readable`;
  assert.equal(permissions!.readable, false);
});
