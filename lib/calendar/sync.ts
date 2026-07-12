import {
  buildCalendarSyncPlan,
  getGoogleAccessToken,
  getGoogleRefreshToken,
  refreshGoogleAccessToken,
  serializeGoogleTokenUpdate,
  writeGoogleEvent,
  type GoogleCalendarConnection,
  type SyncableDuty
} from "@/lib/calendar/google";
import { buildNsPlannerUrl } from "@/lib/ns-commute";

const NS_STATUS_URL = "https://www.ns.nl/reisinformatie/actuele-situatie-op-het-spoor";

type SupabaseLike = {
  from: (table: string) => any;
};

type SyncResult = {
  ok: boolean;
  importId?: string;
  plan?: ReturnType<typeof buildCalendarSyncPlan>;
  results?: Array<{ ok: boolean; idempotencyKey: string; eventId?: string }>;
  error?: string;
  skipped?: boolean;
};

function normalizeDuty(row: any): SyncableDuty {
  return {
    id: row.id,
    importId: row.import_id,
    date: row.duty_date,
    startTime: row.start_time?.slice(0, 5) ?? "",
    endTime: row.end_time?.slice(0, 5) ?? "",
    originalDutyCode: row.original_duty_code ?? "",
    dutyLabel: row.duty_label,
    location: row.location ?? "",
    notes: row.notes ?? "",
    sourceFile: row.source_file ?? "",
    sourceRow: row.source_row,
    isOff: row.is_off,
    isOvernight: row.is_overnight,
    calendarEventId: row.calendar_event_id,
    commuteToEventId: row.commute_to_event_id,
    commuteHomeEventId: row.commute_home_event_id
  };
}

export async function latestImportId(supabase: SupabaseLike, userId: string) {
  const { data } = await supabase
    .from("imports")
    .select("id")
    .eq("user_id", userId)
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function syncGoogleCalendarForUser({
  supabase,
  userId,
  importId
}: {
  supabase: SupabaseLike;
  userId: string;
  importId?: string | null;
}): Promise<SyncResult> {
  const activeImportId = importId ?? (await latestImportId(supabase, userId));
  if (!activeImportId) {
    return { ok: false, error: "No imported roster found.", skipped: true };
  }

  const { data: connection } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("calendar_id", "primary")
    .maybeSingle();

  const storedAccessToken = connection ? getGoogleAccessToken(connection as GoogleCalendarConnection) : null;
  if (!storedAccessToken) {
    return { ok: false, error: "Connect Google Calendar first.", skipped: true };
  }

  const { data: duties = [] } = await supabase
    .from("duties")
    .select("*")
    .eq("user_id", userId)
    .eq("import_id", activeImportId)
    .order("duty_date", { ascending: true });

  const { data: commute } = await supabase
    .from("commute_settings")
    .select("enabled,before_minutes,after_minutes,travel_mode,home_station,work_station")
    .eq("user_id", userId)
    .maybeSingle();

  const plan = buildCalendarSyncPlan(
    activeImportId,
    (duties ?? []).map(normalizeDuty),
    {
      enabled: commute?.enabled ?? true,
      beforeMinutes: commute?.before_minutes ?? 45,
      afterMinutes: commute?.after_minutes ?? 45,
      travelMode: commute?.travel_mode === "ns" ? "ns" : "manual",
      referenceUrl: commute?.travel_mode === "ns" ? NS_STATUS_URL : undefined,
      toWorkUrl: commute?.travel_mode === "ns" ? buildNsPlannerUrl(commute?.home_station, commute?.work_station) : null,
      toHomeUrl: commute?.travel_mode === "ns" ? buildNsPlannerUrl(commute?.work_station, commute?.home_station) : null
    }
  );

  let activeToken = storedAccessToken;
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  if (expiresAt && expiresAt < Date.now() + 5 * 60_000) {
    const refreshed = await refreshGoogleAccessToken(connection as GoogleCalendarConnection);
    if (refreshed?.access_token) {
      activeToken = refreshed.access_token;
      const existingRefreshToken = getGoogleRefreshToken(connection as GoogleCalendarConnection);
      await supabase
        .from("google_calendar_connections")
        .update({
          ...serializeGoogleTokenUpdate(refreshed, existingRefreshToken),
          expires_at: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null
        })
        .eq("id", connection.id);
    }
  }

  const results = [];
  for (const item of plan.items) {
    try {
      const event = await writeGoogleEvent({
        accessToken: activeToken,
        calendarId: connection.calendar_id ?? "primary",
        eventId: item.storedEventId,
        draft: item.draft
      });

      await supabase.from("calendar_sync_logs").insert({
        user_id: userId,
        import_id: activeImportId,
        duty_id: item.dutyId,
        status: "synced",
        event_id: event.id,
        idempotency_key: item.draft.idempotencyKey,
        action: item.storedEventId ? "update" : "create",
        request_payload: item.draft,
        response_payload: { id: event.id, htmlLink: event.htmlLink },
        synced_at: new Date().toISOString()
      });

      const update =
        item.kind === "commute-to"
          ? { commute_to_event_id: event.id }
          : item.kind === "commute-home"
            ? { commute_home_event_id: event.id }
            : { calendar_event_id: event.id };

      await supabase.from("duties").update(update).eq("id", item.dutyId).eq("user_id", userId);
      results.push({ ok: true, idempotencyKey: item.draft.idempotencyKey, eventId: event.id });
    } catch (error) {
      await supabase.from("calendar_sync_logs").insert({
        user_id: userId,
        import_id: activeImportId,
        duty_id: item.dutyId,
        status: "failed",
        idempotency_key: item.draft.idempotencyKey,
        action: item.storedEventId ? "update" : "create",
        request_payload: item.draft,
        error_message: error instanceof Error ? error.message : "Calendar sync failed."
      });
      results.push({ ok: false, idempotencyKey: item.draft.idempotencyKey });
    }
  }

  const successfulWrites = results.filter((result) => result.ok).length;
  const nextImportStatus = successfulWrites === plan.items.length ? "synced" : "failed";

  await supabase.from("google_calendar_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", connection.id);
  await supabase.from("imports").update({ status: nextImportStatus }).eq("id", activeImportId).eq("user_id", userId);

  return { ok: true, importId: activeImportId, plan, results };
}
