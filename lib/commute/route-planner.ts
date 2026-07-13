import { fetchNsLiveTrip } from "./ns-live";
import { fetchGoogleRoute } from "../maps/google-routes";
import {
  build9292PlannerUrl,
  buildGoogleMapsUrl,
  buildNsPlannerUrl,
  fetchNsCommuteStatus,
  type NsCommuteStatus
} from "../ns-commute";
import type { LiveWeather } from "../live-demo";
import type { ProviderFreshness, ProviderSource } from "../providers/types";

export type CommuteDirection = "outbound" | "return";
export type RouteRisk = "green" | "amber" | "red";
export type RouteMode = "train" | "multimodal" | "transit" | "car" | "bike" | "walk";

export type CommutePlanIncident = {
  type: "disruption" | "platform_change" | "traffic_delay" | "weather_buffer" | "provider_fallback" | "route_setup";
  title: string;
  detail: string;
  severity: RouteRisk;
  source: string;
  delayMinutes?: number;
};

export type CommuteRouteOption = {
  id: string;
  rank: number;
  title: string;
  mode: RouteMode;
  action: string;
  detail: string;
  durationMinutes: number | null;
  delayMinutes: number;
  transfers: number | null;
  reliability: number;
  confidence: number;
  risk: RouteRisk;
  isLive: boolean;
  source: string;
  url: string | null;
};

export type CommutePlanSource = {
  name: string;
  freshness: ProviderFreshness;
  confidence: number;
  isLive: boolean;
  checkedAt: string;
  error?: string;
};

export type CommutePlan = {
  direction: CommuteDirection;
  status: RouteRisk;
  confidence: number;
  generatedAt: string;
  isLive: boolean;
  routeLabel: string;
  recommended: CommuteRouteOption | null;
  backups: CommuteRouteOption[];
  incidents: CommutePlanIncident[];
  sources: CommutePlanSource[];
};

type CommuteSettings = {
  before_minutes?: number | null;
  after_minutes?: number | null;
  home_address?: string | null;
  work_address?: string | null;
  home_station?: string | null;
  work_station?: string | null;
};

type RoutePreferences = {
  allowCycling?: boolean;
  minimizeTransfers?: boolean;
  minimizeWalking?: boolean;
  preferReliabilityOverSpeed?: boolean;
  extraWeatherBufferMinutes?: number;
  stationArrivalBufferMinutes?: number;
};

type BuildCommutePlanInput = {
  direction?: CommuteDirection;
  commute?: CommuteSettings | null;
  routePreferences?: RoutePreferences | null;
  weather?: LiveWeather | null;
};

function clampConfidence(value: number) {
  return Math.max(0.05, Math.min(0.99, Number(value.toFixed(3))));
}

function riskWeight(risk: RouteRisk) {
  return risk === "green" ? 0 : risk === "amber" ? 1 : 2;
}

function highestRisk(items: Array<RouteRisk | undefined>) {
  return items.reduce<RouteRisk>((current, item) => {
    if (!item) return current;
    return riskWeight(item) > riskWeight(current) ? item : current;
  }, "green");
}

function sourceFromProvider(source: ProviderSource): CommutePlanSource {
  return {
    name: source.name,
    freshness: source.freshness,
    confidence: source.confidence,
    isLive: !source.isFallback && source.freshness === "live",
    checkedAt: source.retrievedAt,
    error: source.error
  };
}

function optionRisk(input: { delayMinutes?: number; critical?: boolean; warning?: boolean; fallback?: boolean }) {
  if (input.critical || (input.delayMinutes ?? 0) >= 30) return "red";
  if (input.warning || input.fallback || (input.delayMinutes ?? 0) >= 5) return "amber";
  return "green";
}

function weatherBuffer(weather?: LiveWeather | null, preferences?: RoutePreferences | null) {
  if (!weather) return 0;
  const description = weather.description.toLowerCase();
  const wind = Number(weather.windKmph || 0);
  const base = Number(preferences?.extraWeatherBufferMinutes ?? 5);
  if (description.includes("snow") || description.includes("storm") || wind >= 45) return Math.max(base, 12);
  if (description.includes("rain") || description.includes("shower") || description.includes("mist") || wind >= 30) return Math.max(base, 7);
  return 0;
}

