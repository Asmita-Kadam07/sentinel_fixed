import { getDb } from './db.js';

async function initDb(): Promise<void> {
  const db = getDb();

  console.info('[sentinel] Initializing monitoring database...');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'HEALTHY',
      last_checked TEXT NOT NULL,
      last_error TEXT,
      error_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      error_type TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      fix_applied TEXT,
      tests_pass INTEGER,
      retry_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS incident_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Seed default services
  const services = [
    { id: 'service-a', name: 'Service Alpha (Data Processor)' },
    { id: 'service-b', name: 'Service Beta (Auth Handler)' },
    { id: 'service-c', name: 'Service Gamma (Report Generator)' },
  ];

  for (const svc of services) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO services (id, name, status, last_checked) VALUES (?, ?, 'HEALTHY', ?)`,
      args: [svc.id, svc.name, new Date().toISOString()],
    });
  }

  console.info('[sentinel] ✅ Database initialized with 3 services.');
  await db.close();
}

initDb().catch((err) => {
  console.error('[sentinel] DB init failed:', err);
  process.exit(1);
});
