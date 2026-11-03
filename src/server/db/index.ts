import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from '../config';
import * as schema from './schema';

const g = globalThis as unknown as { __zyroPool?: Pool };

function getPool(): Pool {
  if (!g.__zyroPool) {
    if (!config.databaseUrl) throw new Error('DATABASE_URL is not set');
    g.__zyroPool = new Pool({
      connectionString: config.databaseUrl,
      max: 5,
      keepAlive: true, // replaces the neon keepalive timer from the flask app
    });
  }
  return g.__zyroPool;
}

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  _db ??= drizzle(getPool(), { schema });
  return _db;
}

export { schema };
export * from './schema';
