export const NS_STATUS_URL = "https://www.ns.nl/reisinformatie/actuele-situatie-op-het-spoor";
export const NS_PLANNER_URL = "https://www.ns.nl/reisplanner/";
export const OV_9292_URL = "https://9292.nl/";
export const GOOGLE_MAPS_DIRECTIONS_URL = "https://www.google.com/maps/dir/";

export type NsCommuteAlert = {
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
};

export type CommuteOption = {
  id: "ns-train" | "9292-ov" | "google-transit" | "google-car" | "google-bike";
  rank: number;
  title: string;
  mode: "train" | "multimodal" | "transit" | "car" | "bike";
  recommendation: string;
  detail: string;
  toWorkUrl: string | null;
  toHomeUrl: string | null;
};

export type NsCommuteStatus = {
  source: string;
  status: "clear" | "attention" | "unavailable" | "needs-route";
  title: string;
  checkedAt: string;
  url: string;
  homeStation: string | null;
  workStation: string | null;
  homeAddress: string | null;
  workAddress: string | null;
  toWorkUrl: string | null;
  toHomeUrl: string | null;
  alerts: NsCommuteAlert[];
  options: CommuteOption[];
};

const DISRUPTION_TERMS = ["storing", "storingen", "werkzaamheden", "vertraging", "vertraagd", "uitval", "rijden niet", "minder treinen"];
const PLATFORM_TERMS = ["spoorwijziging", "perronwijziging", "ander spoor", "gewijzigd spoor", "platform change"];

function compactText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromHtml(html: string) {
  return html.match(/<title>(.*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || "Actuele situatie op het spoor | NS";
}

function containsNear(text: string, station: string, terms: string[]) {
  const lowerText = text.toLowerCase();
  const lowerStation = station.toLowerCase();
  const index = lowerText.indexOf(lowerStation);
  if (index < 0) return false;
  const window = lowerText.slice(Math.max(0, index - 300), index + lowerStation.length + 300);
  return terms.some((term) => window.includes(term));
}

export function buildNsPlannerUrl(fromStation?: string | null, toStation?: string | null) {
  const from = fromStation?.trim();
  const to = toStation?.trim();
  if (!from || !to) return null;

  const params = new URLSearchParams({
    vertrek: from,
    aankomst: to,
    type: "vertrek"
  });

  return `${NS_PLANNER_URL}#/?${params.toString()}`;
}

export function buildGoogleMapsUrl(
  fromStation?: string | null,
  toStation?: string | null,
  travelmode: "transit" | "driving" | "bicycling" = "transit"
) {
  const origin = fromStation?.trim();
  const destination = toStation?.trim();
  if (!origin || !destination) return null;

  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode
  });

  return `${GOOGLE_MAPS_DIRECTIONS_URL}?${params.toString()}`;
}

export function build9292PlannerUrl(fromAddress?: string | null, toAddress?: string | null) {
  const from = fromAddress?.trim();
  const to = toAddress?.trim();
  const params = new URLSearchParams();

  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("time", "now");

  return `${OV_9292_URL}en/planner?${params.toString()}`;
}

