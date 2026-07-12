import { Cpu, Eye, Mic, Network, Puzzle, UsersRound } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { NovaIntelligencePanel } from "@/components/nova/NovaIntelligencePanel";
import {
  buildNovaIntelligenceReadiness,
  emptyNovaCapabilityCounts,
  type NovaCapability,
  type NovaCapabilityCounts
} from "@/lib/nova/nova-intelligence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const capabilityCards: Array<{ capability: NovaCapability; label: string; icon: typeof Cpu }> = [
  { capability: "multi_device_sync", label: "Devices", icon: Network },
  { capability: "voice", label: "Voice", icon: Mic },
  { capability: "vision", label: "Vision", icon: Eye },
  { capability: "collaboration", label: "Family", icon: UsersRound },
  { capability: "developer_platform", label: "Developer", icon: Puzzle },
  { capability: "nova_intelligence", label: "NOVA", icon: Cpu }
];

async function countCapability(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string | undefined, capability: NovaCapability) {
  if (!userId) return 0;
  const { count } = await supabase
    .from("nova_capability_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("capability", capability)
    .is("archived_at", null);
  return count ?? 0;
}

export default async function NovaIntelligencePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const userId = user?.id;
  const capabilityCounts = await Promise.all(capabilityCards.map((card) => countCapability(supabase, userId, card.capability)));
  const counts = capabilityCards.reduce<NovaCapabilityCounts>(
    (next, card, index) => ({ ...next, [card.capability]: capabilityCounts[index] ?? 0 }),
    { ...emptyNovaCapabilityCounts }
  );
  const readiness = buildNovaIntelligenceReadiness(counts);
  const { data: recentRecords = [] } = userId
    ? await supabase
        .from("nova_capability_records")
        .select("id,capability,title,detail,status,privacy_mode,consent_required,consent_granted,local_only,sync_enabled,device_scope,risk,confidence,created_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(8)
    : { data: [] };

  return (
    <div className="space-y-5">
      <section className="nova-surface rounded-lg border border-occ-line p-5 shadow-nova">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="green">Release 5 active</StatusBadge>
          <StatusBadge tone={readiness.allCapabilitiesStarted ? "cyan" : "amber"}>{readiness.multimodalStatus}</StatusBadge>
          <StatusBadge tone={readiness.platformStatus === "extension-governed" ? "green" : "neutral"}>{readiness.platformStatus}</StatusBadge>
          <StatusBadge tone="neutral">Emma OCC preserved</StatusBadge>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.75fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA intelligence platform</p>
            <h1 className="mt-2 text-3xl font-semibold text-occ-platinum">Multi-device Sync, Voice, Vision, Collaboration, Developer Platform, and NOVA Intelligence</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              Release 5 completes the roadmap with a consent-gated platform layer. Voice and vision require explicit sessions, collaboration stays scoped, and developer extensions cannot access private context or server secrets without approved scopes.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Capabilities</p>
              <strong className="mt-2 block text-xl text-white">{readiness.activeCapabilityCount}/6 started</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Records</p>
              <strong className="mt-2 block text-xl text-white">{readiness.totalRecords}</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Sync</p>
              <strong className="mt-2 block text-xl text-white">{readiness.syncStatus}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {capabilityCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.capability} className="rounded-lg border border-occ-line bg-occ-panel p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Icon size={16} className="text-occ-cyan" />
                {card.label}
              </div>
              <strong className="mt-2 block text-2xl text-white">{counts[card.capability]}</strong>
            </article>
          );
        })}
      </section>

      <NovaIntelligencePanel recentRecords={recentRecords ?? []} />
    </div>
  );
}
