import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const commuteSchema = z.object({
  enabled: z.boolean(),
  beforeMinutes: z.number().int().min(0).max(240),
  afterMinutes: z.number().int().min(0).max(240),
  travelMode: z.enum(["manual", "ns"]).default("manual"),
  homeAddress: z.string().max(240).optional(),
  workAddress: z.string().max(240).optional(),
  homeStation: z.string().max(120).optional(),
  workStation: z.string().max(120).optional()
});

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const payload = commuteSchema.parse(await request.json());
  const { error } = await supabase.from("commute_settings").upsert(
    {
      user_id: user.id,
      enabled: payload.enabled,
      before_minutes: payload.beforeMinutes,
      after_minutes: payload.afterMinutes,
      travel_mode: payload.travelMode,
      home_address: payload.homeAddress?.trim() || null,
      work_address: payload.workAddress?.trim() || null,
      home_station: payload.homeStation?.trim() || null,
      work_station: payload.workStation?.trim() || null
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
