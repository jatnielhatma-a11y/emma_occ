"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, CalendarClock, CheckSquare, Gauge, Inbox, LayoutDashboard, Network, Route, Settings, TrafficCone } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/components/i18n/LanguageProvider";

const navItems = [
  { href: "/dashboard", labelKey: "nav.missionControl", icon: LayoutDashboard },
  { href: "/platform", labelKey: "nav.platform", icon: Network },
  { href: "/dashboard#emma-occ", labelKey: "nav.occ", icon: Gauge },
  { href: "/calendar-sync", labelKey: "nav.calendar", icon: CalendarClock },
  { href: "/commute", labelKey: "nav.commute", icon: Route },
  { href: "/traffic", labelKey: "nav.traffic", icon: TrafficCone },
  { href: "/notifications", labelKey: "nav.notifications", icon: Bell },
  { href: "/email", labelKey: "nav.email", icon: Inbox },
  { href: "/tasks", labelKey: "nav.tasks", icon: CheckSquare },
  { href: "/analytics", labelKey: "nav.analytics", icon: BarChart3 },
  { href: "/settings", labelKey: "nav.settings", icon: Settings }
];

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-occ-line bg-occ-panel/95 px-2 py-2 shadow-nova backdrop-blur lg:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href.split("#")[0];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "focus-ring flex min-h-12 min-w-20 flex-col items-center justify-center gap-1 rounded-md px-2 text-[10px]",
              active ? "bg-occ-cyan text-occ-ink shadow-nova" : "text-zinc-400"
            )}
          >
            <Icon size={17} />
            <span className="max-w-full truncate">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
