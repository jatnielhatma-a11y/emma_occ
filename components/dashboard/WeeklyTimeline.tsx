import { StatusBadge } from "./StatusBadge";

type TimelineDuty = {
  id: string;
  duty_date: string;
  start_time: string | null;
  end_time: string | null;
  duty_label: string;
  is_off: boolean;
  is_overnight: boolean;
};

function toneForDuty(duty: TimelineDuty) {
  if (duty.is_off) return "green" as const;
  if (duty.duty_label === "Night Shift") return "violet" as const;
  if (duty.duty_label === "Late Shift") return "amber" as const;
  return "cyan" as const;
}

export function WeeklyTimeline({ duties }: { duties: TimelineDuty[] }) {
  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">10-day schedule rollout</h2>
          <p className="text-sm text-zinc-500">Calendar-synced roster preview from today onward</p>
        </div>
        <StatusBadge tone="cyan">{duties.length} loaded</StatusBadge>
      </div>

      <div className="mt-5 divide-y divide-occ-line">
        {duties.length ? (
          duties.map((duty) => (
            <div key={duty.id} className="grid gap-3 py-3 sm:grid-cols-[120px_1fr_auto] sm:items-center">
              <span className="text-sm font-medium text-zinc-200">{duty.duty_date}</span>
              <div>
                <StatusBadge tone={toneForDuty(duty)}>{duty.duty_label}</StatusBadge>
                {duty.is_overnight ? <span className="ml-2 text-xs text-zinc-500">overnight</span> : null}
              </div>
              <span className="text-sm text-zinc-400">
                {duty.is_off ? "Rest day" : `${duty.start_time?.slice(0, 5) ?? "--:--"}-${duty.end_time?.slice(0, 5) ?? "--:--"}`}
              </span>
            </div>
          ))
        ) : (
          <p className="py-8 text-sm text-zinc-500">Import a roster to populate the operations timeline.</p>
        )}
      </div>
    </section>
  );
}
