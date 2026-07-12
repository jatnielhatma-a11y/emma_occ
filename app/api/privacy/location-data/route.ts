import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const now = new Date().toISOString();
  const [eventsResult, locationsResult, settingsResult, missionsResult] = await Promise.all([
    supabase.from("location_events").delete().eq("user_id", user.id),
    supabase.from("saved_locations").update({ latitude: null, longitude: null, deleted_at: now, is_active: false }).eq("user_id", user.id),
    supabase
      .from("user_settings")
      .upsert({ user_id: user.id, location_preferences: { enabled: false, storeCoarseEvents: false } }, { onConflict: "user_id" }),
    supabase
      .from("commute_missions")
      .update({
        latest_location_label: null,
        latest_confidence: null,
        latest_event_at: null,
        metadata: { locationDataDeletedAt: now }
      })
      .eq("user_id", user.id)
      .in("status", ["planned", "active"])
  ]);

  const error = eventsResult.error ?? locationsResult.error ?? settingsResult.error ?? missionsResult.error;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deletedAt: now,
    message: "Location history and saved geofence coordinates were removed. Location services are now disabled."
  });
}