export function buildCommuteOptions({
  homeStation,
  workStation,
  homeAddress,
  workAddress,
  status,
  toWorkUrl,
  toHomeUrl
}: {
  homeStation?: string | null;
  workStation?: string | null;
  homeAddress?: string | null;
  workAddress?: string | null;
  status: NsCommuteStatus["status"];
  toWorkUrl?: string | null;
  toHomeUrl?: string | null;
}): CommuteOption[] {
  const home = homeStation?.trim() || null;
  const work = workStation?.trim() || null;
  const doorOrigin = homeAddress?.trim() || home;
  const doorDestination = workAddress?.trim() || work;
  const hasRoute = Boolean(home && work);
  const nsIsBest = status === "clear";
  const nsNeedsBackup = status === "attention" || status === "unavailable";

  const options: CommuteOption[] = [
    {
      id: "ns-train",
      rank: nsIsBest ? 1 : nsNeedsBackup ? 3 : 2,
      title: "NS train planner",
      mode: "train",
      recommendation: nsIsBest ? "Best first check" : nsNeedsBackup ? "Use with caution" : "Complete route settings",
      detail: nsIsBest
        ? "Rail route looks clear in the latest NS public status snapshot."
        : nsNeedsBackup
          ? "NS has attention or is unavailable, so compare alternatives before leaving."
          : "Add home and work stations to turn this into a route-specific rail check.",
      toWorkUrl: toWorkUrl ?? buildNsPlannerUrl(home, work),
      toHomeUrl: toHomeUrl ?? buildNsPlannerUrl(work, home)
    },
    {
      id: "9292-ov",
      rank: nsNeedsBackup ? 1 : 2,
      title: "9292 public transport",
      mode: "multimodal",
      recommendation: nsNeedsBackup ? "Best backup check" : "Compare OV options",
      detail: doorOrigin && doorDestination
        ? `Use 9292 for door-to-door public transport from ${doorOrigin} to ${doorDestination}.`
        : "Use 9292 for Dutch door-to-door public transport options across train, bus, tram, metro, and walking legs.",
      toWorkUrl: build9292PlannerUrl(doorOrigin, doorDestination),
      toHomeUrl: build9292PlannerUrl(doorDestination, doorOrigin)
    },
    {
      id: "google-transit",
      rank: nsNeedsBackup ? 2 : 3,
      title: "Google transit comparison",
      mode: "transit",
      recommendation: "Cross-check route time",
      detail: "Opens a transit directions comparison for the same commute direction.",
      toWorkUrl: buildGoogleMapsUrl(doorOrigin, doorDestination, "transit"),
      toHomeUrl: buildGoogleMapsUrl(doorDestination, doorOrigin, "transit")
    },
    {
      id: "google-car",
      rank: nsNeedsBackup ? 4 : 4,
      title: "Driving option",
      mode: "car",
      recommendation: "Fallback route",
      detail: "Use this when public transport needs a practical comparison against road travel.",
      toWorkUrl: buildGoogleMapsUrl(doorOrigin, doorDestination, "driving"),
      toHomeUrl: buildGoogleMapsUrl(doorDestination, doorOrigin, "driving")
    },
    {
      id: "google-bike",
      rank: hasRoute ? 5 : 4,
      title: "Cycling option",
      mode: "bike",
      recommendation: "Local backup",
      detail: "Useful for short or station-to-station fallback checks when weather and duty timing allow it.",
      toWorkUrl: buildGoogleMapsUrl(doorOrigin, doorDestination, "bicycling"),
      toHomeUrl: buildGoogleMapsUrl(doorDestination, doorOrigin, "bicycling")
    }
  ];

  return options
    .filter((option) => option.toWorkUrl || option.toHomeUrl || option.id === "9292-ov")
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
    .map((option, index) => ({ ...option, rank: index + 1 }));
}

