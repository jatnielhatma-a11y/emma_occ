import { NextResponse } from "next/server";
import { fetchNsCommuteStatus } from "@/lib/ns-commute";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const { data: commute } = await supabase
    .from("commute_settings")
    .select("travel_mode,home_address,work_address,home_station,work_station")
    .eq("user_id", user.id)
    .maybeSingle();

  if (commute?.travel_mode !== "ns") {
    return NextResponse.json({
      ok: true,
      enabled: false,
      message: "NS commute reference is not enabled."
    });
  }

  const status = await fetchNsCommuteStatus({
    homeStation: commute.home_station,
    workStation: commute.work_station,
    homeAddress: commute.home_address,
    workAddress: commute.work_address
  });

  return NextResponse.json({ ok: true, enabled: true, status });
}
