import { getDb } from './db.js';

interface ServiceRow {
  id: string;
  name: string;
  status: string;
  last_checked: string;
  last_error: string | null;
  error_count: number;
}

interface IncidentRow {
  id: string;
  service_id: string;
  service_name: string;
  error_type: string;
  description: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  fix_applied: string | null;
  tests_pass: number | null;
  retry_count: number;
}

async function getStatus(): Promise<void> {
  const db = getDb();

  const servicesResult = await db.execute('SELECT * FROM services ORDER BY name');
  const incidentsResult = await db.execute(
    "SELECT * FROM incidents WHERE status != 'RESOLVED' ORDER BY created_at DESC"
  );

  const services = servicesResult.rows as unknown as ServiceRow[];
  const incidents = incidentsResult.rows as unknown as IncidentRow[];

  console.info('\n=== SENTINEL SYSTEM STATUS ===\n');
  console.info('SERVICES:');
  for (const svc of services) {
    const icon = svc.status === 'HEALTHY' ? '✅' : svc.status === 'CRITICAL' ? '🔴' : '🟡';
    console.info(
      `  ${icon} [${svc.status.padEnd(14)}] ${svc.name} | errors: ${svc.error_count} | last: ${svc.last_checked}`
    );
  }

  console.info('\nACTIVE INCIDENTS:');
  if (incidents.length === 0) {
    console.info('  ✅ No active incidents');
  } else {
    for (const inc of incidents) {
      console.info(
        `  🚨 [${inc.id.slice(0, 8)}] ${inc.service_name} | ${inc.error_type} | ${inc.status} | ${inc.created_at}`
      );
      console.info(`     ${inc.description}`);
    }
  }

  // Output structured JSON for MCP integration
  const output = {
    timestamp: new Date().toISOString(),
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      lastChecked: s.last_checked,
      lastError: s.last_error,
      errorCount: s.error_count,
    })),
    activeIncidents: incidents.map((i) => ({
      id: i.id,
      serviceId: i.service_id,
      serviceName: i.service_name,
      errorType: i.error_type,
      description: i.description,
      status: i.status,
      createdAt: i.created_at,
      resolvedAt: i.resolved_at,
      retryCount: i.retry_count,
    })),
  };

  // Write structured output for MCP consumers
  process.stdout.write('\n[MCP_STATUS_OUTPUT]\n' + JSON.stringify(output, null, 2) + '\n');

  await db.close();
}

async function updateStatus(serviceId: string, status: string, note?: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: 'UPDATE services SET status = ?, last_checked = ?, last_error = ? WHERE id = ?',
    args: [status, new Date().toISOString(), note ?? null, serviceId],
  });
  console.info(`[sentinel] Updated ${serviceId} → ${status}${note ? ': ' + note : ''}`);
  await db.close();
}

async function createIncident(
  serviceId: string,
  serviceName: string,
  errorType: string,
  description: string
): Promise<string> {
  const db = getDb();
  const { v4: uuidv4 } = await import('uuid');
  const id = uuidv4();
  await db.execute({
    sql: `INSERT INTO incidents (id, service_id, service_name, error_type, description, status)
          VALUES (?, ?, ?, ?, ?, 'OPEN')`,
    args: [id, serviceId, serviceName, errorType, description],
  });
  console.info(`[sentinel] 🚨 Incident created: ${id} for ${serviceName}`);
  await db.close();
  return id;
}

async function resolveIncident(incidentId: string, fixApplied: string, testsPass: boolean): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE incidents SET status = 'RESOLVED', resolved_at = ?, fix_applied = ?, tests_pass = ? WHERE id = ?`,
    args: [new Date().toISOString(), fixApplied, testsPass ? 1 : 0, incidentId],
  });
  console.info(`[sentinel] ✅ Incident ${incidentId} resolved. Tests: ${testsPass ? 'PASS' : 'FAIL'}`);
  await db.close();
}

// CLI interface
const [, , command, ...args] = process.argv;

switch (command) {
  case 'update':
    await updateStatus(args[0] ?? '', args[1] ?? 'HEALTHY', args[2]);
    break;
  case 'create-incident':
    await createIncident(args[0] ?? '', args[1] ?? '', args[2] ?? 'UNKNOWN', args[3] ?? '');
    break;
  case 'resolve':
    await resolveIncident(args[0] ?? '', args[1] ?? 'Fix applied', args[2] !== 'false');
    break;
  default:
    await getStatus();
}
