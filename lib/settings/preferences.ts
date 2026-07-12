import { z } from "zod";
import { normalizeLocale } from "@/lib/i18n/config";

export const routePreferencesSchema = z.object({
  preferDirectTrains: z.boolean().default(true),
  minimizeTransfers: z.boolean().default(true),
  minimizeWalking: z.boolean().default(false),
  preferFastestArrival: z.boolean().default(true),
  preferLowestCost: z.boolean().default(false),
  allowCycling: z.boolean().default(false),
  allowBus: z.boolean().default(true),
  allowTaxi: z.boolean().default(true),
  avoidPoorlyLitRoutesAtNight: z.boolean().default(true),
  avoidStairs: z.boolean().default(false),
  requireStepFreeAccess: z.boolean().default(false),
  extraWeatherBufferMinutes: z.number().int().min(0).max(60).default(5),
  stationArrivalBufferMinutes: z.number().int().min(0).max(60).default(12),
  normalWalkingSpeedKmh: z.number().min(1).max(8).default(4.8),
  reducedWalkingSpeedKmh: z.number().min(1).max(8).default(3.6),
  preferFamiliarRoutes: z.boolean().default(true),
  preferReliabilityOverSpeed: z.boolean().default(true)
});

export const locationPreferencesSchema = z.object({
  enabled: z.boolean().default(false),
  highAccuracyWhenCommuting: z.boolean().default(false),
  storeCoarseEvents: z.boolean().default(true),
  storeRawHistory: z.boolean().default(false),
  stationRadiusMeters: z.number().int().min(50).max(2000).default(350),
  homeRadiusMeters: z.number().int().min(25).max(1000).default(160),
  workRadiusMeters: z.number().int().min(25).max(1000).default(180)
});

export const privacySettingsSchema = z.object({
  gmailTriageEnabled: z.boolean().default(false),
  calendarReadEnabled: z.boolean().default(true),
  locationDataRetentionDays: z.number().int().min(1).max(365).default(30),
  commuteHistoryRetentionDays: z.number().int().min(7).max(730).default(180),
  allowAiCalendarContext: z.boolean().default(true),
  allowAiEmailContext: z.boolean().default(false)
});

export const notificationPreferencesSchema = z.object({
  conflicts: z.boolean().default(true),
  syncFailures: z.boolean().default(true),
  leaveHome: z.boolean().default(true),
  returnTrip: z.boolean().default(true),
  delayOrCancellation: z.boolean().default(true),
  platformChange: z.boolean().default(true),
  severeWeather: z.boolean().default(true),
  integrationFailure: z.boolean().default(true),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).default("23:00"),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).default("07:00")
});

export const phase2PreferencesSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  preferredLanguage: z.enum(["en", "es", "fr"]).default("en"),
  timezone: z.string().trim().min(1).max(80).default("Europe/Amsterdam"),
  routePreferences: routePreferencesSchema,
  locationPreferences: locationPreferencesSchema,
  privacySettings: privacySettingsSchema,
  notificationPreferences: notificationPreferencesSchema
});

export type RoutePreferences = z.infer<typeof routePreferencesSchema>;
export type LocationPreferences = z.infer<typeof locationPreferencesSchema>;
export type PrivacySettings = z.infer<typeof privacySettingsSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type Phase2Preferences = z.infer<typeof phase2PreferencesSchema>;

export const defaultRoutePreferences = routePreferencesSchema.parse({});
export const defaultLocationPreferences = locationPreferencesSchema.parse({});
export const defaultPrivacySettings = privacySettingsSchema.parse({});
export const defaultNotificationPreferences = notificationPreferencesSchema.parse({});

export function normalizePhase2Preferences(input: {
  displayName?: string | null;
  preferredLanguage?: string | null;
  timezone?: string | null;
  routePreferences?: unknown;
  locationPreferences?: unknown;
  privacySettings?: unknown;
  notificationPreferences?: unknown;
}): Phase2Preferences {
  return phase2PreferencesSchema.parse({
    displayName: input.displayName || "NOVA operator",
    preferredLanguage: normalizeLocale(input.preferredLanguage),
    timezone: input.timezone || "Europe/Amsterdam",
    routePreferences: routePreferencesSchema.parse(input.routePreferences ?? {}),
    locationPreferences: locationPreferencesSchema.parse(input.locationPreferences ?? {}),
    privacySettings: privacySettingsSchema.parse(input.privacySettings ?? {}),
    notificationPreferences: notificationPreferencesSchema.parse(input.notificationPreferences ?? {})
  });
}
