import { NextResponse } from "next/server";
import { z } from "zod";
import { routePreferenceDeltaForFeedback } from "@/lib/learning/walking-speed";
import { defaultRoutePreferences, routePreferencesSchema } from "@/lib/settings/preferences";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const feedbackSchema = z.object({
  routeSnapshotId: z.string().uuid().optional(),
  selectedOptionId: z.string().max(120).optional(),
  feedbackType: z.enum(["accepted", "rejected", "too_much_walking", "too_many_transfers", "late", "unsafe", "other"]),
  comment: z.string().max(500).optional()
});

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const parsed = feedbackSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid route feedback." }, { status: 400 });

  const feedback = parsed.data;
  const preferenceDelta = routePreferenceDeltaForFeedback(feedback.feedbackType);
  const { data: settings } = await supabase.from("user_settings").select("route_preferences").eq("user_id", user.id).maybeSingle();
  const routePreferences = routePreferencesSchema.parse(settings?.route_preferences ?? defaultRoutePreferences);

  const [{ error: insertError }, { error: updateError }] = await Promise.all([
    supabase.from("route_preference_feedback").insert({
      user_id: user.id,
      route_snapshot_id: feedback.routeSnapshotId ?? null,
      selected_option_id: feedback.selectedOptionId ?? null,
      feedback_type: feedback.feedbackType,
      comment: feedback.comment ?? null,
      preference_delta: preferenceDelta
    }),
    Object.keys(preferenceDelta).length
      ? supabase
          .from("user_settings")
          .upsert(
            {
              user_id: user.id,
              route_preferences: {
                ...routePreferences,
                ...preferenceDelta
              }
            },
            { onConflict: "user_id" }
          )
      : Promise.resolve({ error: null })
  ]);

  const error = insertError ?? updateError;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, preferenceDelta });
}
