# Project Sentinel
### Autonomous Incident Resolution Engine

A production-style monorepo that detects service failures, spawns AI subagents to diagnose and fix them, verifies fixes with regression tests, and updates a live dashboard — all without human intervention.

---

## Architecture Overview

```
project-sentinel/
├── apps/dashboard/          # Next.js 14 dark-mode DevOps dashboard (App Router)
├── services/
│   ├── service-a/           # Data Processor — business logic + tests
│   ├── service-b/           # Auth Handler — business logic + tests
│   ├── service-c/           # Report Generator — business logic + tests
│   └── logs/                # Structured JSON service logs (per-service files)
├── monitoring/
│   ├── db.ts                # @libsql/client database client (Node 24 + Vercel safe)
│   ├── init-db.ts           # Schema init: services, incidents, incident_history tables
│   ├── status.ts            # MCP-compatible CLI status + structured JSON output
│   └── poller.ts            # Continuous polling: file integrity + log scanning
├── scripts/
│   ├── chaos-monkey.ts      # Fault injector: 5 types, SQLite logging, backup + rollback
│   ├── autonomous-resolver.ts  # Main Agent + Subagent Alpha: diagnose → fix → verify
│   ├── generate-regression-test.ts  # Subagent Beta: auto-generates regression tests
│   ├── demo-workflow.ts     # Full 9-step demo: chaos → detect → fix → test → postmortem
│   ├── rollback.ts          # Instant rollback from any chaos backup
│   └── generate-postmortem.ts  # Postmortem report generator
├── packages/shared/         # Shared TypeScript types + structured logger
├── docs/
│   ├── incident-history.log     # Flat log — checked before every fix attempt
│   ├── agent-logs.txt           # Multi-agent session transcripts (/plan + /subagent)
│   └── postmortems/             # Auto-generated per-incident markdown reports
├── CLAUDE.md                # Agent operating manual + resolution protocol
└── .github/workflows/       # CI: test → build → deploy to Vercel on push to main
```

### Multi-Agent Architecture

```
Main Agent (Orchestrator)
├── Reads CLAUDE.md protocol
├── Checks incident-history DB + log file for prior failures
├── Updates dashboard state throughout incident lifecycle
│
├── Subagent Alpha  (scripts/autonomous-resolver.ts)
│   ├── Reads service logs + source file
│   ├── Calls Anthropic API to identify root cause
│   ├── Applies surgical fix (removes chaos injection)
│   └── Escalates to Thinking Mode on prior failures
│
└── Subagent Beta  (scripts/generate-regression-test.ts)
    ├── Reads incident + fixed source file
    ├── Calls Anthropic API to generate targeted test cases
    ├── Appends to service test file
    └── Verifies tests pass before committing
```

---

## Setup Instructions

### Prerequisites
- Node.js >= 20 (tested on Node 24)
- pnpm >= 8: `npm install -g pnpm`
- Anthropic API key: https://console.anthropic.com

### 1. Clone and install

```bash
git clone https://github.com/your-org/project-sentinel.git
cd project-sentinel
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

### 3. Initialize the monitoring database

```bash
pnpm monitor:init
# Creates monitoring/sentinel.db with services, incidents, incident_history tables
```

### 4. Start the dashboard

```bash
pnpm dev
# Dashboard: http://localhost:3000
```

### 5. Verify system health

```bash
pnpm monitor:status
```

---

## Running the Autonomous Demo

One command runs the entire 9-step cycle with zero human interaction:

```bash
pnpm demo
```

### Step-by-step breakdown

```bash
# 1. Break a random service (backs up original, logs to SQLite)
pnpm chaos

# 2. Check status — dashboard now shows CRITICAL
pnpm monitor:status

# 3. Autonomous fix: Alpha reads logs, calls API, applies fix, runs tests
pnpm resolve

# 4. Regression test: Beta generates a targeted test for the fixed bug
pnpm beta

# 5. Verify all tests still pass
pnpm test

# 6. Confirm resolution
pnpm monitor:status

# 7. Generate postmortem
pnpm postmortem
```

### Dry run (no actual changes)

```bash
pnpm chaos:dry
```

### Manual rollback

```bash
pnpm rollback -- --service service-a
# or: pnpm rollback -- --service service-a --backup services/.chaos-backups/service-a-index.ts.backup.1234567890
```

---

## MCP Setup + Piping Examples

The monitoring scripts produce structured JSON output for MCP (Model Context Protocol) integration. Use them in Claude Code terminal sessions.

### Check system status (MCP-readable JSON output)

```bash
pnpm monitor:status
# Outputs [MCP_STATUS_OUTPUT] JSON block — parseable by Claude
```

### Pipe service logs to Claude for analysis

```bash
cat services/logs/service-a.log | claude -p "Analyze this log and tell me the root cause"

