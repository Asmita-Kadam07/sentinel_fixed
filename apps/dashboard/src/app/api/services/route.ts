import { NextResponse } from 'next/server';
import { getDashboardDb } from '@/lib/db';
import type { Service } from '@sentinel/shared';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = getDashboardDb();
    const result = await db.execute('SELECT * FROM services ORDER BY name');

    const services: Service[] = (result.rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row['id'] ?? ''),
      name: String(row['name'] ?? ''),
      status: String(row['status'] ?? 'HEALTHY') as Service['status'],
      lastChecked: String(row['last_checked'] ?? ''),
      lastError: row['last_error'] ? String(row['last_error']) : null,
      errorCount: Number(row['error_count'] ?? 0),
    }));

    await db.close();
    return NextResponse.json({ services });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch services', detail: String(error) },
      { status: 500 }
    );
  }
}
