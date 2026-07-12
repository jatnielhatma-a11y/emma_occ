"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type LiveClockProps = {
  timeZone: string;
};

export function LiveClock({ timeZone }: LiveClockProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
    [timeZone]
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        weekday: "short",
        day: "2-digit",
        month: "short"
      }),
    [timeZone]
  );

  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400">Actual time</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-white">{timeFormatter.format(now)}</p>
          <p className="mt-1 text-xs text-zinc-500">{dateFormatter.format(now)} - {timeZone}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
          <Clock3 size={20} />
        </span>
      </div>
    </section>
  );
}
