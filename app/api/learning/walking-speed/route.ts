import { NextResponse } from "next/server";
import { z } from "zod";
import { blendWalkingSpeedPreference, calculateWalkingSpeedKmh, walkingSampleConfidence } from "@/lib/learning/walking-speed";
import { defaultRoutePreferences, routePreferencesSchema } from "@/lib/settings/preferences";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const sampleSchema = z.object({
  segmentLabel: z.string().min(2).max(120),
  distanceMeters: z.number().int().min(20).max(50000),
  durationSeconds: z.number().int().min(30).max(28800),
  source: z.enum(["gps", "manual", "route_inference"]).default("manual"),
  commuteMissionId: z.string().uuid().optional()
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const parsed = sampleSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Check the walking sample and try again." }, { status: 400 });

  const sample = parsed.data;
  const speedKmh = calculateWalkingSpeedKmh(sample);
  const confidence = walkingSampleConfidence(sample);

  if (speedKmh < 1 || speedKmh > 8) {
    return NextResponse.json({ ok: false, error: "Walking speed sample is outside the accepted learning range." }, { status: 400 });
  }

  const { data: settings } = await supabase.from("user_settings").select("route_preferences").eq("user_id", user.id).maybeSingle();
  const routePreferences = routePreferencesSchema.parse(settings?.route_preferences ?? defaultRoutePreferences);
  const learnedSpeed = blendWalkingSpeedPreference(routePreferences.normalWalkingSpeedKmh, speedKmh, confidence);

  const [{ error: insertError }, { error: updateError }] = await Promise.all([
    supabase.from("walking_speed_samples").insert({
      user_id: user.id,
      commute_mission_id: sample.commuteMissionId ?? null,
      source: sample.source,
      segment_label: sample.segmentLabel,
      distance_meters: sample.distanceMeters,
      duration_seconds: sample.durationSeconds,
      speed_kmh: speedKmh,
      confidence
    }),
    supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          route_preferences: {
            ...routePreferences,
            normalWalkingSpeedKmh: learnedSpeed
          }
        },
        { onConflict: "user_id" }
      )
  ]);

  const error = insertError ?? updateError;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, speedKmh, confidence, learnedSpeed });
}
