import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { getDb } from '../monitoring/db.js';
import { v4 as uuidv4 } from 'uuid';

const DRY_RUN = process.argv.includes('--dry-run');
const SERVICES_DIR = join(process.cwd(), 'services');
const BACKUP_DIR = join(SERVICES_DIR, '.chaos-backups');
const LOG_DIR = join(SERVICES_DIR, 'logs');

interface ChaosTarget {
  serviceId: string;
  serviceName: string;
  file: string;
}

interface ChaosInjection {
  type: string;
  description: string;
  apply: (content: string) => string;
}

const TARGETS: ChaosTarget[] = [
  { serviceId: 'service-a', serviceName: 'Service Alpha (Data Processor)', file: join(SERVICES_DIR, 'service-a', 'index.ts') },
  { serviceId: 'service-b', serviceName: 'Service Beta (Auth Handler)', file: join(SERVICES_DIR, 'service-b', 'index.ts') },
  { serviceId: 'service-c', serviceName: 'Service Gamma (Report Generator)', file: join(SERVICES_DIR, 'service-c', 'index.ts') },
];

const INJECTIONS: ChaosInjection[] = [
  {
    type: 'SYNTAX_ERROR',
    description: 'Injected unexpected token (syntax error)',
    apply: (content: string) => {
      // Add invalid syntax at a function boundary
      return content.replace(
        /^(export function \w+)/m,
        '// CHAOS: SYNTAX_ERROR\nexport function $$INVALID_SYNTAX_XYZ{ broken ==> };\n$1'
      );
    },
  },
  {
    type: 'TYPE_MISMATCH',
    description: 'Injected type mismatch (string passed as number)',
    apply: (content: string) => {
      return content.replace(
        /const (\w+): number = /,
        '// CHAOS: TYPE_MISMATCH\nconst $1: number = ("this_is_a_string_not_a_number" as unknown) as number; const _ignored = '
      );
    },
  },
  {
    type: 'LOGIC_BUG',
    description: 'Injected logic bug (inverted condition)',
    apply: (content: string) => {
      return content.replace(
        /if \(([^)]+length[^)]*)\)/,
        '// CHAOS: LOGIC_BUG\nif (!($1))'
      );
    },
  },
  {
    type: 'CORRUPTED_DATA',
    description: 'Injected corrupted JSON in config parsing',
    apply: (content: string) => {
      return content.replace(
        /JSON\.parse\(([^)]+)\)/,
        "// CHAOS: CORRUPTED_DATA\nJSON.parse('{ corrupted_json_injection: [[[}')"
      );
    },
  },
  {
    type: 'MISSING_DEPENDENCY',
    description: 'Injected missing module import',
    apply: (content: string) => {
      return (
        "// CHAOS: MISSING_DEPENDENCY\nimport { nonExistentFunction } from './does-not-exist-module.js';\n" +
        content
      );
    },
  },
];

function pickRandom<T>(arr: T[]): T {
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx] as T;
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function logToChaosLog(entry: string): void {
  ensureDir(LOG_DIR);
  appendFileSync(
    join(LOG_DIR, 'chaos-monkey.log'),
    JSON.stringify({ timestamp: new Date().toISOString(), entry }) + '\n'
  );
}

function logToIncidentHistory(
  serviceId: string,
  errorType: string,
  description: string,
  incidentId: string
): void {
  const logPath = join(process.cwd(), 'docs', 'incident-history.log');
  ensureDir(join(process.cwd(), 'docs'));
  appendFileSync(
    logPath,
    `[${new Date().toISOString()}] SERVICE=${serviceId} ERROR_TYPE=${errorType} INCIDENT_ID=${incidentId} ` +
    `DESCRIPTION="${description}" STATUS=INJECTED\n`
  );
}

async function runChaos(): Promise<void> {
  const target = pickRandom(TARGETS);
  const injection = pickRandom(INJECTIONS);

  console.warn(`\n🐒 CHAOS MONKEY AWAKENS`);
  console.warn(`   Target:    ${target.serviceName}`);
  console.warn(`   Injection: ${injection.type} — ${injection.description}`);
  console.warn(`   Dry run:   ${DRY_RUN}`);

  if (!existsSync(target.file)) {
    console.error(`[chaos] Target file not found: ${target.file}`);
    process.exit(1);
  }

  const originalContent = readFileSync(target.file, 'utf-8');

  // Check if already broken
  if (originalContent.includes('// CHAOS:')) {
    console.warn(`[chaos] ⚠️  ${target.serviceName} already has chaos injected. Skipping.`);
    return;
  }

  const corruptedContent = injection.apply(originalContent);

  if (corruptedContent === originalContent) {
    console.warn(`[chaos] ⚠️  Injection had no effect on target. Try a different service.`);
    return;
  }

  const timestamp = Date.now();
  const backupPath = join(BACKUP_DIR, `${target.serviceId}-index.ts.backup.${timestamp}`);

  if (!DRY_RUN) {
    ensureDir(BACKUP_DIR);
    copyFileSync(target.file, backupPath);
    writeFileSync(target.file, corruptedContent, 'utf-8');
    console.warn(`[chaos] ✅ Backup saved: ${backupPath}`);
    console.warn(`[chaos] 💥 Chaos injected into ${target.file}`);

    // Update monitoring database
    const db = getDb();
    const incidentId = uuidv4();

    await db.execute({
      sql: "UPDATE services SET status = 'CRITICAL', last_checked = ?, last_error = ? WHERE id = ?",
      args: [new Date().toISOString(), injection.description, target.serviceId],
    });

    await db.execute({
      sql: `INSERT INTO incidents (id, service_id, service_name, error_type, description, status)
            VALUES (?, ?, ?, ?, ?, 'OPEN')`,
      args: [incidentId, target.serviceId, target.serviceName, injection.type, injection.description],
    });

    await db.close();

    // Log to service log
    ensureDir(LOG_DIR);
    appendFileSync(
      join(LOG_DIR, `${target.serviceId}.log`),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        service: target.serviceId,
        level: 'CRITICAL',
        message: `CHAOS INJECTION: ${injection.type} — ${injection.description}`,
        incidentId,
        metadata: { injectionType: injection.type, backupPath },
      }) + '\n'
    );

    logToChaosLog(`Injected ${injection.type} into ${target.serviceId} | incident: ${incidentId}`);
    logToIncidentHistory(target.serviceId, injection.type, injection.description, incidentId);

    console.warn(`\n[chaos] 📊 Dashboard should now show ${target.serviceName} as 🔴 CRITICAL`);
    console.warn(`[chaos] 🔍 Incident ID: ${incidentId}`);
    console.warn(`[chaos] 🔧 Run: pnpm resolve -- --incident ${incidentId}`);
    console.warn(`[chaos] ↩️  Rollback: pnpm rollback -- --backup ${backupPath} --service ${target.serviceId}`);
  } else {
    console.info(`[chaos] DRY RUN — would inject ${injection.type} into ${target.file}`);
    console.info(`[chaos] DRY RUN — would create backup at ${backupPath}`);
  }
}

await runChaos();
