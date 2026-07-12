"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, normalizeLocale, readMessage, type SupportedLocale } from "@/lib/i18n/config";

type LanguageContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectInitialLocale(): SupportedLocale {
  if (typeof window === "undefined") return defaultLocale;

  const saved = window.localStorage.getItem("nova-locale");
  if (saved) return normalizeLocale(saved);

  const cookieMatch = document.cookie.match(/(?:^|; )nova_locale=([^;]+)/);
  if (cookieMatch?.[1]) return normalizeLocale(decodeURIComponent(cookieMatch[1]));

  return normalizeLocale(window.navigator.language);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, updateLocale] = useState<SupportedLocale>(defaultLocale);

  useEffect(() => {
    updateLocale(detectInitialLocale());
  }, []);

  const setLocale = (nextLocale: SupportedLocale) => {
    updateLocale(nextLocale);
    window.localStorage.setItem("nova-locale", nextLocale);
    document.cookie = `nova_locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = nextLocale;
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: string) => readMessage(locale, key)
    }),
    [locale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useI18n must be used inside LanguageProvider.");
  }
  return context;
}
