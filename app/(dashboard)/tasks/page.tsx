import { CalendarDays, CheckSquare, Gift, RefreshCw } from "lucide-react";
import { CalendarSyncClient } from "@/components/calendar/CalendarSyncClient";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { googleServicesFromScope } from "@/lib/google/oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatDate(value?: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: process.env.APP_TIMEZONE || "Europe/Amsterdam"
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

function formatDateTime(value?: string | null) {
  if (!value) return "No time";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.APP_TIMEZONE || "Europe/Amsterdam"
  }).format(new Date(value));
}

function taskDueLabel(task: any) {
  if (task.due_at) return formatDateTime(task.due_at);
  if (task.due_date) return formatDate(task.due_date);
  return "No due date";
}

function calendarTimeLabel(item: any) {
  if (item.is_all_day) return formatDate(item.all_day_date);
  return formatDateTime(item.starts_at);
}

export default async function TasksPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: connection } = await supabase
    .from("google_calendar_connections")
    .select("connected_at,last_sync_at,scope,granted_scopes,connected_services,disconnected_at,last_error")
    .eq("user_id", user?.id)
    .eq("calendar_id", process.env.GOOGLE_CALENDAR_ID || "primary")
    .maybeSingle();

  const grantedScopes = connection?.granted_scopes || connection?.scope || "";
  const services = grantedScopes ? googleServicesFromScope(grantedScopes) : connection?.connected_services ?? googleServicesFromScope(grantedScopes);
  const connected = Boolean(connection && !connection.disconnected_at);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE || "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  const [{ data: tasks = [] }, { data: specialDates = [] }, { data: appointments = [] }, { count: openTaskCount = 0 }] = await Promise.all([
    supabase
      .from("nova_tasks")
      .select("id,title,notes,status,due_at,due_date,source_provider,source_kind,source_url,synced_at")
      .eq("user_id", user?.id)
      .neq("status", "completed")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(12),
    supabase
      .from("nova_calendar_items")
      .select("id,title,all_day_date,starts_at,item_kind,special_date_label,source_calendar_summary,html_link")
      .eq("user_id", user?.id)
      .eq("item_kind", "special_date")
      .neq("status", "cancelled")
      .gte("all_day_date", today)
      .order("all_day_date", { ascending: true })
      .limit(8),
    supabase
      .from("nova_calendar_items")
      .select("id,title,starts_at,all_day_date,is_all_day,item_kind,source_calendar_summary,location,html_link")
      .eq("user_id", user?.id)
      .neq("item_kind", "special_date")
      .neq("status", "cancelled")
      .or(`starts_at.gte.${new Date().toISOString()},all_day_date.gte.${today}`)
      .order("starts_at", { ascending: true, nullsFirst: false })
      .order("all_day_date", { ascending: true, nullsFirst: false })
      .limit(10),
    supabase
      .from("nova_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user?.id)
      .neq("status", "completed")
  ]);
  const taskRows = tasks ?? [];
  const specialDateRows = specialDates ?? [];
  const appointmentRows = appointments ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA Tasks</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Tasks, appointments, and special dates</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              NOVA imports Google Calendar appointments, birthdays, special dates, and Google Tasks into one operational view. Existing Google Tasks require the Tasks read-only scope, so reconnect Google if that status is not active.
            </p>
          </div>
          <StatusBadge tone={connected ? "green" : "amber"}>{connected ? "Google connected" : "Reconnect Google"}</StatusBadge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <span className="rounded-md bg-occ-ink p-3 text-sm text-zinc-400">
            Open tasks
            <strong className="mt-1 block text-2xl text-white">{openTaskCount ?? taskRows.length}</strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-sm text-zinc-400">
            Appointments
            <strong className="mt-1 block text-2xl text-white">{appointmentRows.length}</strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-sm text-zinc-400">
            Special dates
            <strong className="mt-1 block text-2xl text-white">{specialDateRows.length}</strong>
          </span>
          <span className="rounded-md bg-occ-ink p-3 text-sm text-zinc-400">
            Last sync
            <strong className="mt-1 block text-white">{connection?.last_sync_at ? formatDateTime(connection.last_sync_at) : "Never"}</strong>
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <StatusBadge tone={services.calendar ? "green" : "amber"}>Calendar {services.calendar ? "active" : "missing"}</StatusBadge>
          <StatusBadge tone={services.calendarList ? "green" : "amber"}>All calendars {services.calendarList ? "active" : "primary fallback"}</StatusBadge>
          <StatusBadge tone={services.tasks ? "green" : "amber"}>Google Tasks {services.tasks ? "active" : "needs reconnect"}</StatusBadge>
        </div>

        <CalendarSyncClient connected={connected} planCount={0} latestImportId={null} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-occ-cyan" />
            <h2 className="text-lg font-semibold text-white">NOVA task queue</h2>
          </div>
          <div className="mt-5 divide-y divide-occ-line">
            {taskRows.length ? (
              taskRows.map((task: any) => (
                <div key={task.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_150px_110px] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{task.title}</p>
                    <p className="truncate text-xs text-zinc-500">{task.notes || task.source_provider}</p>
                  </div>
                  <span className="text-xs text-zinc-400">{taskDueLabel(task)}</span>
                  <StatusBadge tone={task.source_kind === "special_date" ? "cyan" : "green"}>{task.source_kind}</StatusBadge>
                </div>
              ))
            ) : (
              <p className="py-8 text-sm text-zinc-500">No Google tasks or special-date reminders have been synced yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
          <div className="flex items-center gap-2">
            <Gift size={18} className="text-occ-gold" />
            <h2 className="text-lg font-semibold text-white">Birthdays and special dates</h2>
          </div>
          <div className="mt-5 divide-y divide-occ-line">
            {specialDateRows.length ? (
              specialDateRows.map((item: any) => (
                <div key={item.id} className="py-3">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDate(item.all_day_date ?? item.starts_at)} · {item.special_date_label ?? item.source_calendar_summary}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-8 text-sm text-zinc-500">No upcoming birthdays or special dates synced yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-occ-cyan" />
          <h2 className="text-lg font-semibold text-white">Upcoming Google Calendar items</h2>
        </div>
        <div className="mt-5 divide-y divide-occ-line">
          {appointmentRows.length ? (
            appointmentRows.map((item: any) => (
              <div key={item.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_170px_130px] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{item.title}</p>
                  <p className="truncate text-xs text-zinc-500">{item.location || item.source_calendar_summary}</p>
                </div>
                <span className="text-xs text-zinc-400">{calendarTimeLabel(item)}</span>
                <StatusBadge tone={item.item_kind === "appointment" ? "green" : "cyan"}>{item.item_kind}</StatusBadge>
              </div>
            ))
          ) : (
            <p className="py-8 text-sm text-zinc-500">No upcoming Google Calendar appointments have been synced yet.</p>
          )}
        </div>
      </section>

      {connection?.last_error ? (
        <section className="rounded-lg border border-occ-amber/40 bg-occ-amber/10 p-4 text-sm text-amber-100">
          <div className="flex items-center gap-2 font-semibold">
            <RefreshCw size={16} />
            Latest sync note
          </div>
          <p className="mt-2">{connection.last_error}</p>
        </section>
      ) : null}
    </div>
  );
}
