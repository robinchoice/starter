import './monitoring';
import { createDb, migrateDb } from '@app/db';
import { createApp } from './app';

const db = createDb(process.env.DATABASE_URL!);

// A failed migration aborts the boot.
await migrateDb(db);
console.log('[boot] Migrations up to date.');

const port = Number(process.env.PORT || 3000);
console.log(`[boot] API listening on port ${port}`);

export default {
  port,
  fetch: createApp(db).fetch,
};
