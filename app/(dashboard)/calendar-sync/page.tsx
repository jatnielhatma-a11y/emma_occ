import { CalendarSyncClient } from "@/components/calendar/CalendarSyncClient";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { GoogleConnectionPanel } from "@/components/google/GoogleConnectionPanel";
import { googleServicesFromScope, hasGoogleOAuthConfig } from "@/lib/google/oauth";
import { hasGoogleTokenEncryptionKey } from "@/lib/google/token-crypto";
import { buildCalendarSyncPlan } from "@/lib/calendar/google";
import { buildNsPlannerUrl } from "@/lib/ns-commute";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NS_STATUS_URL = "https://www.ns.nl/reisinformatie/actuele-situatie-op-het-spoor";

function colorClass(colorKey: string) {
  const map: Record<string, string> = {
    night: "bg-occ-violet",
    late: "bg-occ-amber",
    off: "bg-occ-green",
    custom: "bg-occ-cyan",
    commute: "bg-zinc-400"
  };
  return map[colorKey] ?? "bg-occ-cyan";
}

function eventTimeLabel(item: NonNullable<ReturnType<typeof buildCalendarSyncPlan>>["items"][number]) {
  if (item.draft.allDayDate) return item.draft.allDayDate;
  if (!item.draft.start || !item.draft.end) return "Time pending";
  return `${item.draft.start.slice(0, 16).replace("T", " ")} - ${item.draft.end.slice(11, 16)}`;
}

