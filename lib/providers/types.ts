export type ProviderFreshness = "live" | "recent" | "stale" | "fallback" | "unavailable";
export type ProviderRisk = "green" | "amber" | "red";

export type ProviderSource = {
  name: string;
  retrievedAt: string;
  freshness: ProviderFreshness;
  confidence: number;
  isFallback: boolean;
  error?: string;
};

export type ProviderResult<TData> = {
  data: TData | null;
  source: ProviderSource;
};

export type ProviderHealth = {
  id: string;
  label: string;
  status: ProviderRisk;
  source: string;
  freshness: ProviderFreshness;
  confidence: number;
  detail: string;
  checkedAt: string;
};

export interface CalendarProvider {
  readonly id: string;
  getUpcomingEvents(): Promise<ProviderResult<unknown[]>>;
}

export interface EmailProvider {
  readonly id: string;
  getActionableItems(): Promise<ProviderResult<unknown[]>>;
}

export interface MapsProvider {
  readonly id: string;
  getWalkingRoute(input: unknown): Promise<ProviderResult<unknown>>;
}

export interface TrafficProvider {
  readonly id: string;
  getIncidents(input: unknown): Promise<ProviderResult<unknown[]>>;
}

export interface TransitProvider {
  readonly id: string;
  getJourney(input: unknown): Promise<ProviderResult<unknown>>;
}

export interface WeatherProvider {
  readonly id: string;
  getCurrentWeather(input: unknown): Promise<ProviderResult<unknown>>;
}

export interface LocationProvider {
  readonly id: string;
  getCurrentLocation(): Promise<ProviderResult<unknown>>;
}

export interface NotificationProvider {
  readonly id: string;
  notify(input: unknown): Promise<ProviderResult<{ sent: boolean }>>;
}

export interface AIProvider {
  readonly id: string;
  createDailyBrief(input: unknown): Promise<ProviderResult<string>>;
}
