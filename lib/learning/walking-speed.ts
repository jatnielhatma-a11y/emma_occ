export type WalkingSpeedSampleInput = {
  distanceMeters: number;
  durationSeconds: number;
  source?: "gps" | "manual" | "route_inference";
};

export function calculateWalkingSpeedKmh(input: WalkingSpeedSampleInput) {
  if (input.distanceMeters <= 0 || input.durationSeconds <= 0) return 0;
  return Number(((input.distanceMeters / input.durationSeconds) * 3.6).toFixed(2));
}

export function walkingSampleConfidence(input: WalkingSpeedSampleInput) {
  const speed = calculateWalkingSpeedKmh(input);
  if (speed < 1 || speed > 8) return 0.1;
  let confidence = input.source === "gps" ? 0.8 : input.source === "route_inference" ? 0.55 : 0.45;
  if (input.distanceMeters < 150) confidence -= 0.2;
  if (input.durationSeconds < 90) confidence -= 0.2;
  return Math.max(0.1, Math.min(0.95, Number(confidence.toFixed(3))));
}

export function blendWalkingSpeedPreference(currentKmh: number, sampleKmh: number, confidence: number) {
  const boundedCurrent = Math.max(1, Math.min(8, currentKmh || 4.8));
  const boundedSample = Math.max(1, Math.min(8, sampleKmh || boundedCurrent));
  const weight = Math.max(0.05, Math.min(0.3, confidence * 0.25));
  return Number((boundedCurrent * (1 - weight) + boundedSample * weight).toFixed(2));
}

export function routePreferenceDeltaForFeedback(feedbackType: string) {
  if (feedbackType === "too_much_walking") return { minimizeWalking: true };
  if (feedbackType === "too_many_transfers") return { minimizeTransfers: true, preferDirectTrains: true };
  if (feedbackType === "unsafe") return { avoidPoorlyLitRoutesAtNight: true };
  if (feedbackType === "accepted") return { preferFamiliarRoutes: true };
  return {};
}
