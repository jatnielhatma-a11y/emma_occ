import { Activity, BellRing, BrainCircuit, CarFront, HeartHandshake, LockKeyhole, Smartphone, Sparkles, Target } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  buildRelease8OptimizationSummary,
  optimizationGuardrail,
  release8SeedRecords,
  type OptimizationFocus,
  type OptimizationRecord
} from "@/lib/nova/post-launch-optimization";

const focusIcons: Record<OptimizationFocus, typeof Sparkles> = {
  usage_feedback: Activity,
  commute_accuracy: CarFront,
  duty_risk: Target,
  memory_recommendations: BrainCircuit,
  proactive_planning: Sparkles,
  mobile_pwa_polish: Smartphone,
  privacy_controls: LockKeyhole,
  family_context: HeartHandshake,
  monitoring_tuning: BellRing
};

function statusTone(status: OptimizationRecord["status"]) {
  if (status === "verified") return "green";
  if (status === "tuning") return "cyan";
  if (status === "paused") return "amber";
  return "neutral";
}

function guardrailTone(guardrail: string) {
  if (guardrail === "verified-improvement") return "green";
  if (guardrail === "active-learning") return "cyan";
  if (guardrail === "paused-for-review") return "amber";
  return "red";
}

export default function OptimizationPage() {
  const records = release8SeedRecords();
  const summary = buildRelease8OptimizationSummary(records);

  return (
    <div className="space-y-5">
      <section className="nova-surface rounded-lg border border-occ-line p-5 shadow-nova">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="green">Release 8 active</StatusBadge>
          <StatusBadge tone={summary.status === "learning-ready" ? "green" : summary.status === "review-required" ? "amber" : "neutral"}>
            {summary.status.replaceAll("-", " ")}
          </StatusBadge>
          <StatusBadge tone={summary.recommendationMode === "advisory-ready" ? "cyan" : "amber"}>{summary.recommendationMode.replaceAll("-", " ")}</StatusBadge>
          <StatusBadge tone="neutral">No silent automation</StatusBadge>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.75fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA post-launch optimization</p>
            <h1 className="mt-2 text-3xl font-semibold text-occ-platinum">Release 8 Autonomous Operations and Refinement</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              Release 8 improves NOVA from real daily use: commute accuracy, duty-risk forecasting, daily planning, family context, privacy controls, mobile polish, monitoring quality, and recommendation tuning. It keeps actions advisory until you approve them.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Optimization focus</p>
              <strong className="mt-2 block text-xl text-white">
                {summary.coveredFocusCount}/{summary.requiredFocusCount}
              </strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Tuning loops</p>
              <strong className="mt-2 block text-xl text-white">{summary.tuningCount}</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Privacy posture</p>
              <strong className="mt-2 block text-xl text-white">{summary.privacyReady ? "Ready" : "Review"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {records.map((record) => {
          const Icon = focusIcons[record.focus];
          const guardrail = optimizationGuardrail(record);
          return (
            <article key={record.focus} className="rounded-lg border border-occ-line bg-occ-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
                    <Icon size={17} />
                  </span>
                  <span>{record.focus.replaceAll("_", " ")}</span>
                </div>
                <StatusBadge tone={statusTone(record.status)}>{record.status}</StatusBadge>
              </div>
              <h2 className="mt-4 font-semibold text-white">{record.title}</h2>
              <p className="mt-2 text-sm text-zinc-500">{record.detail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge tone={guardrailTone(guardrail)}>{guardrail.replaceAll("-", " ")}</StatusBadge>
                <StatusBadge tone={record.impact === "high" ? "amber" : "neutral"}>{record.impact} impact</StatusBadge>
                <StatusBadge tone={record.sourceFreshness === "live" ? "green" : record.sourceFreshness === "recent" ? "cyan" : "neutral"}>{record.sourceFreshness}</StatusBadge>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
