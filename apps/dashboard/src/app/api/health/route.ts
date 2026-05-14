import { NextResponse } from 'next/server';
import { getDashboardDb } from '@/lib/db';
import type { SystemHealth } from '@sentinel/shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDashboardDb();

    const [svcResult, incResult] = await Promise.all([
      db.execute('SELECT status, COUNT(*) as count FROM services GROUP BY status'),
      db.execute(
        "SELECT COUNT(*) as count FROM incidents WHERE status = 'RESOLVED' AND date(resolved_at) = date('now')"
      ),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of svcResult.rows as Array<Record<string, unknown>>) {
      statusCounts[String(row['status'])] = Number(row['count']);
    }

    const totalServices =
      (statusCounts['HEALTHY'] ?? 0) +
      (statusCounts['CRITICAL'] ?? 0) +
      (statusCounts['INVESTIGATING'] ?? 0) +
      (statusCounts['RESOLVED'] ?? 0);

    const healthyCount = statusCounts['HEALTHY'] ?? 0;
    const criticalCount = statusCounts['CRITICAL'] ?? 0;
    const investigatingCount = statusCounts['INVESTIGATING'] ?? 0;
    const resolvedToday = Number((incResult.rows[0] as Record<string, unknown>)?.['count'] ?? 0);

    const activeIncidentsResult = await db.execute(
      "SELECT COUNT(*) as count FROM incidents WHERE status IN ('OPEN','IN_PROGRESS')"
    );
    const activeIncidents = Number(
      (activeIncidentsResult.rows[0] as Record<string, unknown>)?.['count'] ?? 0
    );

    const uptimePercent =
      totalServices > 0 ? Math.round((healthyCount / totalServices) * 100) : 100;

    const health: SystemHealth = {
      totalServices,
      healthyCount,
      criticalCount,
      investigatingCount,
      resolvedToday,
      activeIncidents,
      uptimePercent,
    };

    await db.close();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to compute health', detail: String(error) },
      { status: 500 }
    );
  }
}
