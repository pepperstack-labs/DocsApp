import Fastify, { LogController } from 'fastify';
import { z } from 'zod';
import type { Store } from './store.js';

const uuid = z.uuid();
const booking = z
  .object({
    patient_name: z.string().trim().min(2).max(100),
    doctor_id: uuid,
    starts_at: z.iso
      .datetime({ offset: true })
      .refine(
        (value) => Date.parse(value) > Date.now(),
        'Choose a future appointment time',
      ),
    reason: z.string().trim().min(2).max(250),
  })
  .strict();
const statusInput = z
  .object({ status: z.enum(['scheduled', 'completed', 'cancelled']) })
  .strict();

export function buildApp(store: Store) {
  const app = Fastify({
    logger: true,
    bodyLimit: 16_384,
    logController: new LogController({ disableRequestLogging: true }),
  });
  app.addHook('onClose', async () => store.close());
  app.setErrorHandler((error, _request, reply) => {
    const err = error as Error & { code?: string; statusCode?: number };
    if (error instanceof z.ZodError)
      return reply
        .code(400)
        .send({ message: error.issues[0]?.message ?? 'Invalid input' });
    if (err.code === '23P01')
      return reply.code(409).send({
        message:
          'This doctor already has an appointment at that time. Choose another 30-minute slot.',
      });
    if (err.code === '23503')
      return reply.code(400).send({ message: 'Choose an existing doctor.' });
    if (err.statusCode && err.statusCode < 500)
      return reply.code(err.statusCode).send({ message: 'Invalid request.' });
    // Do not log request bodies, database URLs or patient data.
    app.log.error({ code: err.code }, 'Database request failed');
    return reply.code(503).send({
      message:
        'The local database is unavailable. Start Supabase and try again.',
    });
  });
  app.get('/api/health', async () => {
    await store.health();
    return { status: 'ok', database: 'connected' };
  });
  app.get('/api/doctors', async () => store.doctors());
  app.get('/api/appointments', async () => store.appointments());
  app.post('/api/appointments', async (request, reply) => {
    const input = booking.parse(request.body);
    return reply.code(201).send(await store.create(input));
  });
  app.patch('/api/appointments/:id', async (request, reply) => {
    const { id } = z.object({ id: uuid }).parse(request.params);
    const { status } = statusInput.parse(request.body);
    const result = await store.status(id, status);
    if (!result)
      return reply.code(404).send({ message: 'Appointment not found.' });
    return result;
  });
  return app;
}
