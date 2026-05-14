import { copyFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getDb } from '../monitoring/db.js';

const BACKUP_DIR = join(process.cwd(), 'services', '.chaos-backups');
const SERVICES_DIR = join(process.cwd(), 'services');

const serviceArg = (() => {
  const idx = process.argv.indexOf('--service');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const backupArg = (() => {
  const idx = process.argv.indexOf('--backup');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

async function rollback(): Promise<void> {
  if (!serviceArg) {
    console.error('Usage: tsx scripts/rollback.ts --service <service-id> [--backup <backup-path>]');
    process.exit(1);
  }

  let backupPath = backupArg;

  if (!backupPath) {
    // Find the most recent backup for this service
    if (!existsSync(BACKUP_DIR)) {
      console.error('[rollback] No backup directory found');
      process.exit(1);
    }

    const backups = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith(serviceArg))
      .sort()
      .reverse();

    if (backups.length === 0) {
      console.error(`[rollback] No backups found for ${serviceArg}`);
      process.exit(1);
    }

    backupPath = join(BACKUP_DIR, backups[0] as string);
    console.info(`[rollback] Using latest backup: ${backupPath}`);
  }

  if (!existsSync(backupPath)) {
    console.error(`[rollback] Backup not found: ${backupPath}`);
    process.exit(1);
  }

  const targetPath = join(SERVICES_DIR, serviceArg, 'index.ts');
  copyFileSync(backupPath, targetPath);
  console.info(`[rollback] ✅ Restored ${serviceArg} from backup`);

  // Update monitoring
  const db = getDb();
  await db.execute({
    sql: "UPDATE services SET status = 'HEALTHY', last_checked = ?, last_error = NULL WHERE id = ?",
    args: [new Date().toISOString(), serviceArg],
  });
  await db.close();

  console.info(`[rollback] ✅ Service status reset to HEALTHY`);
}

await rollback();
