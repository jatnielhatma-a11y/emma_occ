import { NextResponse } from 'next/server';
import { isGoogleConnected, oauthConfigured } from '@/lib/google-oauth';

export async function GET() {
  return NextResponse.json({ configured: oauthConfigured(), connected: await isGoogleConnected() }, { headers: { 'Cache-Control': 'no-store' } });
}
