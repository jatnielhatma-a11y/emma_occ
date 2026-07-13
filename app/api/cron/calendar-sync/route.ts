import { NextResponse } from "next/server";
import { syncGoogleCalendarForUser } from "@/lib/calendar/sync";
import { createSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SyncConnectionRow = {
  user_id: string | null;
  last_sync_at: string | null;
  expires_at: string | null;
};

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return request.headers.get("x-vercel-cron") === "1" || Boolean(request.headers.get("user-agent")?.includes("vercel-cron"));
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase admin key is not configured. Hourly Google sync is disabled until SUPABASE_SERVICE_ROLE_KEY is set."
      },
      { status: 503 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const staleBefore = new Date(Date.now() - 55 * 60_000).toISOString();
  const expiringBefore = new Date(Date.now() + 10 * 60_000).toISOString();

  const { data: connections = [], error } = await supabase
    .from("google_calendar_connections")
    .select("user_id,last_sync_at,expires_at")
    .eq("calendar_id", process.env.GOOGLE_CALENDAR_ID || "primary")
    .is("disconnected_at", null)
    .or("access_token.not.is.null,access_token_encrypted.not.is.null")
    .or(`last_sync_at.is.null,last_sync_at.lt.${staleBefore},expires_at.lt.${expiringBefore}`);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const typedConnections = (connections ?? []) as SyncConnectionRow[];
  const uniqueUserIds = [
    ...new Set(
      typedConnections
        .map((connection) => connection.user_id)
        .filter((userId): userId is string => Boolean(userId))
    )
  ];
  const results = [];

  for (const userId of uniqueUserIds) {
    try {
      const result = await syncGoogleCalendarForUser({ supabase, userId });
      results.push({
        userId,
        ok: result.ok,
        syncedItems: result.results?.filter((item) => item.ok).length ?? 0,
        failedItems: result.results?.filter((item) => !item.ok).length ?? 0,
        googleCalendarItems: result.googleContent?.calendarItemsSynced ?? 0,
        googleTasks: result.googleContent?.tasksSynced ?? 0,
        googleSpecialDates: result.googleContent?.specialDatesSynced ?? 0,
        error: result.error
      });
    } catch (error) {
      results.push({
        userId,
        ok: false,
        syncedItems: 0,
        failedItems: 0,
        error: error instanceof Error ? error.message : "Hourly calendar sync failed."
      });
    }
  }

  return NextResponse.json({
    ok: true,
    checkedConnections: connections?.length ?? 0,
    syncedUsers: results.length,
    results
  });
}
