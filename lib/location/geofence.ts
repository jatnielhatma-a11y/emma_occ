export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
};

export type SavedLocationForGeofence = {
  id: string;
  label: string;
  kind: "home" | "work" | "station" | "custom";
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
};

export type GeofenceMatch = {
  location: SavedLocationForGeofence;
  distanceMeters: number;
  confidence: number;
  confirmed: boolean;
};

export type CommutePhase =
  | "not_started"
  | "left_origin"
  | "at_origin_station"
  | "on_train"
  | "at_destination_station"
  | "arrived_destination"
  | "unknown";

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceMeters(a: Coordinates, b: Coordinates) {
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const hav =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

export function confidenceForDistance({
  distance,
  radius,
  accuracy
}: {
  distance: number;
  radius: number;
  accuracy?: number | null;
}) {
  const accuracyPenalty = Math.min(Math.max((accuracy ?? 75) / Math.max(radius, 1), 0), 2);
  const distanceScore = Math.max(0, 1 - distance / Math.max(radius, 1));
  const accuracyScore = Math.max(0, 1 - accuracyPenalty / 2);
  return Math.round((distanceScore * 0.7 + accuracyScore * 0.3) * 1000) / 1000;
}

export function findNearestGeofence(position: Coordinates, locations: SavedLocationForGeofence[]): GeofenceMatch | null {
  const candidates = locations
    .filter((location) => typeof location.latitude === "number" && typeof location.longitude === "number")
    .map((location) => {
      const distance = distanceMeters(position, {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude)
      });
      const confidence = confidenceForDistance({
        distance,
        radius: location.radiusMeters,
        accuracy: position.accuracyMeters
      });
      const confirmed = distance <= location.radiusMeters && (position.accuracyMeters ?? 9999) <= location.radiusMeters * 1.5;
      return {
        location,
        distanceMeters: Math.round(distance),
        confidence,
        confirmed
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  return candidates[0] ?? null;
}

export function inferCommutePhase({
  match,
  direction
}: {
  match: GeofenceMatch | null;
  direction: "outbound" | "return";
}): CommutePhase {
  if (!match) return "unknown";
  const kind = match.location.kind;
  const label = match.location.label.toLowerCase();

  if (direction === "outbound") {
    if (kind === "home") return "not_started";
    if (label.includes("almere")) return "at_origin_station";
    if (label.includes("utrecht")) return "at_destination_station";
    if (kind === "work") return "arrived_destination";
  }

  if (direction === "return") {
    if (kind === "work") return "not_started";
    if (label.includes("utrecht")) return "at_origin_station";
    if (label.includes("almere")) return "at_destination_station";
    if (kind === "home") return "arrived_destination";
  }

  return match.confirmed ? "left_origin" : "unknown";
}

export function eventTypeForMatch(match: GeofenceMatch | null): "enter" | "inferred_enter" {
  return match?.confirmed ? "enter" : "inferred_enter";
}
