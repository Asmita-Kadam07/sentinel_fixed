import { NextResponse } from 'next/server';
import { getDashboardDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

interface HistoryRow {
  action: string;
  description: string;
  created_at: string;
}

export interface PostmortemData {
  incidentId: string;
  service: string;
  errorType: string;
  description: string;
  createdAt: string;
  resolvedAt: string | null;
  durationSeconds: number | null;
  fixApplied: string | null;
  testsPass: boolean | null;
  retryCount: number;
  thinkingModeUsed: boolean;
  history: { action: string; description: string; createdAt: string }[];
  prevention: string[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const incidentId = searchParams.get('id');

  try {
    const db = getDashboardDb();

    const query = incidentId
      ? {
          sql: "SELECT * FROM incidents WHERE id = ?",
          args: [incidentId],
        }
      : {
          sql: "SELECT * FROM incidents WHERE status = 'RESOLVED' ORDER BY resolved_at DESC LIMIT 10",
          args: [] as string[],
        };

    const incidentsResult = await db.execute(query);
    const incidents = incidentsResult.rows as unknown as IncidentRow[];

    const postmortems: PostmortemData[] = await Promise.all(
      incidents.map(async (inc) => {
        // Fetch DB history for this incident
        const histResult = await db.execute({
          sql: `SELECT action, description, created_at FROM incident_history
                WHERE incident_id = ? ORDER BY created_at ASC`,
          args: [inc.id],
        });

        const history = (histResult.rows as unknown as HistoryRow[]).map((h) => ({
          action: h.action,
          description: h.description,
          createdAt: h.created_at,
        }));

        const thinkingModeUsed = history.some(
          (h) => h.description.includes('ThinkingMode=true') || h.description.toLowerCase().includes('thinking mode')
        );

        const durationSeconds =
          inc.resolved_at
            ? Math.round(
                (new Date(inc.resolved_at).getTime() - new Date(inc.created_at).getTime()) / 1000
              )
            : null;

        const prevention = generatePreventionSteps(inc.error_type);

        return {
          incidentId: inc.id,
          service: inc.service_name,
          errorType: inc.error_type,
          description: inc.description,
          createdAt: inc.created_at,
          resolvedAt: inc.resolved_at,
          durationSeconds,
          fixApplied: inc.fix_applied,
          testsPass: inc.tests_pass !== null ? Boolean(inc.tests_pass) : null,
          retryCount: inc.retry_count,
          thinkingModeUsed,
          history,
          prevention,
        };
      })
    );

    await db.close();

    if (incidentId) {
      return NextResponse.json(postmortems[0] ?? null);
    }

    return NextResponse.json({ postmortems });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch postmortem data', detail: String(error) },
      { status: 500 }
    );
  }
}

function generatePreventionSteps(errorType: string): string[] {
  const base = [
    'Add this scenario to the service regression test suite',
    'Review similar code patterns in other services',
  ];

  const specific: Record<string, string[]> = {
    SYNTAX_ERROR: [
      'Enable tsc --noEmit in pre-commit hooks',
      'Add ESLint to CI pipeline for all service files',
    ],
    TYPE_MISMATCH: [
      'Enable strict: true and noImplicitAny in tsconfig',
      'Add runtime type validation at service boundaries using Zod or io-ts',
    ],
    LOGIC_BUG: [
      'Add boundary condition tests (empty, null, negative values)',
      'Consider property-based testing for core business logic',
    ],
    MISSING_DEPENDENCY: [
      'Add dependency validation step to CI pipeline',
      'Use import maps or barrel exports to avoid brittle paths',
    ],
    CORRUPTED_DATA: [
      'Add JSON schema validation before parsing external data',
      'Implement graceful degradation for malformed input',
    ],
  };

  return [...(specific[errorType] ?? []), ...base];
}
