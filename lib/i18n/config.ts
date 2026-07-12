import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";

export const supportedLocales = ["en", "es", "fr"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export type Messages = typeof en;

export const defaultLocale: SupportedLocale = "en";

export const messages: Record<SupportedLocale, Messages> = {
  en,
  es,
  fr
};

export function normalizeLocale(value?: string | null): SupportedLocale {
  const short = value?.toLowerCase().split("-")[0];
  return supportedLocales.includes(short as SupportedLocale) ? (short as SupportedLocale) : defaultLocale;
}

export function readMessage(locale: SupportedLocale, key: string) {
  const keys = key.split(".");
  let current: unknown = messages[locale];

  for (const item of keys) {
    if (typeof current !== "object" || current === null || !(item in current)) {
      current = messages[defaultLocale];
      for (const fallbackItem of keys) {
        if (typeof current !== "object" || current === null || !(fallbackItem in current)) {
          return key;
        }
        current = (current as Record<string, unknown>)[fallbackItem];
      }
      break;
    }

    current = (current as Record<string, unknown>)[item];
  }

  return typeof current === "string" ? current : key;
}
