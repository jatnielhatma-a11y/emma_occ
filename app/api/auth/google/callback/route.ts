import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, googleServicesFromScope } from "@/lib/google/oauth";
import { hashOAuthState, verifyOAuthState } from "@/lib/google/token-crypto";
import { getGoogleRefreshToken, serializeGoogleTokenUpdate, type GoogleCalendarConnection } from "@/lib/calendar/google";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "nova_google_oauth_state";
const VERIFIER_COOKIE = "nova_google_oauth_verifier";

function expiresAt(expiresIn?: number) {
  if (!expiresIn) return null;
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function statusRedirect(request: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/calendar-sync?google=${status}`, request.url));
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedStateHash = cookieStore.get(STATE_COOKIE)?.value;
  const verifier = cookieStore.get(VERIFIER_COOKIE)?.value;

  if (error) {
    return statusRedirect(request, error === "access_denied" ? "access_denied" : "token_error");
  }

  if (!code || !state || !expectedStateHash || !verifier || !verifyOAuthState(state, expectedStateHash)) {
    return statusRedirect(request, "invalid_state");
  }

  try {
    const token = await exchangeGoogleCode(code, verifier);
    const { data: existingConnection } = await supabase
      .from("google_calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("calendar_id", process.env.GOOGLE_CALENDAR_ID || "primary")
      .maybeSingle();

    const grantedScopes = token.scope ?? "";
    const connectedServices = googleServicesFromScope(grantedScopes);

    await supabase.from("google_calendar_connections").upsert(
      {
        user_id: user.id,
        calendar_id: process.env.GOOGLE_CALENDAR_ID || "primary",
        provider: "google",
        ...serializeGoogleTokenUpdate(token, existingConnection ? getGoogleRefreshToken(existingConnection as GoogleCalendarConnection) : null),
        scope: grantedScopes,
        granted_scopes: grantedScopes,
        token_type: token.token_type,
        expires_at: expiresAt(token.expires_in),
        connected_services: connectedServices,
        oauth_state_hash: hashOAuthState(state),
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        last_error: null
      },
      { onConflict: "user_id,calendar_id" }
    );

    await Promise.all(
      Object.entries(connectedServices).map(([service, connected]) =>
        supabase.from("integration_metadata").upsert(
          {
            user_id: user.id,
            provider: "google",
            service,
            status: connected ? "connected" : "not_connected",
            last_checked_at: new Date().toISOString(),
            last_success_at: connected ? new Date().toISOString() : null,
            metadata: { scopes: grantedScopes }
          },
          { onConflict: "user_id,provider,service" }
        )
      )
    );
  } catch (callbackError) {
    await supabase.from("integration_metadata").upsert(
      {
        user_id: user.id,
        provider: "google",
        service: "oauth",
        status: "error",
        last_checked_at: new Date().toISOString(),
        last_error: callbackError instanceof Error ? callbackError.message : "Google OAuth callback failed."
      },
      { onConflict: "user_id,provider,service" }
    );
    return statusRedirect(request, "token_error");
  }

  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(VERIFIER_COOKIE);
  return statusRedirect(request, "connected");
}
