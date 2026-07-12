import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  base64UrlRandom,
  buildGoogleOAuthUrl,
  codeChallengeForVerifier,
  hasGoogleOAuthConfig
} from "@/lib/google/oauth";
import { hashOAuthState, hasGoogleTokenEncryptionKey } from "@/lib/google/token-crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "nova_google_oauth_state";
const VERIFIER_COOKIE = "nova_google_oauth_verifier";

function appUrlForRequest(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/"
  };
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrlForRequest(request)));
  }

  if (!hasGoogleOAuthConfig() || !hasGoogleTokenEncryptionKey()) {
    return NextResponse.redirect(new URL("/calendar-sync?google=config_error", request.url));
  }

  const state = base64UrlRandom(24);
  const verifier = base64UrlRandom(64);
  const stateHash = hashOAuthState(state);
  const cookieStore = await cookies();

  cookieStore.set(STATE_COOKIE, stateHash, cookieOptions());
  cookieStore.set(VERIFIER_COOKIE, verifier, cookieOptions());

  try {
    await supabase.from("integration_metadata").upsert(
      {
        user_id: user.id,
        provider: "google",
        service: "oauth",
        status: "not_connected",
        metadata: { pendingStateHash: stateHash }
      },
      { onConflict: "user_id,provider,service" }
    );

    return NextResponse.redirect(
      buildGoogleOAuthUrl({
        state,
        codeChallenge: codeChallengeForVerifier(verifier)
      })
    );
  } catch {
    return NextResponse.redirect(new URL("/calendar-sync?google=config_error", request.url));
  }
}
