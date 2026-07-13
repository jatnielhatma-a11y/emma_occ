import { BrainCircuit, CheckCircle2, Clock3, FileCheck2, LockKeyhole, Mic, Navigation, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { MissionVoicePanel } from "@/components/nova/MissionVoicePanel";
import {
  buildRelease9MissionSummary,
  missionGuardrail,
  release9SeedRecords,
  type MissionFocus,
  type MissionRecord
} from "@/lib/nova/mission-intelligence";

const focusIcons: Record<MissionFocus, typeof Mic> = {
  mission_priorities: ShieldCheck,
  predictive_windows: Clock3,
  voice_command: Mic,
  command_router: Navigation,
  automation_drafts: FileCheck2,
  trend_intelligence: BrainCircuit,
  next_best_action: CheckCircle2,
  incident_learning: LockKeyhole
};

function statusTone(status: MissionRecord["status"]) {
  if (status === "ready") return "green";
  if (status === "needs-review") return "amber";
  if (status === "paused") return "red";
  return "cyan";
}

function guardrailTone(guardrail: string) {
  if (guardrail === "mission-ready") return "green";
  if (guardrail === "protected-draft") return "cyan";
  if (guardrail === "paused-for-review") return "amber";
  return "red";
}

export default function MissionIntelligencePage() {
  const records = release9SeedRecords();
  const summary = buildRelease9MissionSummary(records);

  return (
    <div className="space-y-5">
      <MissionVoicePanel />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-occ-line bg-occ-panel p-4">
          <p className="text-sm text-zinc-400">Mission focus</p>
          <strong className="mt-2 block text-2xl text-white">
            {summary.coveredFocusCount}/{summary.requiredFocusCount}
          </strong>
        </div>
        <div className="rounded-lg border border-occ-line bg-occ-panel p-4">
          <p className="text-sm text-zinc-400">Voice status</p>
          <strong className="mt-2 block text-2xl text-white">{summary.status.replaceAll("-", " ")}</strong>
        </div>
        <div className="rounded-lg border border-occ-line bg-occ-panel p-4">
          <p className="text-sm text-zinc-400">Autonomy mode</p>
          <strong className="mt-2 block text-2xl text-white">{summary.autonomyMode.replaceAll("-", " ")}</strong>
        </div>
        <div className="rounded-lg border border-occ-line bg-occ-panel p-4">
          <p className="text-sm text-zinc-400">Transcript storage</p>
          <strong className="mt-2 block text-2xl text-white">{summary.transcriptStorageDisabled ? "Off" : "Review"}</strong>
        </div>
      </section>

      <section className="nova-surface rounded-lg border border-occ-line p-5 shadow-nova">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="green">Release 9 active</StatusBadge>
          <StatusBadge tone={summary.blockers === 0 ? "green" : "amber"}>{summary.blockers} blockers</StatusBadge>
          <StatusBadge tone={summary.externalActionsRequireApproval ? "cyan" : "red"}>approval gated</StatusBadge>
          <StatusBadge tone="neutral">advisory autonomy</StatusBadge>
        </div>
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Autonomous mission intelligence</p>
          <h1 className="mt-2 text-3xl font-semibold text-occ-platinum">Release 9 Mission Voice and Command Routing</h1>
          <p className="mt-3 max-w-3xl text-sm text-zinc-400">
            Release 9 turns NOVA into a voice-controlled mission assistant for fast daily operations. It routes safe commands locally, keeps spoken control push-to-talk, and requires review before any calendar, email, notification, commute, or memory-changing action.
          </p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {records.map((record) => {
          const Icon = focusIcons[record.focus];
          const guardrail = missionGuardrail(record);
          const status = record.status ?? "monitoring";
          return (
            <article key={record.focus} className="rounded-lg border border-occ-line bg-occ-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
                  <Icon size={17} />
                </span>
                <StatusBadge tone={statusTone(status)}>{status.replaceAll("-", " ")}</StatusBadge>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.14em] text-zinc-500">{record.focus.replaceAll("_", " ")}</p>
              <h2 className="mt-2 font-semibold text-white">{record.title}</h2>
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