export function analyzeNsCommuteHtml({
  html,
  homeStation,
  workStation,
  homeAddress,
  workAddress,
  checkedAt = new Date().toISOString()
}: {
  html: string;
  homeStation?: string | null;
  workStation?: string | null;
  homeAddress?: string | null;
  workAddress?: string | null;
  checkedAt?: string;
}): NsCommuteStatus {
  const title = titleFromHtml(html);
  const text = compactText(html);
  const home = homeStation?.trim() || null;
  const work = workStation?.trim() || null;
  const originAddress = homeAddress?.trim() || null;
  const destinationAddress = workAddress?.trim() || null;
  const toWorkUrl = buildNsPlannerUrl(home, work);
  const toHomeUrl = buildNsPlannerUrl(work, home);
  const alerts: NsCommuteAlert[] = [];

  if (!home || !work) {
    alerts.push({
      severity: "info",
      title: "Route stations needed",
      detail: "Add home and work stations in commute settings for route-specific NS alerts."
    });
  }

  for (const station of [home, work].filter(Boolean) as string[]) {
    if (containsNear(text, station, PLATFORM_TERMS)) {
      alerts.push({
        severity: "warning",
        title: `Platform change near ${station}`,
        detail: "NS public status text mentions platform or track changes near this commute station."
      });
    }

    if (containsNear(text, station, DISRUPTION_TERMS)) {
      alerts.push({
        severity: "warning",
        title: `NS disruption near ${station}`,
        detail: "NS public status text mentions disruptions or works near this commute station."
      });
    }
  }

  const status: NsCommuteStatus["status"] = !home || !work ? "needs-route" : alerts.length ? "attention" : "clear";

  return {
    source: "NS.nl",
    status,
    title,
    checkedAt,
    url: NS_STATUS_URL,
    homeStation: home,
    workStation: work,
    homeAddress: originAddress,
    workAddress: destinationAddress,
    toWorkUrl,
    toHomeUrl,
    alerts,
    options: buildCommuteOptions({
      homeStation: home,
      workStation: work,
      homeAddress: originAddress,
      workAddress: destinationAddress,
      status,
      toWorkUrl,
      toHomeUrl
    })
  };
}

export async function fetchNsCommuteStatus({
  homeStation,
  workStation,
  homeAddress,
  workAddress
}: {
  homeStation?: string | null;
  workStation?: string | null;
  homeAddress?: string | null;
  workAddress?: string | null;
} = {}): Promise<NsCommuteStatus> {
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(NS_STATUS_URL, {
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      const status: NsCommuteStatus["status"] = "unavailable";
      const home = homeStation?.trim() || null;
      const work = workStation?.trim() || null;
      const originAddress = homeAddress?.trim() || null;
      const destinationAddress = workAddress?.trim() || null;
      const toWorkUrl = buildNsPlannerUrl(home, work);
      const toHomeUrl = buildNsPlannerUrl(work, home);

      return {
        source: "NS.nl",
        status,
        title: "NS status page unavailable",
        checkedAt,
        url: NS_STATUS_URL,
        homeStation: home,
        workStation: work,
        homeAddress: originAddress,
        workAddress: destinationAddress,
        toWorkUrl,
        toHomeUrl,
        alerts: [
          {
            severity: "critical",
            title: "NS status unavailable",
            detail: "Emma could not check the NS disruption page. Check the NS planner before commuting."
          }
        ],
        options: buildCommuteOptions({
          homeStation: home,
          workStation: work,
          homeAddress: originAddress,
          workAddress: destinationAddress,
          status,
          toWorkUrl,
          toHomeUrl
        })
      };
    }

    return analyzeNsCommuteHtml({
      html: await response.text(),
      homeStation,
      workStation,
      homeAddress,
      workAddress,
      checkedAt
    });
  } catch {
    const status: NsCommuteStatus["status"] = "unavailable";
    const home = homeStation?.trim() || null;
    const work = workStation?.trim() || null;
    const originAddress = homeAddress?.trim() || null;
    const destinationAddress = workAddress?.trim() || null;
    const toWorkUrl = buildNsPlannerUrl(home, work);
    const toHomeUrl = buildNsPlannerUrl(work, home);

    return {
      source: "NS.nl",
      status,
      title: "NS status page unavailable",
      checkedAt,
      url: NS_STATUS_URL,
      homeStation: home,
      workStation: work,
      homeAddress: originAddress,
      workAddress: destinationAddress,
      toWorkUrl,
      toHomeUrl,
      alerts: [
        {
          severity: "critical",
          title: "NS status unavailable",
          detail: "Emma could not check the NS disruption page. Check the NS planner before commuting."
        }
      ],
      options: buildCommuteOptions({
        homeStation: home,
        workStation: work,
        homeAddress: originAddress,
        workAddress: destinationAddress,
        status,
        toWorkUrl,
        toHomeUrl
      })
    };
  }
}
