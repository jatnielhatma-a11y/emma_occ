import { distanceMeters, type Coordinates } from "./geofence";

export const GPS_LIVE_INTERVAL_MS = 60_000;
export const GPS_MIN_DISTANCE_METERS = 75;

export type LiveTrackingDecisionInput = {
  nextPosition: Coordinates;
  lastSubmittedPosition?: Coordinates | null;
  lastSubmittedAt?: number | null;
  now?: number;
  intervalMs?: number;
  minDistanceMeters?: number;
};

export function shouldSubmitLocationUpdate({
  nextPosition,
  lastSubmittedPosition,
  lastSubmittedAt,
  now = Date.now(),
  intervalMs = GPS_LIVE_INTERVAL_MS,
  minDistanceMeters = GPS_MIN_DISTANCE_METERS
}: LiveTrackingDecisionInput) {
  if (!lastSubmittedPosition || !lastSubmittedAt) return true;
  if (now - lastSubmittedAt >= intervalMs) return true;

  const movedMeters = distanceMeters(nextPosition, lastSubmittedPosition);
  return movedMeters >= minDistanceMeters;
}
