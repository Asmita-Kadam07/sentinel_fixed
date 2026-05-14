import { createClient } from '@libsql/client';
import { join } from 'path';

function getDbPath(): string {
  console.log('TURSO URL:', process.env['TURSO_DATABASE_URL']);
  console.log('TOKEN EXISTS:', !!process.env['TURSO_AUTH_TOKEN']);

  if (process.env['TURSO_DATABASE_URL']) {
    return process.env['TURSO_DATABASE_URL'];
  }

  return `file:${join(process.cwd(), '../../monitoring/sentinel.db')}`;
}

export function getDashboardDb() {
  const url = getDbPath();
  const authToken = process.env['TURSO_AUTH_TOKEN'];

  console.log('DB URL USED:', url);

  return createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });
}
