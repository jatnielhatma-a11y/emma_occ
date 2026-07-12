import { NextResponse } from "next/server";
import { googleServicesFromScope, hasGoogleOAuthConfig } from "@/lib/google/oauth";
import { hasGoogleTokenEncryptionKey } from "@/lib/google/token-crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const { data: connection } = await supabase
    .from("google_calendar_connections")
    .select("connected_at,last_sync_at,expires_at,scope,granted_scopes,connected_services,disconnected_at,last_error")
    .eq("user_id", user.id)
    .eq("calendar_id", process.env.GOOGLE_CALENDAR_ID || "primary")
    .maybeSingle();

  const scopes = connection?.granted_scopes || connection?.scope || "";
  const services = connection?.connected_services ?? googleServicesFromScope(scopes);

  return NextResponse.json({
    ok: true,
    configured: hasGoogleOAuthConfig() && hasGoogleTokenEncryptionKey(),
    connected: Boolean(connection && !connection.disconnected_at),
    services,
    connectedAt: connection?.connected_at ?? null,
    lastSyncAt: connection?.last_sync_at ?? null,
    expiresAt: connection?.expires_at ?? null,
    lastError: connection?.last_error ?? null,
    scopes
  });
}
