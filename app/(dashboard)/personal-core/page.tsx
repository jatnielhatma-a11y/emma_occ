import { Brain, Fingerprint, ShieldCheck, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { PersonalCorePanel } from "@/components/nova/PersonalCorePanel";
import {
  buildPersonalCoreReadiness,
  defaultMemorySettings,
  emptyPersonalCoreCounts,
  memorySettingsSchema,
  type PersonalCoreCounts
} from "@/lib/nova/personal-core";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function countRows(supabase: ReturnType<typeof createSupabaseServerClient>, table: string, userId?: string) {
  if (!userId) return 0;
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
  return count ?? 0;
}

export default async function PersonalCorePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const userId = user?.id;
  const [{ data: profile }, { data: memoryRow }, interests, goals, habits, relationships, timeline, memories] = await Promise.all([
    userId ? supabase.from("nova_personal_profiles").select("*").eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    userId ? supabase.from("nova_memory_settings").select("*").eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    countRows(supabase, "nova_interests", userId),
    countRows(supabase, "nova_goals", userId),
    countRows(supabase, "nova_habits", userId),
    countRows(supabase, "nova_relationships", userId),
    countRows(supabase, "nova_timeline_events", userId),
    countRows(supabase, "nova_memory_items", userId)
  ]);

  const memorySettings = memorySettingsSchema.parse({
    memoryEnabled: Boolean(memoryRow?.memory_enabled),
    allowAiSuggestions: Boolean(memoryRow?.allow_ai_suggestions),
    retentionDays: memoryRow?.retention_days ?? defaultMemorySettings.retentionDays,
    consentVersion: memoryRow?.consent_version ?? defaultMemorySettings.consentVersion
  });
  const counts: PersonalCoreCounts = {
    ...emptyPersonalCoreCounts,
    interests,
    goals,
    habits,
    relationships,
    timeline,
    memories
  };
  const readiness = buildPersonalCoreReadiness(memorySettings, counts);

  return (
    <div className="space-y-5">
      <section className="nova-surface rounded-lg border border-occ-line p-5 shadow-nova">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="green">Release 2 active</StatusBadge>
          <StatusBadge tone={memorySettings.memoryEnabled ? "green" : "amber"}>Memory {readiness.memoryStatus}</StatusBadge>
          <StatusBadge tone="neutral">Emma OCC preserved</StatusBadge>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.75fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA personal core</p>
            <h1 className="mt-2 text-3xl font-semibold text-occ-platinum">Identity, Memory, and Life Graph</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              Release 2 adds user-controlled personal context while keeping operational Emma OCC behavior unchanged. Memory remains opt-in and source-labeled.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Fingerprint size={15} className="text-occ-cyan" />
                Identity
              </div>
              <strong className="mt-2 block text-xl text-white">{profile?.preferred_name || user?.email || "Not set"}</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Brain size={15} className="text-occ-gold" />
                Life graph
              </div>
              <strong className="mt-2 block text-xl text-white">{readiness.lifeGraphCount} records</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                {memorySettings.allowAiSuggestions ? <Sparkles size={15} className="text-occ-cyan" /> : <ShieldCheck size={15} className="text-occ-green" />}
                AI memory
              </div>
              <strong className="mt-2 block text-xl text-white">{readiness.aiMemorySuggestions}</strong>
            </div>
          </div>
        </div>
      </section>

      <PersonalCorePanel
        initialProfile={{
          preferredName: profile?.preferred_name ?? "",
          familyContext: profile?.family_context ?? "",
          primaryLanguage: profile?.primary_language ?? "en",
          timezone: profile?.timezone ?? process.env.APP_TIMEZONE ?? "Europe/Amsterdam"
        }}
        initialMemorySettings={memorySettings}
        counts={counts}
      />
    </div>
  );
}
