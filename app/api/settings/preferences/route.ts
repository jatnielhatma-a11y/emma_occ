import { NextResponse } from "next/server";
import { phase2PreferencesSchema } from "@/lib/settings/preferences";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const parsed = phase2PreferencesSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check the highlighted settings and try again." }, { status: 400 });
  }

  const preferences = parsed.data;
  const [{ error: profileError }, { error: settingsError }] = await Promise.all([
    supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name: preferences.displayName,
          preferred_language: preferences.preferredLanguage,
          timezone: preferences.timezone
        },
        { onConflict: "id" }
      ),
    supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          preferred_language: preferences.preferredLanguage,
          notification_preferences: preferences.notificationPreferences,
          route_preferences: preferences.routePreferences,
          location_preferences: preferences.locationPreferences,
          privacy_settings: preferences.privacySettings
        },
        { onConflict: "user_id" }
      )
  ]);

  const error = profileError ?? settingsError;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
