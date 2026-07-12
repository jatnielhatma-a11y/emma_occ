import { Bot, BrainCircuit, Lightbulb, Radar, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { IntelligencePanel } from "@/components/nova/IntelligencePanel";
import { buildIntelligenceReadiness, emptyIntelligenceCounts, type IntelligenceCounts, type IntelligenceKind } from "@/lib/nova/intelligence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const intelligenceCards: Array<{ kind: IntelligenceKind; label: string; icon: typeof BrainCircuit }> = [
  { kind: "prediction", label: "Predictions", icon: Radar },
  { kind: "recommendation", label: "Recommendations", icon: Lightbulb },
  { kind: "context_signal", label: "Context", icon: BrainCircuit },
  { kind: "automation_rule", label: "Automation", icon: ShieldCheck },
  { kind: "daily_ai_routine", label: "Daily AI", icon: Bot }
];

async function countKind(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string | undefined, kind: IntelligenceKind) {
  if (!userId) return 0;
  const { count } = await supabase
    .from("nova_intelligence_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .is("archived_at", null);
  return count ?? 0;
}

export default async function IntelligencePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const userId = user?.id;
  const kindCounts = await Promise.all(intelligenceCards.map((card) => countKind(supabase, userId, card.kind)));
  const counts = intelligenceCards.reduce<IntelligenceCounts>(
    (next, card, index) => ({ ...next, [card.kind]: kindCounts[index] ?? 0 }),
    { ...emptyIntelligenceCounts }
  );
  const readiness = buildIntelligenceReadiness(counts);
  const { data: recentRecords = [] } = userId
    ? await supabase
        .from("nova_intelligence_records")
        .select("id,kind,title,detail,status,confidence,risk,source_type,automation_enabled,requires_confirmation,created_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(8)
    : { data: [] };

  return (
    <div className="space-y-5">
      <section className="nova-surface rounded-lg border border-occ-line p-5 shadow-nova">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="green">Release 4 active</StatusBadge>
          <StatusBadge tone={readiness.totalRecords > 0 ? "cyan" : "amber"}>{readiness.recommendationStatus}</StatusBadge>
          <StatusBadge tone="amber">{readiness.automationStatus}</StatusBadge>
          <StatusBadge tone="neutral">Emma OCC preserved</StatusBadge>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.75fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA intelligence</p>
            <h1 className="mt-2 text-3xl font-semibold text-occ-platinum">Prediction, Recommendations, Context, Automation, and Daily AI</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              Release 4 turns verified operational context into advisory records. Automation stays disabled by default and requires confirmation before it can affect calendar, commute, email, notification, or memory workflows.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Intelligence layers</p>
              <strong className="mt-2 block text-xl text-white">{readiness.activeLayerCount}/5 started</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Records</p>
              <strong className="mt-2 block text-xl text-white">{readiness.totalRecords}</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Boundary</p>
              <strong className="mt-2 block text-xl text-white">Advisory only</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {intelligenceCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.kind} className="rounded-lg border border-occ-line bg-occ-panel p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Icon size={16} className="text-occ-cyan" />
                {card.label}
              </div>
              <strong className="mt-2 block text-2xl text-white">{counts[card.kind]}</strong>
            </article>
          );
        })}
      </section>

      <IntelligencePanel recentRecords={recentRecords ?? []} />
    </div>
  );
}
