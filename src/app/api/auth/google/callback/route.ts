import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCode } from '@/lib/google-oauth';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  if (error) return NextResponse.redirect(new URL(`/?google=denied&message=${encodeURIComponent(error)}`, request.url));
  if (!code || !state) return NextResponse.redirect(new URL('/?google=error&message=Missing%20authorization%20response', request.url));
  try {
    await exchangeGoogleCode(code, state, url.origin);
    return NextResponse.redirect(new URL('/?google=connected', request.url));
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Google authorization failed';
    return NextResponse.redirect(new URL(`/?google=error&message=${encodeURIComponent(message)}`, request.url));
  }
}
