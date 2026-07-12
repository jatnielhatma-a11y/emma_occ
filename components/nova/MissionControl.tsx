import { ArrowRight, Brain, ShieldCheck, TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

type MissionControlProps = {
  todayLabel: string;
  nextDutyLabel: string;
  commuteLabel: string;
  weatherLabel: string;
  activeConflictCount: number;
  calendarConnected: boolean;
  hasRoster: boolean;
  nsRisk: "green" | "amber" | "red";
  locationLabel?: string | null;
  commutePhase?: string | null;
  locationConfidence?: number | null;
};

function missionStatus(props: MissionControlProps) {
  if (props.activeConflictCount > 0 || props.nsRisk === "red") return "red";
  if (!props.calendarConnected || !props.hasRoster || props.nsRisk === "amber") return "amber";
  return "green";
}

function confidenceFor(status: "green" | "amber" | "red", props: MissionControlProps) {
  let confidence = status === "green" ? 88 : status === "amber" ? 66 : 44;
  if (!props.calendarConnected) confidence -= 8;
  if (!props.hasRoster) confidence -= 12;
  return Math.max(20, confidence);
}

export function MissionControl(props: MissionControlProps) {
  const status = missionStatus(props);
  const confidence = confidenceFor(status, props);
  const recommendation =
    status === "green"
      ? "Continue with the planned duty and commute window."
      : status === "amber"
        ? "Review calendar connection, route setup, and current commute panel before departure."
        : "Resolve active operational conflicts before relying on the current plan.";

  return (
    <section className="nova-surface rounded-lg border border-occ-line p-5 shadow-nova" id="mission-control">
      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={status}>{status.toUpperCase()} operational status</StatusBadge>
            <StatusBadge tone="cyan">{confidence}% mission confidence</StatusBadge>
            <StatusBadge tone="neutral">Family focused</StatusBadge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-occ-platinum">Mission Control</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            NOVA keeps family, duty, commute, weather, calendar, and integration readiness in one calm operational picture. Live data is labeled by provider health; placeholders are not presented as live.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Today</p>
              <strong className="mt-1 block text-white">{props.todayLabel}</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Next duty</p>
              <strong className="mt-1 block text-white">{props.nextDutyLabel}</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Commute</p>
              <strong className="mt-1 block text-white">{props.commuteLabel}</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <p className="text-sm text-zinc-400">Weather impact</p>
              <strong className="mt-1 block text-white">{props.weatherLabel}</strong>
            </div>
            <div className="rounded-md border border-occ-gold/30 bg-occ-ink/80 p-3 xl:col-span-2">
              <p className="text-sm text-zinc-400">Location</p>
              <strong className="mt-1 block text-white">{props.locationLabel ?? "Not active"}</strong>
              <span className="mt-1 block text-xs text-zinc-500">
                {props.commutePhase ? props.commutePhase.replaceAll("_", " ") : "GPS is optional"}{" "}
                {typeof props.locationConfidence === "number" ? `· ${Math.round(props.locationConfidence * 100)}% confidence` : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-occ-gold/30 bg-occ-ink/85 p-4 shadow-occ">
          <div className="flex items-center gap-2">
            {status === "red" ? <TriangleAlert size={18} className="text-occ-red" /> : <ShieldCheck size={18} className="text-occ-cyan" />}
            <h2 className="font-semibold text-white">Recommended action</h2>
          </div>
          <p className="mt-3 text-sm text-zinc-300">{recommendation}</p>
          <div className="mt-5 rounded-md border border-occ-line bg-occ-panel/90 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Brain size={16} className="text-occ-gold" />
              Daily brief readiness
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              AI Core provider interface is ready for Phase 5. This Phase 1 brief uses verified dashboard facts only.
            </p>
          </div>
          <a href="#emma-occ" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-occ-cyan hover:text-white">
            Open Emma OCC module <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
