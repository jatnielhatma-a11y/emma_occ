import { NextResponse } from "next/server";
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
