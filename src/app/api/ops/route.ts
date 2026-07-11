import { NextResponse } from 'next/server';
import { buildOpsSnapshot } from '@/lib/ops';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return NextResponse.json(await buildOpsSnapshot(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown operations error' }, { status: 500 });
  }
}
