import { createClient } from '@libsql/client';
import { join } from 'path';

function getDbPath(): string {
  // In production (Vercel), use TURSO_DATABASE_URL
  if (process.env['TURSO_DATABASE_URL']) {
    return process.env['TURSO_DATABASE_URL'];
  }
  // Local development — point to the monitoring DB
  return `file:${join(process.cwd(), '../../monitoring/sentinel.db')}`;
}

export function getDashboardDb() {
  const url = getDbPath();
  const authToken = process.env['TURSO_AUTH_TOKEN'];

  return createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });
}
