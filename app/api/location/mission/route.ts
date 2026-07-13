import { NextResponse } from "next/server";
import { z } from "zod";
import { logNovaAiEvent, upsertNovaAiRuntimeState } from "@/lib/nova/ai-database";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const startMissionSchema = z.object({
  direction: z.enum(["outbound", "return"]).default("outbound"),
  source: z.string().trim().max(40).default("manual"),
  dutyId: z.string().uuid().nullable().optional()
});

function todayInTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE || "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const { data: mission } = await supabase
    .from("commute_missions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["planned", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: events = [] } = await supabase
    .from("location_events")
    .select("id,event_type,coarse_location_label,confidence,accuracy_meters,route_phase,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  return NextResponse.json({ ok: true, mission, events });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const parsed = startMissionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid mission start request." }, { status: 400 });
  }

  const payload = parsed.data;
  let dutyId = payload.dutyId ?? null;
  if (!dutyId) {
    const { data: nextDuty } = await supabase
      .from("duties")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_off", false)
      .gte("duty_date", todayInTimezone())
      .order("duty_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    dutyId = nextDuty?.id ?? null;
  }

  const now = new Date().toISOString();
  const { data: existingMission } = await supabase
    .from("commute_missions")
    .select("id,status,current_phase,metadata")
    .eq("user_id", user.id)
    .eq("direction", payload.direction)
    .in("status", ["planned", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const missionUpdate = {
    duty_id: dutyId,
    direction: payload.direction,
    status: "active",
    current_phase: existingMission?.current_phase && existingMission.current_phase !== "unknown" ? existingMission.current_phase : "not_started",
    latest_location_label: existingMission?.current_phase && existingMission.current_phase !== "not_started" ? undefined : "Mission started",
    latest_confidence: 0.5,
    latest_event_at: now,
    source: payload.source,
    actual_departure_at: now,
    metadata: {
      ...(existingMission?.metadata ?? {}),
      startedBy: payload.source,
      startedAt: now,
      explicitStart: true
    }
  };

  let mission;
  let error;
  if (existingMission?.id) {
    const response = await supabase
      .from("commute_missions")
      .update(missionUpdate)
      .eq("id", existingMission.id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    mission = response.data;
    error = response.error;
  } else {
    const response = await supabase
      .from("commute_missions")
      .insert({
        user_id: user.id,
        ...missionUpdate
      })
      .select("*")
      .single();
    mission = response.data;
    error = response.error;
  }

  if (error) {
    await logNovaAiEvent(supabase, user.id, {
      eventType: "mission_start",
      intent: "start_mission",
      status: "failed",
      route: "/commute",
      confidence: 0.5,
      error: error.message,
      metadata: { direction: payload.direction, source: payload.source }
    });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await Promise.all([
    logNovaAiEvent(supabase, user.id, {
      eventType: "mission_start",
      intent: "start_mission",
      status: "completed",
      route: "/commute",
      confidence: 0.95,
      metadata: { direction: payload.direction, source: payload.source, missionId: mission?.id ?? null }
    }),
    upsertNovaAiRuntimeState(supabase, user.id, {
      aiCoreStatus: "online",
      lastMissionStartedAt: now,
      metadata: { lastMissionDirection: payload.direction, lastMissionSource: payload.source }
    })
  ]);

  return NextResponse.json({ ok: true, mission });
}