function normalizeDuty(row: any) {
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

type CalendarSyncPageProps = {
  searchParams?: {
    google?: string;
  };
};

function googleStatusMessage(status?: string) {
  if (status === "connected") {
    return {
      tone: "green" as const,
      title: "Google Calendar connected",
      detail: "Emma can now sync duties and commute blocks to your primary calendar."
    };
  }

  if (status === "invalid_state") {
    return {
      tone: "amber" as const,
      title: "Google connection expired",
      detail: "Start the reconnect flow again from this page."
    };
  }

  if (status === "config_error") {
    return {
      tone: "amber" as const,
      title: "Google OAuth settings need attention",
      detail: "The app is missing one of the required Google OAuth settings on Vercel."
    };
  }

  if (status === "token_error") {
    return {
      tone: "amber" as const,
      title: "Google did not complete the reconnect",
      detail: "Check that Google Cloud allows the production callback URL from Vercel, then try again."
    };
  }

  if (status === "access_denied") {
    return {
      tone: "amber" as const,
      title: "Google access was not granted",
      detail: "No changes were made. Start the connection again when you are ready."
    };
  }

  return null;
}

export default async function CalendarSyncPage({ searchParams }: CalendarSyncPageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: connection } = await supabase
    .from("google_calendar_connections")
    .select("connected_at,last_sync_at,scope,granted_scopes,connected_services,disconnected_at,last_error")
    .eq("user_id", user?.id)
    .eq("calendar_id", process.env.GOOGLE_CALENDAR_ID || "primary")
    .maybeSingle();

  const { data: latestImport } = await supabase
    .from("imports")
    .select("id,filename,status,date_start,date_end")
    .eq("user_id", user?.id)
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: duties = [] } = latestImport
    ? await supabase.from("duties").select("*").eq("user_id", user?.id).eq("import_id", latestImport.id).order("duty_date", { ascending: true })
    : { data: [] };

  const { data: commute } = await supabase
    .from("commute_settings")
    .select("enabled,before_minutes,after_minutes,travel_mode,home_station,work_station")
    .eq("user_id", user?.id)
    .maybeSingle();

  const plan = latestImport
    ? buildCalendarSyncPlan(
        latestImport.id,
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
      )
    : null;
  const googleStatus = googleStatusMessage(searchParams?.google);
  const grantedScopes = connection?.granted_scopes || connection?.scope || "";
  const googleServices = connection?.connected_services ?? googleServicesFromScope(grantedScopes);
  const googleConnected = Boolean(connection && !connection.disconnected_at);

  return (
    <div className="space-y-5">
      {googleStatus ? (
        <section className="rounded-lg border border-occ-line bg-occ-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">{googleStatus.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">{googleStatus.detail}</p>
            </div>
            <StatusBadge tone={googleStatus.tone}>{searchParams?.google}</StatusBadge>
          </div>
        </section>
      ) : null}

      <GoogleConnectionPanel
        configured={hasGoogleOAuthConfig() && hasGoogleTokenEncryptionKey()}
        connected={googleConnected}
        services={googleServices}
        connectedAt={connection?.connected_at}
        lastSyncAt={connection?.last_sync_at}
        lastError={connection?.last_error}
      />

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Google Calendar</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Calendar sync queue</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Connect Google Calendar, review the generated event plan, then sync duties and commute blocks.
            </p>
          </div>
          <StatusBadge tone={googleServices.calendar ? "green" : "amber"}>{googleServices.calendar ? "Connected" : "Not connected"}</StatusBadge>
        </div>

        <CalendarSyncClient connected={Boolean(googleServices.calendar)} planCount={plan?.items.length ?? 0} latestImportId={latestImport?.id} />
      </section>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Latest import</h2>
            <p className="text-sm text-zinc-500">{latestImport?.filename ?? "No import available"}</p>
          </div>
          <StatusBadge tone={latestImport ? "cyan" : "neutral"}>{latestImport?.status ?? "Waiting"}</StatusBadge>
        </div>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <span className="rounded-md bg-occ-ink p-3 text-zinc-400">
            Date range
            <strong className="mt-1 block text-white">
              {plan?.dateRange.start ?? "-"} to {plan?.dateRange.end ?? "-"}
            </strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-zinc-400">
            Duty rows
            <strong className="mt-1 block text-white">{duties?.length ?? 0}</strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-zinc-400">
            Calendar items
            <strong className="mt-1 block text-white">{plan?.items.length ?? 0}</strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-zinc-400">
            Commute source
            <strong className="mt-1 block text-white">{commute?.travel_mode === "ns" ? "NS live reference" : "Manual buffer"}</strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-zinc-400">
            NS route
            <strong className="mt-1 block text-white">
              {commute?.home_station && commute?.work_station ? `${commute.home_station} ⇄ ${commute.work_station}` : "Not configured"}
            </strong>
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Sync preview</h2>
            <p className="text-sm text-zinc-500">Review exactly what Emma will create or update in Google Calendar.</p>
          </div>
          <StatusBadge tone={plan?.items.length ? "cyan" : "neutral"}>{plan?.items.length ?? 0} item(s)</StatusBadge>
        </div>

        <div className="mt-5 divide-y divide-occ-line">
          {plan?.items.length ? (
            plan.items.slice(0, 30).map((item) => (
              <div key={`${item.kind}-${item.draft.idempotencyKey}`} className="grid gap-3 py-3 sm:grid-cols-[16px_1fr_160px_90px] sm:items-center">
                <span className={`h-3 w-3 rounded-full ${colorClass(item.draft.colorKey)}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{item.draft.title}</p>
                  <p className="truncate text-xs text-zinc-500">{item.draft.description.split("\n")[0]}</p>
                </div>
                <span className="text-xs text-zinc-400">{eventTimeLabel(item)}</span>
                <StatusBadge tone={item.storedEventId ? "amber" : "green"}>{item.storedEventId ? "Update" : "Create"}</StatusBadge>
              </div>
            ))
          ) : (
            <p className="py-8 text-sm text-zinc-500">Import a roster to generate a calendar preview.</p>
          )}
        </div>
        {plan && plan.items.length > 30 ? <p className="mt-4 text-xs text-zinc-600">Showing first 30 of {plan.items.length} calendar item(s).</p> : null}
      </section>
    </div>
  );
}
