import { NextResponse } from "next/server";
import { buildCalendarSyncPlan } from "@/lib/calendar/google";
import { latestImportId, syncGoogleCalendarForUser } from "@/lib/calendar/sync";
import { buildNsPlannerUrl } from "@/lib/ns-commute";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NS_STATUS_URL = "https://www.ns.nl/reisinformatie/actuele-situatie-op-het-spoor";

function normalizeDuty(row: any) {
  return {
    id: row.id,
    importId: row.import_id,
    date: row.duty_date,
    startTime: row.start_time?.slice(0, 5) ?? "",
    endTime: row.end_time?.slice(0, 5) ?? "",
    originalDutyCode: row.original_duty_code ?? "",
    dutyLabel: row.duty_label,
    location: row.location ?? "",
    notes: row.notes ?? "",
    sourceFile: row.source_file ?? "",
    sourceRow: row.source_row,
    isOff: row.is_off,
    isOvernight: row.is_overnight,
    calendarEventId: row.calendar_event_id,
    commuteToEventId: row.commute_to_event_id,
    commuteHomeEventId: row.commute_home_event_id
  };
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const importId = url.searchParams.get("importId") ?? (await latestImportId(supabase, user.id));
  if (!importId) {
    return NextResponse.json({ ok: true, plan: null, message: "No imported roster found." });
  }

  const { data: duties = [] } = await supabase
    .from("duties")
    .select("*")
    .eq("user_id", user.id)
    .eq("import_id", importId)
    .order("duty_date", { ascending: true });

  const { data: commute } = await supabase
    .from("commute_settings")
    .select("enabled,before_minutes,after_minutes,travel_mode,home_station,work_station")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = buildCalendarSyncPlan(
    importId,
    (duties ?? []).map(normalizeDuty),
    {
      enabled: commute?.enabled ?? true,
      beforeMinutes: commute?.before_minutes ?? 45,
      afterMinutes: commute?.after_minutes ?? 45,
      travelMode: commute?.travel_mode === "ns" ? "ns" : "manual",
      referenceUrl: commute?.travel_mode === "ns" ? NS_STATUS_URL : undefined,
      toWorkUrl: commute?.travel_mode === "ns" ? buildNsPlannerUrl(commute?.home_station, commute?.work_station) : null,
      toHomeUrl: commute?.travel_mode === "ns" ? buildNsPlannerUrl(commute?.work_station, commute?.home_station) : null
    }
  );

  return NextResponse.json({ ok: true, plan });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { importId?: string };
  const result = await syncGoogleCalendarForUser({ supabase, userId: user.id, importId: body.importId });
  const status = result.ok ? 200 : 400;

  return NextResponse.json(result, { status });
}
