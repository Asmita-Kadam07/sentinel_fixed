import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getDb } from '../monitoring/db.js';

const POSTMORTEMS_DIR = join(process.cwd(), 'docs', 'postmortems');

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

async function generatePostmortem(incidentId?: string): Promise<void> {
  const db = getDb();

  const query = incidentId
    ? { sql: 'SELECT * FROM incidents WHERE id = ?', args: [incidentId] }
    : { sql: "SELECT * FROM incidents WHERE status = 'RESOLVED' ORDER BY resolved_at DESC LIMIT 5", args: [] };

  const result = await db.execute(query);
  await db.close();

  if (result.rows.length === 0) {
    console.info('[postmortem] No resolved incidents found.');
    return;
  }

  mkdirSync(POSTMORTEMS_DIR, { recursive: true });

  for (const row of result.rows) {
    const incident = row as unknown as IncidentRow;
    const durationMs = incident.resolved_at
      ? new Date(incident.resolved_at).getTime() - new Date(incident.created_at).getTime()
      : null;
    const durationStr = durationMs ? `${Math.round(durationMs / 1000)}s` : 'Unknown';

    const postmortem = `# Incident Postmortem

**Incident ID:** ${incident.id}
**Service:** ${incident.service_name}
**Generated:** ${new Date().toISOString()}

---

## Timeline

| Event | Time |
|-------|------|
| Incident Created | ${incident.created_at} |
| Resolved | ${incident.resolved_at ?? 'N/A'} |
| Total Duration | ${durationStr} |

## Incident Details

- **Error Type:** ${incident.error_type}
- **Description:** ${incident.description}
- **Resolution Attempts:** ${incident.retry_count}
- **Final Status:** ${incident.status}

## Fix Applied

${incident.fix_applied ?? 'No fix recorded'}

## Regression Tests

${incident.tests_pass === 1 ? '✅ All tests passed' : incident.tests_pass === 0 ? '❌ Tests failed' : '⚠️ Tests not run'}

## Root Cause Analysis

The ${incident.error_type} was injected by the Chaos Monkey simulation into ${incident.service_name}.
${incident.retry_count > 0 ? `This required ${incident.retry_count} retry attempt(s) and Thinking Mode escalation.` : 'Resolved on first attempt.'}

## Prevention Measures

1. Add targeted unit tests for the affected code path
2. Implement input validation at service boundaries
3. Add runtime type checking for external data
4. Review related services for similar vulnerabilities

## Action Items

- [ ] Add regression test for ${incident.error_type} scenario
- [ ] Review ${incident.service_id} for similar code patterns
- [ ] Update runbooks with new failure mode
`;

    const outPath = join(POSTMORTEMS_DIR, `${incident.id}.md`);
    writeFileSync(outPath, postmortem);
    console.info(`[postmortem] ✅ Generated: ${outPath}`);
  }
}

const incidentArg = (() => {
  const idx = process.argv.indexOf('--incident-id');
  return idx !== -1 ? process.argv[idx + 1] : undefined;
})();

await generatePostmortem(incidentArg);
