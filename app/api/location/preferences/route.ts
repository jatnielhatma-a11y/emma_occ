import { NextResponse } from "next/server";
import { z } from "zod";
import { locationPreferencesSchema } from "@/lib/settings/preferences";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const locationPreferencePatchSchema = z.object({
  enabled: z.boolean(),
  highAccuracyWhenCommuting: z.boolean().optional()
});

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const parsed = locationPreferencePatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid location preference." }, { status: 400 });
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("location_preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  const current = locationPreferencesSchema.parse(settings?.location_preferences ?? {});
  const next = {
    ...current,
    enabled: parsed.data.enabled,
    highAccuracyWhenCommuting: parsed.data.highAccuracyWhenCommuting ?? current.highAccuracyWhenCommuting
  };

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      location_preferences: next
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, preferences: next });
}