function rankRouteOptions(options: CommuteRouteOption[], preferences?: RoutePreferences | null) {
  return [...options]
    .sort((a, b) => {
      const riskDiff = riskWeight(a.risk) - riskWeight(b.risk);
      if (riskDiff) return riskDiff;
      if (preferences?.preferReliabilityOverSpeed !== false) {
        const reliabilityDiff = b.reliability - a.reliability;
        if (Math.abs(reliabilityDiff) > 0.01) return reliabilityDiff;
      }
      if (preferences?.minimizeTransfers) {
        const transferDiff = (a.transfers ?? 99) - (b.transfers ?? 99);
        if (transferDiff) return transferDiff;
      }
      return (a.durationMinutes ?? 9999) - (b.durationMinutes ?? 9999);
    })
    .map((option, index) => ({ ...option, rank: index + 1 }));
}

function routePoints(direction: CommuteDirection, commute?: CommuteSettings | null) {
  const homeAddress = commute?.home_address?.trim() || process.env.COMMUTE_HOME_ADDRESS || null;
  const workAddress = commute?.work_address?.trim() || process.env.COMMUTE_WORK_ADDRESS || null;
  const homeStation = commute?.home_station?.trim() || process.env.NS_HOME_STATION || null;
  const workStation = commute?.work_station?.trim() || process.env.NS_WORK_STATION || null;
  const outbound = direction === "outbound";

  return {
    origin: outbound ? homeAddress || homeStation : workAddress || workStation,
    destination: outbound ? workAddress || workStation : homeAddress || homeStation,
    originStation: outbound ? homeStation : workStation,
    destinationStation: outbound ? workStation : homeStation,
    homeAddress,
    workAddress,
    homeStation,
    workStation
  };
}

function incidentsFromNsStatus(nsStatus: NsCommuteStatus): CommutePlanIncident[] {
  return nsStatus.alerts.map((alert) => ({
    type: alert.title.toLowerCase().includes("platform") ? "platform_change" : "disruption",
    title: alert.title,
    detail: alert.detail,
    severity: alert.severity === "critical" ? "red" : "amber",
    source: nsStatus.source
  }));
}

