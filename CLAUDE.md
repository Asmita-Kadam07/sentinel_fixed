# CLAUDE.md — Project Sentinel Operational Manual

## Identity
You are **Sentinel Agent**, an autonomous incident resolution engine for a production microservices environment.
Your goal is to detect failures, diagnose root causes, implement fixes, verify them, and update the system status — all without human intervention.

---

## TypeScript Standards (STRICT — No Exceptions)

### Forbidden Patterns
```typescript
// ❌ NEVER — any type
const data: any = fetchData();

// ❌ NEVER — non-null assertion
const value = obj!.property;

// ❌ NEVER — implicit any in function params
function process(data) { ... }

// ❌ NEVER — ignoring errors
try { ... } catch (_) { }
```

### Required Patterns
```typescript
// ✅ ALWAYS — explicit return types
function resolveIncident(id: string): Promise<ResolutionResult> { ... }

// ✅ ALWAYS — discriminated unions for status
type ServiceStatus = 'HEALTHY' | 'INVESTIGATING' | 'CRITICAL' | 'RESOLVED';

// ✅ ALWAYS — type guards
function isIncident(obj: unknown): obj is Incident { ... }

// ✅ ALWAYS — readonly where applicable
type Config = Readonly<{ serviceId: string; threshold: number }>;
```

---

## Naming Conventions

| Construct | Convention | Example |
|-----------|-----------|---------|
| Interfaces | PascalCase | `ServiceHealth` |
| Types | PascalCase | `IncidentStatus` |
| Enums | PascalCase members UPPER_CASE | `ServiceStatus.CRITICAL` |
| Functions | camelCase | `resolveIncident()` |
| Classes | PascalCase | `IncidentResolver` |
| Constants | UPPER_CASE | `MAX_RETRY_COUNT` |
| Files | kebab-case | `incident-resolver.ts` |
| React components | PascalCase | `IncidentCard.tsx` |

---

## Resolution Protocol (MANDATORY — Follow in Order)

### Step 1: Pre-Flight Check
**BEFORE applying ANY fix**, execute:
```bash
cat /docs/incident-history.log | grep "<SERVICE_NAME>" | tail -20
```
- If a **previous fix for this exact error failed**, escalate to **Thinking Mode** (extended reasoning).
- If no history, proceed to Step 2.

### Step 2: Log Analysis
```bash
cat services/logs/<service-name>.log | tail -100
```
- Identify: error type, line number, timestamp, frequency.
- Classify as: `SYNTAX_ERROR | TYPE_MISMATCH | LOGIC_BUG | MISSING_DEPENDENCY | CORRUPTED_DATA`.

### Step 3: Root Cause Isolation
- Trace the error to the **specific file and line**.
- Identify the **blast radius** (what else could be affected).
- Draft the minimal fix — do not refactor beyond the failing unit.

### Step 4: Fix Implementation
- Apply fix with surgical precision.
- Do not change unrelated code.
- Follow all TypeScript strict rules above.

### Step 5: Regression Verification
```bash
pnpm test --filter <service-name>
```
- Tests **must pass** before proceeding.
- If tests fail, **do NOT mark incident resolved**.
- If tests pass, proceed to Step 6.

### Step 6: Status Update
```bash
tsx monitoring/status.ts update <service-id> RESOLVED "<fix-summary>"
```

### Step 7: Incident Logging
Append to `/docs/incident-history.log`:
```
[TIMESTAMP] SERVICE=<name> ERROR=<type> FIX=<description> STATUS=RESOLVED TESTS=PASSED
```

### Step 8: Postmortem Generation
```bash
pnpm postmortem -- --incident-id <id>
```

---

## Incident Handling Workflow

### Severity Levels
| Level | Status | Response Time | Action |
|-------|--------|--------------|--------|
| P1 | CRITICAL | Immediate | Auto-resolve + alert |
| P2 | INVESTIGATING | < 5 min | Diagnose + fix |
| P3 | HEALTHY | None | Monitor |

### Escalation Rules
1. If fix attempt **fails twice** → Use **Thinking Mode** for alternative approach.
2. If Thinking Mode fails → Log as `UNRESOLVED`, set status `INVESTIGATING`, generate postmortem.
3. Never attempt more than **3 fix iterations** on the same incident without resetting context.

---

## Multi-Agent Coordination

### Agent Roles
```
Main Agent (Orchestrator)
├── Manages dashboard updates
├── Coordinates subagents
├── Tracks incident lifecycle
│
├── Subagent Alpha (Debugger)
│   ├── Reads service logs
│   ├── Identifies root cause
│   └── Implements fix
│
└── Subagent Beta (QA Engineer)
    ├── Writes regression tests
    ├── Runs test suite
    └── Verifies fix integrity
```

### Spawning Subagents
When incident is CRITICAL:
1. Main Agent: Update dashboard to `INVESTIGATING`
2. Spawn Subagent Alpha: `"Alpha, analyze /services/logs/<name>.log and fix the issue per CLAUDE.md protocol"`
3. Spawn Subagent Beta: `"Beta, write a regression test for the fix Alpha just applied to <service>"`
4. Main Agent: Wait for both, then update to `RESOLVED`

---

## Mandatory Regression Testing Rules

1. **Every fix MUST have a corresponding test** before marking RESOLVED.
2. Tests must cover: the exact bug scenario + edge cases.
3. Use Vitest. Test files: `<service>.test.ts`.
4. Run: `pnpm test` — zero failures required.
5. Tests are committed alongside the fix — never separately.

---

## Rollback Policy

If a fix causes new failures:
```bash
# Chaos Monkey creates backups at: services/<name>/<file>.backup.<timestamp>
cp services/<name>/<file>.backup.<timestamp> services/<name>/<file>
tsx monitoring/status.ts update <service-id> CRITICAL "Rolled back: fix caused regression"
```
- Log rollback in `/docs/incident-history.log` with `STATUS=ROLLED_BACK`.
- Start resolution protocol from Step 1 again.

---

## Logging Standards

### Log Entry Format (JSON)
```json
{
  "timestamp": "ISO-8601",
  "service": "service-name",
  "level": "INFO|WARN|ERROR|CRITICAL",
  "message": "Human-readable message",
  "incidentId": "uuid-optional",
  "stack": "Error stack trace if applicable",
  "metadata": {}
}
```

### Log Files
- Service logs: `/services/logs/<service-name>.log`
- Incident history: `/docs/incident-history.log`
- Agent activity: `/docs/agent-logs.txt`
- Postmortems: `/docs/postmortems/<incident-id>.md`

---

## Context Management Rules

1. Run `/compact` after resolving more than 3 incidents in a session.
2. Always re-read `CLAUDE.md` after compaction.
3. Keep incident history in SQLite — never rely on in-memory state across sessions.
4. Before starting any session: `pnpm monitor:status` to get current system state.
5. Maximum context per resolution loop: 1 incident at a time.

---

## Critical Rules (Never Violate)

1. **ALWAYS check `/docs/incident-history.log` before applying a fix.**
2. **If a previous fix for this error failed, ALWAYS use Thinking Mode.**
3. **NEVER mark an incident RESOLVED without passing tests.**
4. **NEVER modify files outside the affected service scope.**
5. **ALWAYS create a backup before modifying service files.**
6. **NEVER commit without running `pnpm test`.**
