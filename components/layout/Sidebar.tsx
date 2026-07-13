"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BrainCircuit,
  CalendarClock,
  CheckSquare,
  Cpu,
  Bell,
  Fingerprint,
  Gauge,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  Network,
  RadioTower,
  Rocket,
  Route,
  Settings,
  Sparkles,
  TrafficCone
} from "lucide-react";
import clsx from "clsx";
import Image from "next/image";
import { useI18n } from "@/components/i18n/LanguageProvider";

const navItems = [
  { href: "/dashboard", labelKey: "nav.missionControl", icon: LayoutDashboard },
  { href: "/platform", labelKey: "nav.platform", icon: Network },
  { href: "/personal-core", labelKey: "nav.personalCore", icon: Fingerprint },
  { href: "/life-domains", labelKey: "nav.lifeDomains", icon: HeartHandshake },
  { href: "/intelligence", labelKey: "nav.intelligence", icon: BrainCircuit },
  { href: "/nova-intelligence", labelKey: "nav.novaIntelligence", icon: Cpu },
  { href: "/production-readiness", labelKey: "nav.productionReadiness", icon: Rocket },
  { href: "/optimization", labelKey: "nav.optimization", icon: Sparkles },
  { href: "/mission-intelligence", labelKey: "nav.missionIntelligence", icon: RadioTower },
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

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-occ-line nova-surface px-4 py-5 shadow-nova lg:block">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2">
        <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-occ-gold/50 bg-white shadow-nova">
          <Image src="/brand/emma-occ-badge.png" alt="NOVA badge" width={48} height={48} className="h-full w-full object-cover" />
        </span>
        <span>
          <span className="block text-lg font-semibold text-occ-platinum">{t("product.name")}</span>
          <span className="block text-xs uppercase tracking-[0.18em] text-occ-gold">{t("product.subtitle")}</span>
        </span>
      </Link>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href.split("#")[0];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-occ-cyan text-occ-ink shadow-nova"
                  : "text-zinc-300 hover:bg-occ-panel2 hover:text-occ-platinum"
              )}
            >
              <Icon size={18} />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
