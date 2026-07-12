"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";

export function HeaderClock({ timeZone }: { timeZone: string }) {
  const { t, locale } = useI18n();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const localFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
    [locale, timeZone]
  );

  const utcFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
    [locale]
  );

  return (
    <div className="order-3 flex w-full justify-center md:order-2 md:w-auto">
      <div className="flex min-w-0 items-center gap-3 rounded-md border border-occ-line bg-occ-panel px-3 py-2 shadow-occ">
        <Clock3 size={16} className="shrink-0 text-occ-cyan" />
        <div className="grid grid-cols-2 gap-3 font-mono text-xs text-zinc-300 sm:text-sm">
          <span>
            <span className="mr-1 font-sans text-[10px] uppercase tracking-[0.16em] text-zinc-500">{t("shell.localTime")}</span>
            {now ? localFormatter.format(now) : "--:--:--"}
          </span>
          <span>
            <span className="mr-1 font-sans text-[10px] uppercase tracking-[0.16em] text-zinc-500">{t("shell.utcTime")}</span>
            {now ? utcFormatter.format(now) : "--:--:--"}
          </span>
        </div>
      </div>
    </div>
  );
}
