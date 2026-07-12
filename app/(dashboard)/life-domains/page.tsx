import { BookOpen, HeartPulse, Home, Landmark, Plane } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { LifeDomainsPanel } from "@/components/nova/LifeDomainsPanel";
import { buildLifeDomainReadiness, emptyLifeDomainCounts, type LifeDomain, type LifeDomainCounts } from "@/lib/nova/life-domains";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const domainCards: Array<{ domain: LifeDomain; label: string; icon: typeof Landmark }> = [
  { domain: "finance", label: "Finance", icon: Landmark },
  { domain: "home", label: "Home", icon: Home },
  { domain: "travel", label: "Travel", icon: Plane },
  { domain: "health", label: "Health", icon: HeartPulse },
  { domain: "learning", label: "Learning", icon: BookOpen }
];

async function countDomain(supabase: ReturnType<typeof createSupabaseServerClient>, userId: string | undefined, domain: LifeDomain) {
  if (!userId) return 0;
  const { count } = await supabase
    .from("nova_life_domain_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("domain", domain)
    .is("archived_at", null);
  return count ?? 0;
}

export default async function LifeDomainsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const userId = user?.id;
  const domainCounts = await Promise.all(domainCards.map((card) => countDomain(supabase, userId, card.domain)));
  const counts = domainCards.reduce<LifeDomainCounts>(
    (next, card, index) => ({ ...next, [card.domain]: domainCounts[index] ?? 0 }),
    { ...emptyLifeDomainCounts }
  );
  const readiness = buildLifeDomainReadiness(counts);

  return (
    <div className="space-y-5">
      <section className="nova-surface rounded-lg border border-occ-line p-5 shadow-nova">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="green">Release 3 active</StatusBadge>
          <StatusBadge tone={readiness.totalRecords > 0 ? "cyan" : "amber"}>{readiness.recommendationStatus}</StatusBadge>
          <StatusBadge tone="neutral">Emma OCC preserved</StatusBadge>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.75fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA life domains</p>
            <h1 className="mt-2 text-3xl font-semibold text-occ-platinum">Finance, Home, Travel, Health, and Learning</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              Release 3 adds structured personal life domains that can inform later recommendations after explicit review. It does not connect banks, diagnose health, or change Emma OCC operations.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Domain coverage</p>
              <strong className="mt-2 block text-xl text-white">{readiness.activeDomainCount}/5 started</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Records</p>
              <strong className="mt-2 block text-xl text-white">{readiness.totalRecords}</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Boundary</p>
              <strong className="mt-2 block text-xl text-white">Manual only</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {domainCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.domain} className="rounded-lg border border-occ-line bg-occ-panel p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Icon size={16} className="text-occ-cyan" />
                {card.label}
              </div>
              <strong className="mt-2 block text-2xl text-white">{counts[card.domain]}</strong>
            </article>
          );
        })}
      </section>

      <LifeDomainsPanel counts={counts} />
    </div>
  );
}
