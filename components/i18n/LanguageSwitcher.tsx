"use client";

import { Globe2 } from "lucide-react";
import { supportedLocales, type SupportedLocale } from "@/lib/i18n/config";
import { useI18n } from "./LanguageProvider";

const labelKeyByLocale: Record<SupportedLocale, string> = {
  en: "language.english",
  es: "language.spanish",
  fr: "language.french"
};

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="focus-within:ring-occ-cyan flex items-center gap-2 rounded-md border border-occ-line bg-occ-panel px-2 py-2 text-xs text-zinc-400 focus-within:ring-2">
      <Globe2 size={15} className="text-occ-cyan" />
      <span className={compact ? "sr-only" : "hidden sm:inline"}>{t("shell.language")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as SupportedLocale)}
        className="bg-transparent text-zinc-100 outline-none"
        aria-label={t("shell.language")}
      >
        {supportedLocales.map((item) => (
          <option key={item} value={item} className="bg-occ-panel text-white">
            {t(labelKeyByLocale[item])}
          </option>
        ))}
      </select>
    </label>
  );
}
