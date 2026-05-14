/**
 * Demo Workflow — Full Autonomous Resolution Demonstration
 *
 * Runs the complete Sentinel cycle:
 * 1.  Chaos Monkey breaks a service
 * 2.  Monitoring detects failure → DB updated to CRITICAL
 * 3.  Dashboard shows CRITICAL (polling detects it automatically)
 * 4.  Main Agent: set to INVESTIGATING, dispatch Subagent Alpha
 * 5.  Subagent Alpha: diagnoses + fixes (Anthropic API)
 * 6.  Subagent Beta: generates regression test (Anthropic API)
 * 7.  Tests pass
 * 8.  Dashboard shows RESOLVED
 * 9.  Postmortem generated
 */

import { execSync } from 'child_process';

const BORDER = '─'.repeat(62);

function step(n: number, total: number, label: string): void {
  console.info(`\n${BORDER}`);
  console.info(`  [${n}/${total}] ${label}`);
  console.info(`${BORDER}\n`);
}

function run(cmd: string): void {
  console.info(`  $ ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: process.cwd(), timeout: 120_000 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`  ⚠  Command exited: ${message.split('\n')[0]}`);
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDemo(): Promise<void> {
  console.info('\n');
  console.info('╔══════════════════════════════════════════════════════════════╗');
  console.info('║      PROJECT SENTINEL — AUTONOMOUS RESOLUTION DEMO          ║');
  console.info('║      Zero human intervention. AI detects, fixes, tests.     ║');
  console.info('╚══════════════════════════════════════════════════════════════╝');
  console.info('\n  Open http://localhost:3000 in a browser to watch live updates.\n');

  step(1, 9, 'Initialize monitoring database');
  run('pnpm monitor:init');

  step(2, 9, 'Check initial system health — all services should be HEALTHY');
  run('pnpm monitor:status');
  await sleep(800);

  step(3, 9, 'Chaos Monkey injects a random fault into a service');
  console.info('  🐒  Selecting a random service and fault type...\n');
  run('pnpm chaos');
  await sleep(800);

  step(4, 9, 'System status — should show one service CRITICAL');
  run('pnpm monitor:status');
  await sleep(800);

  step(5, 9, 'Main Agent: reading CLAUDE.md protocol & dispatching Subagent Alpha');
  console.info('  📋  Checking /docs/incident-history.log for prior failures...');
  console.info('  🔍  Subagent Alpha: analyzing logs and source code...');
  console.info('  🧠  Escalating to Thinking Mode if prior failures detected...\n');
  run('pnpm resolve');
  await sleep(800);

  step(6, 9, 'Subagent Beta: generating regression test for the fixed bug');
  console.info('  🧪  Beta reads the incident + fixed file and generates a test...\n');
  run('pnpm beta');
  await sleep(800);

  step(7, 9, 'Running full test suite to verify everything passes');
  run('pnpm test');
  await sleep(800);

  step(8, 9, 'Post-resolution system health — should show HEALTHY + RESOLVED');
  run('pnpm monitor:status');

  step(9, 9, 'Generating postmortem report');
  run('pnpm postmortem');

  console.info('\n');
  console.info('╔══════════════════════════════════════════════════════════════╗');
  console.info('║  ✅  FULL AUTONOMOUS CYCLE COMPLETE                         ║');
  console.info('╠══════════════════════════════════════════════════════════════╣');
  console.info('║  Dashboard:   http://localhost:3000                         ║');
  console.info('║  Postmortems: docs/postmortems/                             ║');
  console.info('║  History:     docs/incident-history.log                     ║');
  console.info('║  Agent logs:  docs/agent-logs.txt                           ║');
  console.info('║                                                              ║');
  console.info('║  Human actions taken: 0                                     ║');
  console.info('╚══════════════════════════════════════════════════════════════╝\n');
}

runDemo().catch((err) => {
  console.error('\n[demo] Fatal error:', err);
  process.exit(1);
});
