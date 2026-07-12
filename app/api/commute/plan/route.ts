import { NextResponse } from "next/server";
import { buildPhase4CommutePlan, type CommuteDirection } from "@/lib/commute/route-planner";
import { fetchLiveWeather } from "@/lib/live-demo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function directionFromUrl(request: Request): CommuteDirection {
  const value = new URL(request.url).searchParams.get("direction");
  return value === "return" ? "return" : "outbound";
}

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const direction = directionFromUrl(request);
  const [{ data: commute }, { data: settings }, { data: activeMission }, weather] = await Promise.all([
    supabase
      .from("commute_settings")
      .select("before_minutes,after_minutes,home_address,work_address,home_station,work_station")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("user_settings").select("route_preferences").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("commute_missions")
      .select("id")
      .eq("user_id", user.id)
      .eq("direction", direction)
      .in("status", ["planned", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchLiveWeather()
  ]);

  const plan = await buildPhase4CommutePlan({
    direction,
    commute,
    routePreferences: settings?.route_preferences,
    weather
  });

  const { data: snapshot, error } = await supabase
    .from("commute_route_snapshots")
    .insert({
      user_id: user.id,
      commute_mission_id: activeMission?.id ?? null,
      direction,
      route_status: plan.status,
      confidence: plan.confidence,
      is_live: plan.isLive,
      provider_summary: {
        routeLabel: plan.routeLabel,
        generatedAt: plan.generatedAt,
        sources: plan.sources
      },
      recommended_option: plan.recommended ?? {},
      backup_options: plan.backups,
      incidents: plan.incidents,
      source_age_seconds: 0
    })
    .select("id,created_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, plan }, { status: 500 });
  }

  if (activeMission?.id && snapshot?.id) {
    await supabase
      .from("commute_missions")
      .update({ latest_route_snapshot_id: snapshot.id })
      .eq("user_id", user.id)
      .eq("id", activeMission.id);
  }

  return NextResponse.json({ ok: true, snapshot, plan });
}
