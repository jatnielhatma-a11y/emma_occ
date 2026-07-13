"use client";

import { LocateFixed, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { GPS_LIVE_INTERVAL_MS, shouldSubmitLocationUpdate } from "@/lib/location/live-tracking";

type PermissionStatus = "unknown" | "granted" | "denied" | "prompt";

type SavedLocation = {
  id: string;
  label: string;
  kind: "home" | "work" | "station" | "custom";
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  provider_source: string;
};

type PositionState = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
};

type LocationEventResult = {
  match: {
    label: string;
    kind: string;
    distanceMeters: number;
    confidence: number;
    confirmed: boolean;
  } | null;
  phase: string;
  storedCoarseEvent: boolean;
};

type MissionSnapshot = {
  id?: string;
  status?: string | null;
  current_phase?: string | null;
  latest_location_label?: string | null;
  latest_confidence?: number | null;
  latest_event_at?: string | null;
};

type LocationEventSummary = {
  id: string;
  event_type: string;
  coarse_location_label: string | null;
  confidence: number | null;
  accuracy_meters: number | null;
  route_phase: string | null;
  created_at: string;
};

function phaseLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "not started";
}

function formatTime(value?: string | null) {
  if (!value) return "not updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "time unknown";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function LocationPermissionPanel() {
  const { t } = useI18n();
  const [status, setStatus] = useState<PermissionStatus>("unknown");
  const [position, setPosition] = useState<PositionState | null>(null);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [eventResult, setEventResult] = useState<LocationEventResult | null>(null);
  const [message, setMessage] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [direction, setDirection] = useState<"outbound" | "return">("outbound");
  const [liveTracking, setLiveTracking] = useState(false);
  const [mission, setMission] = useState<MissionSnapshot | null>(null);
  const [events, setEvents] = useState<LocationEventSummary[]>([]);
  const watchId = useRef<number | null>(null);
  const lastSubmittedAt = useRef<number | null>(null);
  const lastSubmittedPosition = useRef<PositionState | null>(null);

  const geocodedCount = useMemo(
    () => locations.filter((location) => typeof location.latitude === "number" && typeof location.longitude === "number").length,
    [locations]
  );

  const refreshMission = useCallback(async () => {
    const response = await fetch("/api/location/mission");
    const payload = await response.json();
    if (payload.ok) {
      setMission(payload.mission ?? null);
      setEvents(payload.events ?? []);
    }
  }, []);

  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((permission) => {
          setStatus(permission.state as PermissionStatus);
          permission.onchange = () => setStatus(permission.state as PermissionStatus);
        })
        .catch(() => setStatus("unknown"));
    }

    refreshLocations();
    void refreshMission();
  }, [refreshMission]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshMission();
      }
    }, 20_000);

    return () => window.clearInterval(interval);
  }, [refreshMission]);

  async function refreshLocations() {
    const response = await fetch("/api/location/geofences");
    const payload = await response.json();
    if (payload.ok) {
      setLocations(payload.locations ?? []);
      setLocationEnabled(Boolean(payload.locationEnabled));
    }
  }

  async function setServerLocationEnabled(enabled: boolean) {
    setMessage(enabled ? "Enabling location services..." : "Disabling location services...");
    const response = await fetch("/api/location/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled })
    });
    const payload = await response.json();
    if (payload.ok) {
      setLocationEnabled(enabled);
      if (!enabled) stopLiveTracking();
      setMessage(enabled ? "Location services enabled." : "Location services disabled.");
    } else {
      setMessage(payload.error);
    }
  }

  async function submitLocationEvent(next: PositionState, source = "browser") {
    if (!locationEnabled) {
      setMessage("Enable NOVA location before storing live commute progress.");
      return;
    }

    const response = await fetch("/api/location/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: next.latitude,
        longitude: next.longitude,
        accuracyMeters: next.accuracyMeters,
        capturedAt: next.capturedAt,
        direction,
        source
      })
    });
    const payload = await response.json();
    if (payload.ok) {
      setEventResult(payload);
      lastSubmittedAt.current = Date.now();
      lastSubmittedPosition.current = next;
      await refreshMission();
      setMessage(payload.storedCoarseEvent ? "Live coarse location event stored." : "Live location classified without storing an event.");
    } else {
      setMessage(payload.error);
    }
  }

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("denied");
      setMessage("This browser does not expose GPS location.");
      return;
    }

    setMessage("Requesting GPS permission...");
    navigator.geolocation.getCurrentPosition(
      (nextPosition) => {
        const next = {
          latitude: nextPosition.coords.latitude,
          longitude: nextPosition.coords.longitude,
          accuracyMeters: Math.round(nextPosition.coords.accuracy),
          capturedAt: new Date().toISOString()
        };
        setStatus("granted");
        setPosition(next);
        setMessage("GPS point received. NOVA has not stored raw coordinates.");
      },
      () => {
        setStatus("denied");
        setMessage("GPS permission denied or unavailable.");
      },
      { enableHighAccuracy: locationEnabled, timeout: 10_000, maximumAge: 30_000 }
    );
  }

  async function classifyLocation() {
    if (!position) {
      setMessage("Request GPS first.");
      return;
    }

    await submitLocationEvent(position, "manual");
  }

  function stopLiveTracking(updateState = true) {
    if (watchId.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    if (updateState) setLiveTracking(false);
  }

  function startLiveTracking() {
    if (!("geolocation" in navigator)) {
      setStatus("denied");
      setMessage("This browser does not expose GPS location.");
      return;
    }

    if (!locationEnabled) {
      setMessage("Enable NOVA location before starting live GPS.");
      return;
    }

    stopLiveTracking();
    setMessage("Starting live GPS updates...");
    const id = navigator.geolocation.watchPosition(
      (nextPosition) => {
        const next = {
          latitude: nextPosition.coords.latitude,
          longitude: nextPosition.coords.longitude,
          accuracyMeters: Math.round(nextPosition.coords.accuracy),
          capturedAt: new Date().toISOString()
        };
        setStatus("granted");
        setPosition(next);
        setLiveTracking(true);

        if (
          shouldSubmitLocationUpdate({
            nextPosition: next,
            lastSubmittedPosition: lastSubmittedPosition.current,
            lastSubmittedAt: lastSubmittedAt.current
          })
        ) {
          void submitLocationEvent(next, "live-watch");
        } else {
          setMessage(`Live GPS active. Next routine update in about ${Math.round(GPS_LIVE_INTERVAL_MS / 60_000)} min.`);
        }
      },
      () => {
        setStatus("denied");
        setLiveTracking(false);
        setMessage("Live GPS permission denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 15_000 }
    );
    watchId.current = id;
    setLiveTracking(true);
  }

  async function bindCurrentPosition(location: SavedLocation) {
    if (!position) {
      setMessage("Request GPS first.");
      return;
    }

    setMessage(`Saving GPS point for ${location.label}...`);
    const response = await fetch("/api/location/geofences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: location.id,
        label: location.label,
        kind: location.kind,
        address: location.address ?? "",
        latitude: position.latitude,
        longitude: position.longitude,
        radiusMeters: location.radius_meters
      })
    });
    const payload = await response.json();
    if (payload.ok) {
      await refreshLocations();
      setMessage(`${location.label} geofence updated.`);
    } else {
      setMessage(payload.error);
    }
  }

  async function deleteLocationData() {
    setMessage("Deleting stored location data...");
    const response = await fetch("/api/privacy/location-data", { method: "DELETE" });
    const payload = await response.json();
    if (payload.ok) {
      setPosition(null);
      setEventResult(null);
      setLocationEnabled(false);
      stopLiveTracking();
      await refreshLocations();
      await refreshMission();
      setMessage(payload.message);
    } else {
      setMessage(payload.error);
    }
  }

  useEffect(() => {
    return () => stopLiveTracking(false);
  }, []);

  const tone = status === "granted" && locationEnabled ? "green" : status === "denied" ? "red" : "amber";

  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">GPS</p>
          <h2 className="mt-2 text-lg font-semibold text-white">{t("location.title")}</h2>
          <p className="mt-2 text-sm text-zinc-500">{t("location.helper")}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
          <LocateFixed size={20} />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusBadge tone={tone}>{locationEnabled ? "NOVA GPS enabled" : t(`location.${status}`)}</StatusBadge>
        <StatusBadge tone={liveTracking ? "green" : "neutral"}>{liveTracking ? "live GPS active" : "live GPS paused"}</StatusBadge>
        <StatusBadge tone={geocodedCount ? "green" : "amber"}>{geocodedCount}/{locations.length} geofences ready</StatusBadge>
        {position ? <span className="text-sm text-zinc-500">Accuracy about {position.accuracyMeters} m</span> : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setServerLocationEnabled(!locationEnabled)} className="focus-ring rounded-md border border-occ-line bg-occ-panel2 px-3 py-2 text-sm font-semibold text-white">
          {locationEnabled ? "Disable NOVA location" : "Enable NOVA location"}
        </button>
        <button type="button" onClick={requestLocation} className="focus-ring rounded-md bg-occ-cyan px-3 py-2 text-sm font-semibold text-occ-ink">
          Request GPS point
        </button>
        <button
          type="button"
          onClick={liveTracking ? () => stopLiveTracking() : startLiveTracking}
          className="focus-ring rounded-md border border-occ-cyan/40 bg-occ-cyan/10 px-3 py-2 text-sm font-semibold text-cyan-100"
        >
          {liveTracking ? "Stop live GPS" : "Start live GPS"}
        </button>
        <button type="button" onClick={deleteLocationData} className="focus-ring rounded-md border border-occ-red/40 bg-occ-red/10 px-3 py-2 text-sm font-semibold text-red-100 sm:col-span-2">
          Delete stored location data
        </button>
      </div>

      <div className="mt-4 rounded-md border border-occ-line bg-occ-ink p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Navigation size={16} className="text-occ-cyan" />
            Commute direction
          </div>
          <select
            value={direction}
            onChange={(event) => setDirection(event.target.value as "outbound" | "return")}
            className="focus-ring rounded-md border border-occ-line bg-occ-panel px-3 py-2 text-sm text-white"
          >
            <option value="outbound">Home to work</option>
            <option value="return">Work to home</option>
          </select>
        </div>
        <button
          type="button"
          onClick={classifyLocation}
          disabled={!position}
          className="focus-ring mt-3 inline-flex items-center gap-2 rounded-md bg-occ-cyan px-3 py-2 text-sm font-semibold text-occ-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck size={16} />
          Classify location
        </button>
      </div>

      {eventResult ? (
        <div className="mt-4 rounded-md border border-occ-cyan/30 bg-occ-cyan/10 p-3 text-sm text-cyan-100">
          <strong className="block text-white">{eventResult.match?.label ?? "In transit"}</strong>
          <span>
            Phase: {eventResult.phase.replaceAll("_", " ")} · Confidence: {Math.round((eventResult.match?.confidence ?? 0.2) * 100)}%
          </span>
        </div>
      ) : null}

      <div className="mt-4 rounded-md border border-occ-line bg-occ-ink p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">Live mission state</p>
            <p className="mt-1 text-xs text-zinc-500">
              {mission?.latest_location_label ?? "No live GPS event yet"} · {phaseLabel(mission?.current_phase)} · updated{" "}
              {formatTime(mission?.latest_event_at)}
            </p>
          </div>
          <StatusBadge tone={mission?.status === "active" ? "green" : mission?.status === "completed" ? "cyan" : "neutral"}>
            {mission?.status ?? "waiting"}
          </StatusBadge>
        </div>
        {events.length ? (
          <div className="mt-3 divide-y divide-occ-line">
            {events.slice(0, 3).map((event) => (
              <p key={event.id} className="py-2 text-xs text-zinc-500">
                <span className="font-medium text-zinc-300">{event.coarse_location_label ?? "In transit"}</span> · {phaseLabel(event.route_phase)} ·{" "}
                {Math.round(Number(event.confidence ?? 0) * 100)}% · {formatTime(event.created_at)}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {locations.slice(0, 4).map((location) => (
          <div key={location.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-occ-line bg-occ-ink p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <MapPin size={15} className="text-occ-cyan" />
                {location.label}
              </div>
              <p className="mt-1 truncate text-xs text-zinc-500">
                {location.latitude !== null && location.longitude !== null ? `${location.radius_meters} m radius ready` : "No GPS point saved yet"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => bindCurrentPosition(location)}
              disabled={!position}
              className="focus-ring rounded-md border border-occ-line bg-occ-panel2 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Use current point
            </button>
          </div>
        ))}
      </div>

      {message ? <p className="mt-4 text-sm text-zinc-400">{message}</p> : null}
    </section>
  );
}
