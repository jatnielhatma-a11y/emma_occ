import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  helper,
  icon: Icon
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
}) {
  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-3 text-sm text-zinc-500">{helper}</p>
    </section>
  );
}
