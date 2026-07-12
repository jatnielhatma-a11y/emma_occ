import { AlertTriangle, CheckCircle2, Rocket, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { buildProductionHealthReport } from "@/lib/operations/health";
import {
  buildProductionReadinessSummary,
  productionGateGuardrail,
  release6SeedRecords,
  type ProductionReadinessRecord
} from "@/lib/nova/production-readiness";

export const dynamic = "force-dynamic";

function statusTone(status: ProductionReadinessRecord["status"]) {
  if (status === "passed") return "green";
  if (status === "blocked") return "red";
  if (status === "attention") return "amber";
  return "neutral";
}

function healthTone(status: "ok" | "degraded" | "down") {
  if (status === "ok") return "green";
  if (status === "degraded") return "amber";
  return "red";
}

export default async function ProductionReadinessPage() {
  const health = await buildProductionHealthReport();
  const records = release6SeedRecords(health.checkedAt);
  const summary = buildProductionReadinessSummary(records);

  return (
    <div className="space-y-5">
      <section className="nova-surface rounded-lg border border-occ-line p-5 shadow-nova">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="green">Release 6 active</StatusBadge>
          <StatusBadge tone={summary.launchStatus === "launch-ready" ? "green" : summary.launchStatus === "blocked" ? "red" : "amber"}>
            {summary.launchStatus.replaceAll("-", " ")}
          </StatusBadge>
          <StatusBadge tone={healthTone(health.status)}>health {health.status}</StatusBadge>
          <StatusBadge tone="neutral">Emma OCC preserved</StatusBadge>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.75fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA production readiness</p>
            <h1 className="mt-2 text-3xl font-semibold text-occ-platinum">Release Gates, Monitoring, Rollback, Privacy, and Commute Accuracy</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              Release 6 hardens NOVA for daily use. It keeps the launch gate honest by separating automated checks from manual proof points like rollback rehearsal, installed PWA behavior, and planned-versus-actual commute accuracy.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Rocket size={15} className="text-occ-cyan" />
                Gates covered
              </div>
              <strong className="mt-2 block text-2xl text-white">
                {summary.coveredGateCount}/{summary.requiredGateCount}
              </strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <AlertTriangle size={15} className="text-occ-amber" />
                Follow-ups
              </div>
              <strong className="mt-2 block text-2xl text-white">{summary.warnings}</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <ShieldCheck size={15} className="text-occ-green" />
                Critical gates
              </div>
              <strong className="mt-2 block text-2xl text-white">{summary.criticalPassed ? "Passed" : "Review"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-occ-gold">Release 6 gates</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Production Checklist</h2>
            </div>
            <StatusBadge tone={summary.blockers ? "red" : "green"}>{summary.blockers} blockers</StatusBadge>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {records.map((record) => {
              const guardrail = productionGateGuardrail(record);
              return (
                <article key={record.gate} className="rounded-md border border-occ-line bg-occ-ink p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(record.status)}>{record.status}</StatusBadge>
                    <StatusBadge tone={guardrail === "ready" ? "green" : "amber"}>{guardrail.replaceAll("-", " ")}</StatusBadge>
                  </div>
                  <h3 className="mt-3 font-semibold text-white">{record.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{record.detail}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.14em] text-zinc-600">
                    {record.gate.replaceAll("_", " ")} · {record.severity} · {record.sourceFreshness}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Live health</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Integration Status</h2>
            </div>
            <StatusBadge tone={healthTone(health.status)}>{health.status}</StatusBadge>
          </div>
          <div className="mt-4 divide-y divide-occ-line">
            {health.checks.map((item) => (
              <div key={item.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CheckCircle2 size={16} className={item.status === "ok" ? "text-occ-green" : item.status === "down" ? "text-occ-red" : "text-occ-amber"} />
                  <h3 className="font-medium text-white">{item.label}</h3>
                  <StatusBadge tone={healthTone(item.status)}>{item.freshness}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
