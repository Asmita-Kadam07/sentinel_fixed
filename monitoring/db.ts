import { createClient } from '@libsql/client';
import { join } from 'path';

/**
 * Returns a libsql client connected to:
 *  - Turso (remote) when TURSO_DATABASE_URL is set (production / CI)
 *  - Local SQLite file otherwise (local development)
 */
export function getDb() {
  const tursoUrl = process.env['TURSO_DATABASE_URL'];
  const tursoToken = process.env['TURSO_AUTH_TOKEN'];

  if (tursoUrl) {
    return createClient({
      url: tursoUrl,
      ...(tursoToken ? { authToken: tursoToken } : {}),
    });
  }

  // Local development — file-based SQLite
  const DB_PATH = join(process.cwd(), 'monitoring', 'sentinel.db');
  return createClient({ url: `file:${DB_PATH}` });
}

export type DbClient = ReturnType<typeof getDb>;
