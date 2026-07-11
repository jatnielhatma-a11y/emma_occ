import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleAuthorizationUrl } from '@/lib/google-oauth';

export async function GET(request: NextRequest) {
  try {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(await buildGoogleAuthorizationUrl(origin));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start Google authorization';
    return NextResponse.redirect(new URL(`/?google=error&message=${encodeURIComponent(message)}`, request.url));
  }
}
