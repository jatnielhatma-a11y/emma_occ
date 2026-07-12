import { StatusBadge } from "./StatusBadge";

type Conflict = {
  id: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  title: string;
  detail: string | null;
  conflict_type: string;
};

const toneBySeverity = {
  Low: "neutral",
  Medium: "amber",
  High: "red",
  Critical: "red"
} as const;

export function ConflictPanel({ conflicts }: { conflicts: Conflict[] }) {
  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Upcoming conflicts</h2>
          <p className="text-sm text-zinc-500">Operational issues found in imported duties</p>
        </div>
        <StatusBadge tone={conflicts.length ? "red" : "green"}>{conflicts.length ? "Attention" : "Clear"}</StatusBadge>
      </div>

      <div className="mt-5 space-y-3">
        {conflicts.length ? (
          conflicts.slice(0, 5).map((conflict) => (
            <div key={conflict.id} className="rounded-md border border-occ-line bg-occ-ink p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm text-white">{conflict.title}</strong>
                <StatusBadge tone={toneBySeverity[conflict.severity]}>{conflict.severity}</StatusBadge>
              </div>
              <p className="mt-2 text-sm text-zinc-400">{conflict.detail}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No active conflicts detected.</p>
        )}
      </div>
    </section>
  );
}