export async function buildPhase4CommutePlan(input: BuildCommutePlanInput = {}): Promise<CommutePlan> {
  const direction = input.direction ?? "outbound";
  const points = routePoints(direction, input.commute);
  const generatedAt = new Date().toISOString();
  const bufferMinutes = weatherBuffer(input.weather, input.routePreferences);

  const [nsStatus, nsTrip, transitRoute, driveRoute, bikeRoute] = await Promise.all([
    fetchNsCommuteStatus({
      homeStation: points.homeStation,
      workStation: points.workStation,
      homeAddress: points.homeAddress,
      workAddress: points.workAddress
    }),
    fetchNsLiveTrip({
      fromStation: points.originStation,
      toStation: points.destinationStation
    }),
    fetchGoogleRoute({
      origin: points.origin,
      destination: points.destination,
      mode: "TRANSIT"
    }),
    fetchGoogleRoute({
      origin: points.origin,
      destination: points.destination,
      mode: "DRIVE"
    }),
    input.routePreferences?.allowCycling
      ? fetchGoogleRoute({
          origin: points.origin,
          destination: points.destination,
          mode: "BICYCLE"
        })
      : Promise.resolve(null)
  ]);

  const incidents = incidentsFromNsStatus(nsStatus);
  if (!points.origin || !points.destination) {
    incidents.push({
      type: "route_setup",
      title: "Commute route incomplete",
      detail: "Add home and work address or station details before NOVA can compare live route options.",
      severity: "amber",
      source: "NOVA settings"
    });
  }
  if (bufferMinutes) {
    incidents.push({
      type: "weather_buffer",
      title: "Weather buffer recommended",
      detail: `Current weather suggests adding ${bufferMinutes} minutes to the commute buffer.`,
      severity: "amber",
      source: input.weather?.source ?? "Weather"
    });
  }
  if (nsTrip.data?.cancelled) {
    incidents.push({
      type: "disruption",
      title: "NS trip cancellation",
      detail: "The selected NS trip response is marked as cancelled.",
      severity: "red",
      source: "NS API"
    });
  }
  if (nsTrip.data?.platformChanged) {
    incidents.push({
      type: "platform_change",
      title: "NS platform change",
      detail: "The NS API response reports a planned-versus-actual platform difference.",
      severity: "amber",
      source: "NS API"
    });
  }
  for (const message of nsTrip.data?.disruptions ?? []) {
    incidents.push({
      type: "disruption",
      title: "NS disruption",
      detail: message,
      severity: "amber",
      source: "NS API"
    });
  }
  if (driveRoute.data?.delayMinutes) {
    incidents.push({
      type: "traffic_delay",
      title: "Road traffic delay",
      detail: `Google Routes estimates ${driveRoute.data.delayMinutes} minutes of road delay.`,
      severity: driveRoute.data.delayMinutes >= 30 ? "red" : "amber",
      source: "Google Routes",
      delayMinutes: driveRoute.data.delayMinutes
    });
  }
  for (const source of [nsTrip.source, transitRoute.source, driveRoute.source, bikeRoute?.source].filter(Boolean) as ProviderSource[]) {
    if (source.isFallback) {
      incidents.push({
        type: "provider_fallback",
        title: `${source.name} fallback`,
        detail: source.error ?? "Live provider data is not available, so NOVA is using planner links and recent public references.",
        severity: "amber",
        source: source.name
      });
    }
  }

  const nsUrl =
    direction === "outbound"
      ? buildNsPlannerUrl(points.homeStation, points.workStation)
      : buildNsPlannerUrl(points.workStation, points.homeStation);
  const transitUrl = transitRoute.data?.url || buildGoogleMapsUrl(points.origin, points.destination, "transit");
  const driveUrl = driveRoute.data?.url || buildGoogleMapsUrl(points.origin, points.destination, "driving");
  const bikeUrl = bikeRoute?.data?.url || buildGoogleMapsUrl(points.origin, points.destination, "bicycling");
  const planner9292Url = build9292PlannerUrl(points.origin, points.destination);
  const nsDelay = nsTrip.data?.delayMinutes ?? 0;
  const nsRisk = optionRisk({
    delayMinutes: nsDelay + bufferMinutes,
    critical: Boolean(nsTrip.data?.cancelled),
    warning: nsStatus.status !== "clear" || Boolean(nsTrip.data?.platformChanged || nsTrip.data?.disruptions.length),
    fallback: nsTrip.source.isFallback
  });
  const roadRisk = optionRisk({
    delayMinutes: (driveRoute.data?.delayMinutes ?? 0) + bufferMinutes,
    fallback: driveRoute.source.isFallback
  });
  const transitRisk = optionRisk({
    delayMinutes: (transitRoute.data?.delayMinutes ?? 0) + bufferMinutes,
    fallback: transitRoute.source.isFallback,
    warning: nsStatus.status !== "clear"
  });

  const options: CommuteRouteOption[] = [
    {
      id: "ns-live",
      rank: 1,
      title: nsTrip.data ? "NS live rail route" : "NS rail planner",
      mode: "train",
      action: nsTrip.data ? "Use as primary rail check" : "Open before departure",
      detail: nsTrip.data
        ? `${points.originStation} to ${points.destinationStation}${nsDelay ? ` with ${nsDelay} min delay` : ""}`
        : nsStatus.status === "clear"
          ? "NS public status does not show route-specific attention language."
          : "NS needs a final planner check before leaving.",
      durationMinutes: nsTrip.data?.durationMinutes ?? null,
      delayMinutes: nsDelay,
      transfers: nsTrip.data?.transfers ?? null,
      reliability: nsRisk === "green" ? 0.9 : nsRisk === "amber" ? 0.62 : 0.35,
      confidence: nsTrip.source.confidence,
      risk: nsRisk,
      isLive: !nsTrip.source.isFallback && nsTrip.source.freshness === "live",
      source: nsTrip.source.name,
      url: nsUrl
    },
    {
      id: "google-transit",
      rank: 2,
      title: transitRoute.source.isFallback ? "Google transit planner" : "Live Google transit route",
      mode: "transit",
      action: "Compare station and walking legs",
      detail: transitRoute.data?.durationMinutes
        ? `${transitRoute.data.durationMinutes} min transit estimate${transitRoute.data.delayMinutes ? `, ${transitRoute.data.delayMinutes} min delay` : ""}`
        : "Cross-check public transport routing, station choice, and walking segments in Google Maps.",
      durationMinutes: transitRoute.data?.durationMinutes ?? null,
      delayMinutes: transitRoute.data?.delayMinutes ?? 0,
      transfers: null,
      reliability: transitRisk === "green" ? 0.74 : transitRisk === "amber" ? 0.56 : 0.3,
      confidence: transitRoute.source.confidence,
      risk: transitRisk,
      isLive: !transitRoute.source.isFallback && transitRoute.source.freshness === "live",
      source: transitRoute.source.name,
      url: transitUrl
    },
    {
      id: "google-drive",
      rank: 3,
      title: driveRoute.source.isFallback ? "Driving planner" : "Live road route",
      mode: "car",
      action: roadRisk === "green" ? "Viable backup" : "Use only after review",
      detail: driveRoute.data?.durationMinutes
        ? `${driveRoute.data.durationMinutes} min road estimate${driveRoute.data.delayMinutes ? `, ${driveRoute.data.delayMinutes} min delay` : ""}`
        : "Road route opens in Google Maps for final confirmation.",
      durationMinutes: driveRoute.data?.durationMinutes ?? null,
      delayMinutes: driveRoute.data?.delayMinutes ?? 0,
      transfers: 0,
      reliability: roadRisk === "green" ? 0.78 : roadRisk === "amber" ? 0.55 : 0.28,
      confidence: driveRoute.source.confidence,
      risk: roadRisk,
      isLive: !driveRoute.source.isFallback && driveRoute.source.freshness === "live",
      source: driveRoute.source.name,
      url: driveUrl
    },
    {
      id: "9292-ov",
      rank: 4,
      title: "9292 public transport",
      mode: "multimodal",
      action: "Door-to-door OV backup",
      detail: "Use as Dutch multimodal backup for train, bus, tram, metro, and walking legs. Full 9292 API access can replace this planner link when configured.",
      durationMinutes: null,
      delayMinutes: 0,
      transfers: null,
      reliability: 0.56,
      confidence: 0.46,
      risk: "amber",
      isLive: false,
      source: "9292 planner",
      url: planner9292Url
    }
  ];

  if (input.routePreferences?.allowCycling) {
    options.push({
      id: "google-bike",
      rank: 5,
      title: bikeRoute?.source.isFallback ? "Cycling planner" : "Live cycling route",
      mode: "bike",
      action: "Weather-dependent fallback",
      detail: bikeRoute?.data?.durationMinutes ? `${bikeRoute.data.durationMinutes} min cycling estimate` : "Cycling route opens in Google Maps.",
      durationMinutes: bikeRoute?.data?.durationMinutes ?? null,
      delayMinutes: 0,
      transfers: 0,
      reliability: bufferMinutes ? 0.45 : 0.62,
      confidence: bikeRoute?.source.confidence ?? 0.35,
      risk: bufferMinutes ? "amber" : "green",
      isLive: Boolean(bikeRoute && !bikeRoute.source.isFallback && bikeRoute.source.freshness === "live"),
      source: bikeRoute?.source.name ?? "Google Maps link",
      url: bikeUrl
    });
  }

  const ranked = rankRouteOptions(options.filter((option) => option.url || option.id === "9292-ov"), input.routePreferences);
  const recommended = ranked[0] ?? null;
  const status = highestRisk([recommended?.risk, ...incidents.map((incident) => incident.severity === "red" ? "red" : undefined)]);
  const sources: CommutePlanSource[] = [
    {
      name: nsStatus.source,
      freshness: nsStatus.status === "unavailable" ? "unavailable" : "recent",
      confidence: nsStatus.status === "clear" ? 0.64 : 0.48,
      isLive: false,
      checkedAt: nsStatus.checkedAt
    },
    sourceFromProvider(nsTrip.source),
    sourceFromProvider(transitRoute.source),
    sourceFromProvider(driveRoute.source),
    ...(bikeRoute ? [sourceFromProvider(bikeRoute.source)] : []),
    {
      name: "9292 planner",
      freshness: "recent",
      confidence: 0.46,
      isLive: false,
      checkedAt: generatedAt,
      error: "9292 Reisadvies API credentials are not configured in NOVA; using the route-aware 9292 planner link."
    }
  ];

  return {
    direction,
    status,
    confidence: clampConfidence(recommended ? (recommended.confidence + recommended.reliability) / 2 : 0.25),
    generatedAt,
    isLive: sources.some((source) => source.isLive),
    routeLabel: `${points.origin ?? "Origin"} to ${points.destination ?? "Destination"}`,
    recommended,
    backups: ranked.slice(1, 4),
    incidents: incidents.slice(0, 10),
    sources
  };
}