cat services/logs/service-b.log | claude -p "Summarize all CRITICAL events in the last 10 entries"
```

### Pipe status output to Claude to drive decisions

```bash
pnpm monitor:status | claude -p "Based on this status, identify which services need attention and suggest resolution steps"
```

### Let Claude update incident status via CLI

```bash
cat services/logs/service-a.log | claude -p "Analyze this and update the dashboard status to INVESTIGATING using: tsx monitoring/status.ts update service-a INVESTIGATING '<reason>'"
```

### Use /plan mode for multi-incident resolution

In a Claude Code terminal session:
```
(Shift+Tab twice to enter Plan Mode)

"Sentinel Agent: review the current system status from pnpm monitor:status, 
create a resolution plan for all CRITICAL services, prioritize by error type,
and outline which services need Thinking Mode based on incident-history.log"
```

### Use /subagent for parallel investigation

In a Claude Code terminal session:
```
/subagent "You are Subagent Alpha. Read services/logs/service-a.log, identify the root cause of the CRITICAL error, and apply a fix following CLAUDE.md standards. Report back with: file changed, lines modified, fix description."

/subagent "You are Subagent Beta. Check services/service-a/index.test.ts, then write a regression test for the SYNTAX_ERROR that was just fixed in service-a. Append it to the test file and run pnpm --filter @sentinel/service-a test to verify."
```

### Continuous background monitoring

```bash
# In a separate terminal — polls every 5s, auto-creates DB incidents
pnpm monitor:poll
```

---

## Dashboard

The Next.js dashboard at `http://localhost:3000` includes:

- **Health Metrics** — uptime %, healthy/critical/investigating counts, resolved today
- **Service Status Cards** — live status with last error and time since check
- **Active Incidents** — open incidents with one-click "Queue for Resolution"
- **Sentinel Agents Panel** — Main Agent, Alpha (Debugger), Beta (QA) live states
- **Postmortems** — clickable list with full resolution timeline and prevention steps
- **Incident Timeline** — chronological view with fix durations
- **Resolved by Sentinel** — history of AI-resolved incidents

Auto-refreshes every 5 seconds. Responsive (mobile + desktop). Dark mode only.

---

## Deployment (Vercel + Turso)

For Vercel deployment use [Turso](https://turso.tech) (libSQL cloud). Free tier is sufficient.

### 1. Create a Turso database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

turso db create sentinel-db
turso db show sentinel-db --url      # copy TURSO_DATABASE_URL
turso db tokens create sentinel-db   # copy TURSO_AUTH_TOKEN
```

### 2. Initialize the remote database

```bash
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... pnpm monitor:init
```

### 3. Set Vercel environment variables

In Vercel → Project Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `TURSO_DATABASE_URL` | `libsql://sentinel-db-<org>.turso.io` |
| `TURSO_AUTH_TOKEN` | your token |

### 4. Deploy

Push to `main` — GitHub Actions runs tests then deploys automatically.

Or manually:
```bash
cd apps/dashboard
vercel --prod
```

### GitHub Actions secrets required

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `TURSO_DATABASE_URL` | Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |

---

## Running Tests

```bash
# All services
pnpm test

# Single service
pnpm --filter @sentinel/service-a test

# With coverage
pnpm --filter @sentinel/service-a test --coverage
```

---

## CLAUDE.md Protocol Summary

The `CLAUDE.md` contains the full agent operating manual. The two critical rules:

1. **Always check `/docs/incident-history.log` AND the `incident_history` DB table before applying any fix**
2. **If a previous fix for this error failed, activate Thinking Mode (extended reasoning)**

See [CLAUDE.md](./CLAUDE.md) for the complete 8-step resolution protocol, naming conventions, rollback policy, and multi-agent coordination rules.

---

## Submission Checklist

| Deliverable | Status | Location |
|-------------|--------|----------|
| GitHub repo + CLAUDE.md | ✅ | Root |
| Agent logs (plan + subagent sessions) | ✅ | `docs/agent-logs.txt` |
| Chaos Monkey (5 fault types) | ✅ | `scripts/chaos-monkey.ts` |
| SQLite monitoring (services + incidents + history) | ✅ | `monitoring/` |
| Next.js dashboard (dark, responsive, real-time) | ✅ | `apps/dashboard/` |
| Postmortem API + panel | ✅ | `apps/dashboard/src/app/api/postmortem/` |
| Multi-agent orchestration | ✅ | `scripts/autonomous-resolver.ts` + `generate-regression-test.ts` |
| Regression test generation (Subagent Beta) | ✅ | `scripts/generate-regression-test.ts` |
| Full demo workflow | ✅ | `pnpm demo` |
| GitHub Actions + Vercel deploy | ✅ | `.github/workflows/ci-cd.yml` |
