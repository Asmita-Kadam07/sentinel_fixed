/**
 * Subagent Beta — Regression Test Generator
 *
 * Reads an incident + the fixed source file, then calls the Anthropic API
 * to generate a targeted regression test that covers the exact bug scenario.
 * The test is appended to the service's existing test file.
 *
 * Usage:
 *   tsx scripts/generate-regression-test.ts --incident <id>
 *   tsx scripts/generate-regression-test.ts --service service-a --error-type SYNTAX_ERROR
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { getDb } from '../monitoring/db.js';

const SERVICES_DIR = join(process.cwd(), 'services');
const LOG_DIR = join(SERVICES_DIR, 'logs');

const INCIDENT_ID_ARG = (() => {
  const i = process.argv.indexOf('--incident');
  return i !== -1 ? process.argv[i + 1] : null;
})();

const SERVICE_ARG = (() => {
  const i = process.argv.indexOf('--service');
  return i !== -1 ? process.argv[i + 1] : null;
})();

const ERROR_TYPE_ARG = (() => {
  const i = process.argv.indexOf('--error-type');
  return i !== -1 ? process.argv[i + 1] : null;
})();

interface IncidentRow {
  id: string;
  service_id: string;
  service_name: string;
  error_type: string;
  description: string;
  fix_applied: string | null;
  created_at: string;
  resolved_at: string | null;
}

async function callAnthropicAPI(prompt: string): Promise<string> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { content: Array<{ type: string; text?: string }> };
  return data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('');
}

async function generateTestForIncident(incident: IncidentRow): Promise<void> {
  const serviceId = incident.service_id;
  const testFilePath = join(SERVICES_DIR, serviceId, 'index.test.ts');
  const sourceFilePath = join(SERVICES_DIR, serviceId, 'index.ts');

  if (!existsSync(sourceFilePath)) {
    console.error(`[beta] Source file not found: ${sourceFilePath}`);
    return;
  }

  const sourceCode = readFileSync(sourceFilePath, 'utf-8');
  const existingTests = existsSync(testFilePath)
    ? readFileSync(testFilePath, 'utf-8')
    : '// No existing tests';

  // Read relevant logs
  const logFile = join(LOG_DIR, `${serviceId}.log`);
  const recentLogs = existsSync(logFile)
    ? readFileSync(logFile, 'utf-8').split('\n').filter(Boolean).slice(-15).join('\n')
    : 'No logs available';

  console.info(`[beta] 🧪 Generating regression test for incident ${incident.id}`);
  console.info(`[beta]    Service: ${incident.service_name}`);
  console.info(`[beta]    Error:   ${incident.error_type}`);

  const prompt = `You are Subagent Beta, a QA Engineer for Project Sentinel.

A CRITICAL incident was just resolved. Your job is to write a targeted regression test
that ensures this exact bug never regresses.

## Incident Details
- Service: ${incident.service_name} (${serviceId})
- Error Type: ${incident.error_type}
- Description: ${incident.description}
- Fix Applied: ${incident.fix_applied ?? 'See source code'}

## Current Source File (fixed)
\`\`\`typescript
${sourceCode}
\`\`\`

## Existing Tests (DO NOT DUPLICATE these)
\`\`\`typescript
${existingTests}
\`\`\`

## Recent Service Logs (context)
\`\`\`
${recentLogs}
\`\`\`

## Your Task
Write 1-3 new Vitest test cases that:
1. Specifically target the bug scenario that was just fixed
2. Would FAIL on the broken code and PASS on the fixed code
3. Cover edge cases related to this error type (${incident.error_type})
4. Follow the existing test style exactly
5. DO NOT duplicate any existing test names

Rules:
- Use Vitest (import { describe, it, expect } from 'vitest')
- Import only from './index.js' — do not add new imports
- Tests must be self-contained (no external state)
- Use descriptive test names that explain what they guard against
- No comments inside test bodies

Return ONLY the new test cases (no describe block wrapper, no imports — just the it() calls)
between these exact markers:
===REGRESSION_TESTS_START===
(test cases here)
===REGRESSION_TESTS_END===`;

  let testCode: string | null = null;
  try {
    const response = await callAnthropicAPI(prompt);
    const match = response.match(/===REGRESSION_TESTS_START===\n([\s\S]+?)\n===REGRESSION_TESTS_END===/);
    if (match?.[1]) {
      testCode = match[1].trim();
    }
  } catch (err) {
    console.error('[beta] API call failed:', err instanceof Error ? err.message : String(err));
    return;
  }

  if (!testCode) {
    console.error('[beta] Could not extract test code from API response');
    return;
  }

  // Append to existing test file inside a describe block
  const regressionBlock = `
describe('Regression: ${incident.error_type} — ${incident.id.slice(0, 8)}', () => {
${testCode.split('\n').map((l) => '  ' + l).join('\n')}
});
`;

  appendFileSync(testFilePath, regressionBlock);
  console.info(`[beta] ✅ Regression tests appended to ${testFilePath}`);

  // Run the tests to verify they pass
  try {
    execSync(`pnpm --filter @sentinel/${serviceId} test`, {
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: 60000,
    });
    console.info(`[beta] ✅ All tests pass including new regression tests`);

    // Log to DB history
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO incident_history (incident_id, service_id, action, description)
            VALUES (?, ?, 'REGRESSION_TEST_ADDED', ?)`,
      args: [incident.id, serviceId, `Regression test added for ${incident.error_type}`],
    });
    await db.close();
  } catch {
    console.error('[beta] ❌ New regression tests caused failures — removing them');
    // Remove the appended block by restoring the file without the last block
    const content = readFileSync(testFilePath, 'utf-8');
    const idx = content.lastIndexOf('\ndescribe(\'Regression:');
    if (idx !== -1) {
      writeFileSync(testFilePath, content.slice(0, idx));
    }
    console.error('[beta] Regression test block removed. Review manually.');
  }
}

async function main(): Promise<void> {
  console.info('\n[beta] 🤖 Subagent Beta — Regression Test Generator\n');

  const db = getDb();

  let incident: IncidentRow | null = null;

  if (INCIDENT_ID_ARG) {
    const result = await db.execute({
      sql: 'SELECT * FROM incidents WHERE id = ?',
      args: [INCIDENT_ID_ARG],
    });
    if (result.rows.length > 0) {
      incident = result.rows[0] as unknown as IncidentRow;
    }
  } else if (SERVICE_ARG) {
    // Find the most recently resolved incident for this service
    const result = await db.execute({
      sql: `SELECT * FROM incidents WHERE service_id = ? AND status = 'RESOLVED'
            ORDER BY resolved_at DESC LIMIT 1`,
      args: [SERVICE_ARG],
    });
    if (result.rows.length > 0) {
      incident = result.rows[0] as unknown as IncidentRow;
    }
  } else {
    // Find the most recently resolved incident overall
    const result = await db.execute({
      sql: `SELECT * FROM incidents WHERE status = 'RESOLVED'
            AND (SELECT COUNT(*) FROM incident_history
                 WHERE incident_id = incidents.id AND action = 'REGRESSION_TEST_ADDED') = 0
            ORDER BY resolved_at DESC LIMIT 1`,
      args: [],
    });
    if (result.rows.length > 0) {
      incident = result.rows[0] as unknown as IncidentRow;
    }
  }

  await db.close();

  if (!incident) {
    console.info('[beta] No resolved incidents found needing regression tests.');
    return;
  }

  await generateTestForIncident(incident);
}

main().catch((err) => {
  console.error('[beta] Fatal error:', err);
  process.exit(1);
});
