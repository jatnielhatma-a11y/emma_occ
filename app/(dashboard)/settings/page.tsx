import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Phase2PreferencesForm } from "@/components/settings/Phase2PreferencesForm";
import { CommuteSettingsForm } from "@/components/settings/CommuteSettingsForm";
import { normalizePhase2Preferences } from "@/lib/settings/preferences";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: commute } = await supabase
    .from("commute_settings")
    .select("enabled,before_minutes,after_minutes,travel_mode,home_address,work_address,home_station,work_station")
    .eq("user_id", user?.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,timezone,preferred_language")
    .eq("id", user?.id)
    .maybeSingle();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("preferred_language,notification_preferences,route_preferences,location_preferences,privacy_settings")
    .eq("user_id", user?.id)
    .maybeSingle();

  const preferences = normalizePhase2Preferences({
    displayName: profile?.display_name ?? user?.email?.split("@")[0],
    preferredLanguage: settings?.preferred_language ?? profile?.preferred_language,
    timezone: profile?.timezone,
    routePreferences: settings?.route_preferences,
    locationPreferences: settings?.location_preferences,
    privacySettings: settings?.privacy_settings,
    notificationPreferences: settings?.notification_preferences
  });

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-lg border border-occ-line bg-occ-panel p-5 xl:col-span-2">
        <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA Core</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Language and accessibility</h2>
        <p className="mt-3 text-sm text-zinc-400">
          English, Spanish, and French are available for the NOVA shell and Phase 1 modules. Deeper Emma OCC copy remains preserved for Phase 1 stability.
        </p>
        <div className="mt-4 max-w-xs">
          <LanguageSwitcher />
        </div>
      </section>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Commuting</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Commute buffers</h2>
          </div>
          <StatusBadge tone={commute?.enabled === false ? "neutral" : "green"}>
            {commute?.enabled === false ? "Off" : "On"}
          </StatusBadge>
        </div>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <span className="rounded-md bg-occ-ink p-3 text-zinc-400">
            Source
            <strong className="mt-1 block text-xl text-white">{commute?.travel_mode === "ns" ? "NS" : "Manual"}</strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-zinc-400">
            Before duty
            <strong className="mt-1 block text-xl text-white">{commute?.before_minutes ?? 45} min</strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-zinc-400">
            After duty
            <strong className="mt-1 block text-xl text-white">{commute?.after_minutes ?? 45} min</strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-zinc-400 sm:col-span-3">
            Door-to-door route
            <strong className="mt-1 block text-white">
              {commute?.home_address && (commute?.work_address || commute?.work_station)
                ? `${commute.home_address} ⇄ ${commute.work_address || commute.work_station}`
                : "Add home and work addresses"}
            </strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-zinc-400 sm:col-span-3">
            NS route
            <strong className="mt-1 block text-white">
              {commute?.home_station && commute?.work_station ? `${commute.home_station} ⇄ ${commute.work_station}` : "Add home and work stations"}
            </strong>
          </span>
        </div>
        <CommuteSettingsForm
          initial={{
            enabled: commute?.enabled ?? true,
            beforeMinutes: commute?.before_minutes ?? 45,
            afterMinutes: commute?.after_minutes ?? 45,
            travelMode: commute?.travel_mode === "ns" ? "ns" : "manual",
            homeAddress: commute?.home_address ?? "",
            workAddress: commute?.work_address ?? "",
            homeStation: commute?.home_station ?? "",
            workStation: commute?.work_station ?? ""
          }}
        />
      </section>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Configuration</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Phase 2 data foundation</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Google OAuth, encrypted token storage, Gmail read-only connection status, user profile settings, route preferences, notification preferences, and privacy controls are active.
        </p>
      </section>

      <div className="xl:col-span-2">
        <Phase2PreferencesForm initial={preferences} />
      </div>
    </div>
  );
}
