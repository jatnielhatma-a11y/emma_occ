import { Activity, CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { ProviderHealth } from "@/lib/providers/types";

const iconByStatus = {
  green: CheckCircle2,
  amber: CircleAlert,
  red: CircleX
};

export function IntegrationHealthPanel({ health }: { health: ProviderHealth[] }) {
  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA Core</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Integration health</h2>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
          <Activity size={20} />
        </span>
      </div>
      <div className="mt-4 divide-y divide-occ-line">
        {health.map((item) => {
          const Icon = iconByStatus[item.status];
          return (
            <div key={item.id} className="grid gap-3 py-3 sm:grid-cols-[1.25rem_1fr_auto] sm:items-center">
              <Icon size={18} className={item.status === "green" ? "text-occ-green" : item.status === "red" ? "text-occ-red" : "text-occ-amber"} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{item.label}</p>
                  <StatusBadge tone={item.status}>{item.freshness}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
              </div>
              <p className="text-right text-xs text-zinc-500">
                {item.source}
                <span className="block text-zinc-400">{item.confidence}% confidence</span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
