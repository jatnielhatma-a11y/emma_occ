import { NextResponse } from 'next/server';
import { disconnectGoogle } from '@/lib/google-oauth';

export async function POST() {
  await disconnectGoogle();
  return NextResponse.json({ connected: false }, { headers: { 'Cache-Control': 'no-store' } });
}
