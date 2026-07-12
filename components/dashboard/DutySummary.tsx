import { StatusBadge } from "./StatusBadge";

type DashboardDuty = {
  duty_date: string;
  start_time: string | null;
  end_time: string | null;
  duty_label: string;
  original_duty_code: string | null;
  location: string | null;
  is_overnight: boolean;
  is_off: boolean;
};

function timeRange(duty?: DashboardDuty | null) {
  if (!duty) return "No duty loaded";
  if (duty.is_off) return "Rest day";
  return `${duty.start_time?.slice(0, 5) ?? "--:--"}-${duty.end_time?.slice(0, 5) ?? "--:--"}`;
}

export function DutySummary({ todayDuty, nextDuty }: { todayDuty?: DashboardDuty | null; nextDuty?: DashboardDuty | null }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[{ title: "Today's duty", duty: todayDuty }, { title: "Next duty", duty: nextDuty }].map((item) => (
        <section key={item.title} className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">{item.title}</h2>
            {item.duty ? (
              <StatusBadge tone={item.duty.is_off ? "green" : item.duty.is_overnight ? "violet" : "cyan"}>
                {item.duty.duty_label}
              </StatusBadge>
            ) : (
              <StatusBadge>No roster</StatusBadge>
            )}
          </div>
          <p className="mt-5 text-3xl font-semibold text-white">{timeRange(item.duty)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-400">
            <span>
              Date
              <strong className="mt-1 block text-zinc-100">{item.duty?.duty_date ?? "Waiting for import"}</strong>
            </span>
            <span>
              Location
              <strong className="mt-1 block text-zinc-100">{item.duty?.location ?? "n/a"}</strong>
            </span>
          </div>
        </section>
      ))}
    </div>
  );
}
