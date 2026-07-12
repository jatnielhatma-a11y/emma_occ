import { NextResponse } from "next/server";
import { getGoogleAccessToken, getGoogleRefreshToken } from "@/lib/calendar/google";
import { revokeGoogleToken } from "@/lib/google/oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const { data: connection } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("calendar_id", process.env.GOOGLE_CALENDAR_ID || "primary")
    .maybeSingle();

  if (connection) {
    const tokenToRevoke = getGoogleRefreshToken(connection) ?? getGoogleAccessToken(connection);
    if (tokenToRevoke) {
      await revokeGoogleToken(tokenToRevoke).catch(() => undefined);
    }

    await supabase
      .from("google_calendar_connections")
      .update({
        access_token: null,
        refresh_token: null,
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        connected_services: { calendar: false, gmail: false },
        disconnected_at: new Date().toISOString()
      })
      .eq("id", connection.id)
      .eq("user_id", user.id);
  }

  await Promise.all(
    ["calendar", "gmail", "oauth"].map((service) =>
      supabase.from("integration_metadata").upsert(
        {
          user_id: user.id,
          provider: "google",
          service,
          status: "not_connected",
          last_checked_at: new Date().toISOString()
        },
        { onConflict: "user_id,provider,service" }
      )
    )
  );

  return NextResponse.json({ ok: true });
}
