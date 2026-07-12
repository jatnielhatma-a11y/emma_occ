"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/components/i18n/LanguageProvider";

type ModulePlaceholderProps = {
  titleKey: string;
  detailKey: string;
};

export function ModulePlaceholder({ titleKey, detailKey }: ModulePlaceholderProps) {
  const { t } = useI18n();

  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone="amber">{t("modules.phaseOne")}</StatusBadge>
        <StatusBadge tone="neutral">Fallback only</StatusBadge>
      </div>
      <h1 className="mt-4 text-3xl font-semibold text-white">{t(titleKey)}</h1>
      <p className="mt-3 max-w-2xl text-sm text-zinc-400">{t(detailKey)}</p>
      <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-occ-cyan hover:text-white">
        {t("nav.missionControl")} <ArrowRight size={15} />
      </Link>
    </section>
  );
}
