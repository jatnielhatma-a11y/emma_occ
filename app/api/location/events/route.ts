import { NextResponse } from "next/server";
import { z } from "zod";
import {
  eventTypeForMatch,
  findNearestGeofence,
  inferCommutePhase,
  type SavedLocationForGeofence
} from "@/lib/location/geofence";
import { locationPreferencesSchema } from "@/lib/settings/preferences";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const locationEventSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(10000).nullable().optional(),
  direction: z.enum(["outbound", "return"]).default("outbound"),
  source: z.string().max(40).default("browser"),
  capturedAt: z.string().datetime().optional()
});

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const parsed = locationEventSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid location payload." }, { status: 400 });
  }

  const payload = parsed.data;
  const { data: settings } = await supabase
    .from("user_settings")
    .select("location_preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  const locationPreferences = locationPreferencesSchema.parse(settings?.location_preferences ?? {});

  if (!locationPreferences.enabled) {
    return NextResponse.json({ ok: false, error: "Location services are disabled in privacy settings." }, { status: 403 });
  }

  const { data: locations = [] } = await supabase
    .from("saved_locations")
    .select("id,label,kind,latitude,longitude,radius_meters")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .is("deleted_at", null);

  const geofenceLocations: SavedLocationForGeofence[] = (locations ?? []).map((location: any) => ({
    id: location.id,
    label: location.label,
    kind: location.kind,
    latitude: location.latitude === null ? null : Number(location.latitude),
    longitude: location.longitude === null ? null : Number(location.longitude),
    radiusMeters: location.radius_meters
  }));
  const match = findNearestGeofence(
    {
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracyMeters: payload.accuracyMeters
    },
    geofenceLocations
  );
  const phase = inferCommutePhase({ match, direction: payload.direction });
  const capturedAt = payload.capturedAt ?? new Date().toISOString();
  const confidence = match?.confidence ?? 0.2;

  let eventId: string | null = null;
  if (locationPreferences.storeCoarseEvents) {
    const { data: event } = await supabase
      .from("location_events")
      .insert({
        user_id: user.id,
        event_type: eventTypeForMatch(match),
        coarse_location_label: match?.location.label ?? "In transit",
        accuracy_meters: payload.accuracyMeters ? Math.round(payload.accuracyMeters) : null,
        confidence,
        source: payload.source,
        route_phase: phase,
        metadata: {
          direction: payload.direction,
          confirmed: match?.confirmed ?? false,
          distanceMeters: match?.distanceMeters ?? null
        },
        created_at: capturedAt
      })
      .select("id")
      .single();
    eventId = event?.id ?? null;
  }

  const { data: mission } = await supabase
    .from("commute_missions")
    .select("id,status,current_phase,actual_departure_at,actual_arrival_at")
    .eq("user_id", user.id)
    .eq("direction", payload.direction)
    .in("status", ["planned", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const missionUpdate = {
    status: phase === "arrived_destination" ? "completed" : "active",
    current_phase: phase,
    latest_location_label: match?.location.label ?? "In transit",
    latest_confidence: confidence,
    latest_event_at: capturedAt,
    actual_departure_at: mission?.actual_departure_at ?? (phase !== "not_started" ? capturedAt : null),
    actual_arrival_at: phase === "arrived_destination" ? capturedAt : mission?.actual_arrival_at ?? null,
    metadata: {
      lastEventId: eventId,
      lastAccuracyMeters: payload.accuracyMeters ?? null,
      confirmed: match?.confirmed ?? false
    }
  };

  if (mission?.id) {
    await supabase.from("commute_missions").update(missionUpdate).eq("id", mission.id).eq("user_id", user.id);
    if (eventId) {
      await supabase.from("location_events").update({ commute_mission_id: mission.id }).eq("id", eventId).eq("user_id", user.id);
    }
  } else {
    const { data: createdMission } = await supabase
      .from("commute_missions")
      .insert({
        user_id: user.id,
        direction: payload.direction,
        ...missionUpdate
      })
      .select("id")
      .single();
    if (eventId && createdMission?.id) {
      await supabase.from("location_events").update({ commute_mission_id: createdMission.id }).eq("id", eventId).eq("user_id", user.id);
    }
  }

  return NextResponse.json({
    ok: true,
    match: match
      ? {
          label: match.location.label,
          kind: match.location.kind,
          distanceMeters: match.distanceMeters,
          confidence: match.confidence,
          confirmed: match.confirmed
        }
      : null,
    phase,
    storedCoarseEvent: Boolean(eventId)
  });
}
