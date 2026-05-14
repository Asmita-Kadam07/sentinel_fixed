import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getDb } from './db.js';
import { v4 as uuidv4 } from 'uuid';

const POLL_INTERVAL_MS = 5000;
const LOG_DIR = join(process.cwd(), 'services', 'logs');
const SERVICES_DIR = join(process.cwd(), 'services');

interface ServiceConfig {
  id: string;
  name: string;
  dir: string;
  mainFile: string;
}

const WATCHED_SERVICES: ServiceConfig[] = [
  { id: 'service-a', name: 'Service Alpha (Data Processor)', dir: 'service-a', mainFile: 'index.ts' },
  { id: 'service-b', name: 'Service Beta (Auth Handler)', dir: 'service-b', mainFile: 'index.ts' },
  { id: 'service-c', name: 'Service Gamma (Report Generator)', dir: 'service-c', mainFile: 'index.ts' },
];

function detectErrorsInLog(serviceId: string): { hasError: boolean; errorType: string; description: string } {
  const logFile = join(LOG_DIR, `${serviceId}.log`);
  if (!existsSync(logFile)) {
    return { hasError: false, errorType: '', description: '' };
  }

  const lines = readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
  const recentLines = lines.slice(-20);

  for (const line of recentLines.reverse()) {
    try {
      const entry = JSON.parse(line) as { level: string; message: string };
      if (entry.level === 'CRITICAL' || entry.level === 'ERROR') {
        let errorType = 'UNKNOWN';
        const msg = entry.message.toLowerCase();
        if (msg.includes('syntaxerror') || msg.includes('unexpected token')) errorType = 'SYNTAX_ERROR';
        else if (msg.includes('type') && msg.includes('not assignable')) errorType = 'TYPE_MISMATCH';
        else if (msg.includes('cannot find module') || msg.includes('module not found')) errorType = 'MISSING_DEPENDENCY';
        else if (msg.includes('json') || msg.includes('parse')) errorType = 'CORRUPTED_DATA';
        else if (msg.includes('undefined') || msg.includes('null')) errorType = 'LOGIC_BUG';

        return { hasError: true, errorType, description: entry.message.slice(0, 200) };
      }
    } catch {
      // skip malformed log lines
    }
  }

  return { hasError: false, errorType: '', description: '' };
}

function checkServiceFileIntegrity(svc: ServiceConfig): { broken: boolean; reason: string } {
  const filePath = join(SERVICES_DIR, svc.dir, svc.mainFile);
  if (!existsSync(filePath)) {
    return { broken: true, reason: `Main file missing: ${svc.mainFile}` };
  }

  const content = readFileSync(filePath, 'utf-8');

  // Check for chaos monkey markers
  if (content.includes('// CHAOS:')) {
    const marker = content.match(/\/\/ CHAOS: (.+)/)?.[1] ?? 'unknown injection';
    return { broken: true, reason: `Chaos injection detected: ${marker}` };
  }

  if (content.includes('SYNTAX_ERROR_INJECTED') || content.includes('undefined_var_xyz')) {
    return { broken: true, reason: 'Syntax error injection detected' };
  }

  return { broken: false, reason: '' };
}

async function pollServices(): Promise<void> {
  const db = getDb();

  for (const svc of WATCHED_SERVICES) {
    const fileCheck = checkServiceFileIntegrity(svc);
    const logCheck = detectErrorsInLog(svc.id);

    const isbroken = fileCheck.broken || logCheck.hasError;

    if (isbroken) {
      // Check if already CRITICAL or INVESTIGATING
      const result = await db.execute({
        sql: 'SELECT status FROM services WHERE id = ?',
        args: [svc.id],
      });
      const currentStatus = (result.rows[0] as { status: string } | undefined)?.status ?? 'HEALTHY';

      if (currentStatus === 'HEALTHY') {
        // Escalate to CRITICAL
        const errorType = fileCheck.broken ? 'SYNTAX_ERROR' : logCheck.errorType;
        const description = fileCheck.reason || logCheck.description;

        await db.execute({
          sql: 'UPDATE services SET status = ?, last_checked = ?, last_error = ? WHERE id = ?',
          args: ['CRITICAL', new Date().toISOString(), description, svc.id],
        });

        // Create incident
        const incidentId = uuidv4();
        await db.execute({
          sql: `INSERT INTO incidents (id, service_id, service_name, error_type, description, status)
                VALUES (?, ?, ?, ?, ?, 'OPEN')`,
          args: [incidentId, svc.id, svc.name, errorType, description],
        });

        console.error(
          `[poller] 🔴 CRITICAL: ${svc.name} | ${errorType} | Incident: ${incidentId}`
        );
      }
    } else {
      // Check if was CRITICAL and now recovered
      const result = await db.execute({
        sql: 'SELECT status FROM services WHERE id = ?',
        args: [svc.id],
      });
      const currentStatus = (result.rows[0] as { status: string } | undefined)?.status ?? 'HEALTHY';

      if (currentStatus === 'CRITICAL' || currentStatus === 'INVESTIGATING') {
        await db.execute({
          sql: "UPDATE services SET status = 'HEALTHY', last_checked = ?, last_error = NULL WHERE id = ?",
          args: [new Date().toISOString(), svc.id],
        });
        console.info(`[poller] ✅ Recovery detected: ${svc.name}`);
      } else {
        await db.execute({
          sql: 'UPDATE services SET last_checked = ? WHERE id = ?',
          args: [new Date().toISOString(), svc.id],
        });
      }
    }
  }

  await db.close();
}

async function startPoller(): Promise<void> {
  console.info(`[poller] 🚀 Sentinel poller started. Polling every ${POLL_INTERVAL_MS / 1000}s...`);

  while (true) {
    try {
      await pollServices();
    } catch (err) {
      console.error('[poller] Poll cycle error:', err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

await startPoller();
