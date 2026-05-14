import { NextResponse } from 'next/server';
import { getDashboardDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { incidentId?: string };
    const { incidentId } = body;

    if (!incidentId) {
      return NextResponse.json({ error: 'incidentId required' }, { status: 400 });
    }

    const db = getDashboardDb();

    // Mark as IN_PROGRESS to show "Resolving..."
    await db.execute({
      sql: "UPDATE incidents SET status = 'IN_PROGRESS' WHERE id = ?",
      args: [incidentId],
    });

    const incResult = await db.execute({
      sql: 'SELECT service_id FROM incidents WHERE id = ?',
      args: [incidentId],
    });

    const serviceId = String((incResult.rows[0] as Record<string, unknown>)?.['service_id'] ?? '');

    await db.execute({
      sql: "UPDATE services SET status = 'INVESTIGATING', last_checked = ? WHERE id = ?",
      args: [new Date().toISOString(), serviceId],
    });

    await db.close();

    return NextResponse.json({
      message: 'Resolution triggered. Run `pnpm resolve` in terminal to execute autonomous fix.',
      incidentId,
      serviceId,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
