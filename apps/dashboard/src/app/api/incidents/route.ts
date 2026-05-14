import { NextResponse } from 'next/server';
import { getDashboardDb } from '@/lib/db';
import type { Incident } from '@sentinel/shared';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = getDashboardDb();
    const result = await db.execute(
      'SELECT * FROM incidents ORDER BY created_at DESC LIMIT 50'
    );

    const incidents: Incident[] = (result.rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row['id'] ?? ''),
      serviceId: String(row['service_id'] ?? ''),
      serviceName: String(row['service_name'] ?? ''),
      errorType: String(row['error_type'] ?? '') as Incident['errorType'],
      description: String(row['description'] ?? ''),
      status: String(row['status'] ?? 'OPEN') as Incident['status'],
      createdAt: String(row['created_at'] ?? ''),
      resolvedAt: row['resolved_at'] ? String(row['resolved_at']) : null,
      fixApplied: row['fix_applied'] ? String(row['fix_applied']) : null,
      testsPass: row['tests_pass'] !== null ? Boolean(row['tests_pass']) : null,
      retryCount: Number(row['retry_count'] ?? 0),
    }));

    await db.close();
    return NextResponse.json({ incidents });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch incidents', detail: String(error) },
      { status: 500 }
    );
  }
}
