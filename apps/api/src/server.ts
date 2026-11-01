import { buildApp } from './app.js';
import { createStore } from './store.js';

const app = buildApp(
  createStore(
    process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  ),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
await app.listen({
  port: Number(process.env.API_PORT ?? 3001),
  host: '0.0.0.0',
});
