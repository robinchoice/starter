import path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    connection: { timezone: 'UTC' },
    onnotice: () => {},
  });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;

export function migrateDb(db: Database) {
  return migrate(db, { migrationsFolder: path.join(import.meta.dir, 'migrations') });
}

export * from './schema';
