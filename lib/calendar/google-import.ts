import { parseGrantedScopes, GOOGLE_TASKS_READONLY_SCOPE } from "@/lib/google/oauth";
import { resilientFetch } from "@/lib/operations/resilience";

type SupabaseLike = {
  from: (table: string) => any;
};

type GoogleCalendarListEntry = {
  id: string;
  summary?: string;
  primary?: boolean;
  accessRole?: string;
};

type GoogleEventDate = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

type GoogleCalendarEvent = {
  id: string;
  etag?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  eventType?: string;
  start?: GoogleEventDate;
  end?: GoogleEventDate;
  recurringEventId?: string;
  recurrence?: string[];
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string; self?: boolean }>;
  organizer?: { email?: string; displayName?: string; self?: boolean };
  creator?: { email?: string; displayName?: string; self?: boolean };
  birthdayProperties?: { type?: string; contact?: string; customTypeName?: string };
  updated?: string;
};

type GoogleTaskList = {
  id: string;
  title?: string;
};

type GoogleTask = {
  id: string;
  title?: string;
  notes?: string;
  status?: string;
  due?: string;
  completed?: string;
  updated?: string;
  parent?: string;
  position?: string;
  links?: Array<{ type?: string; description?: string; link?: string }>;
};

export type GoogleContentSyncSummary = {
  calendarsScanned: number;
  calendarItemsSynced: number;
  tasksSynced: number;
  specialDatesSynced: number;
  tasksScopeGranted: boolean;
  calendarListScopeGranted: boolean;
  errors: string[];
};

export function buildGoogleImportWindow(now = new Date()) {
  const pastDays = Number(process.env.GOOGLE_IMPORT_PAST_DAYS ?? 30);
  const futureDays = Number(process.env.GOOGLE_IMPORT_FUTURE_DAYS ?? 370);
  const timeMin = new Date(now);
  timeMin.setUTCDate(timeMin.getUTCDate() - pastDays);
  const timeMax = new Date(now);
  timeMax.setUTCDate(timeMax.getUTCDate() + futureDays);

  return {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString()
  };
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : null;
}

function eventKind(event: GoogleCalendarEvent) {
  if (event.eventType === "birthday") return "special_date";
  if (event.eventType === "fromGmail") return "appointment";
  if (event.eventType === "outOfOffice") return "blocked_time";
  if (event.eventType === "focusTime") return "focus_time";
  if (event.eventType === "workingLocation") return "working_location";
  return "appointment";
}

function specialDateLabel(event: GoogleCalendarEvent) {
  if (event.eventType !== "birthday") return null;
  return event.birthdayProperties?.customTypeName ?? event.birthdayProperties?.type ?? "birthday";
}

function preferCalendarItem(candidate: ReturnType<typeof calendarEventToNovaItem>, existing?: ReturnType<typeof calendarEventToNovaItem>) {
  if (!existing) return candidate;
  if (existing.source_calendar_id === "primary" && candidate.source_calendar_id !== "primary") return candidate;
  return existing;
}

export function dedupeGoogleCalendarRows(rows: Array<ReturnType<typeof calendarEventToNovaItem>>) {
  const deduped = new Map<string, ReturnType<typeof calendarEventToNovaItem>>();
  for (const row of rows) {
    const key = `${row.user_id}:${row.source_provider}:${row.source_event_id}`;
    deduped.set(key, preferCalendarItem(row, deduped.get(key)));
  }
  return [...deduped.values()];
}

function dedupeTaskRows<T extends { user_id: string; source_provider: string; source_list_id: string; source_task_id: string }>(rows: T[]) {
  return [...new Map(rows.map((row) => [`${row.user_id}:${row.source_provider}:${row.source_list_id}:${row.source_task_id}`, row])).values()];
}

export function calendarEventToNovaItem({
  userId,
  calendar,
  event,
  syncedAt
}: {
  userId: string;
  calendar: GoogleCalendarListEntry;
  event: GoogleCalendarEvent;
  syncedAt: string;
}) {
  const isAllDay = Boolean(event.start?.date);

  return {
    user_id: userId,
    source_provider: "google_calendar",
    source_calendar_id: calendar.id,
    source_calendar_summary: calendar.summary ?? calendar.id,
    source_event_id: event.id,
    external_etag: event.etag ?? null,
    event_type: event.eventType ?? "default",
    item_kind: eventKind(event),
    title: event.summary || "(No title)",
    description: event.description ?? null,
    location: event.location ?? null,
    starts_at: isAllDay ? null : event.start?.dateTime ?? null,
    ends_at: isAllDay ? null : event.end?.dateTime ?? null,
    all_day_date: isAllDay ? event.start?.date ?? null : null,
    all_day_end_date: isAllDay ? event.end?.date ?? null : null,
    is_all_day: isAllDay,
    status: event.status ?? "confirmed",
    html_link: event.htmlLink ?? null,
    is_recurring: Boolean(event.recurringEventId || event.recurrence?.length),
    recurring_event_id: event.recurringEventId ?? null,
    birthday_type: event.birthdayProperties?.type ?? null,
    special_date_label: specialDateLabel(event),
    attendees: event.attendees ?? [],
    metadata: {
      organizer: event.organizer ?? null,
      creator: event.creator ?? null,
      birthdayProperties: event.birthdayProperties ?? null,
      updated: event.updated ?? null
    },
    synced_at: syncedAt
  };
}

export function specialDateTaskFromCalendarItem(item: ReturnType<typeof calendarEventToNovaItem>) {
  if (item.item_kind !== "special_date" || item.status === "cancelled") return null;
  const dueDate = item.all_day_date ?? dateOnly(item.starts_at);
  if (!dueDate) return null;

  return {
    user_id: item.user_id,
    source_provider: "google_calendar",
    source_list_id: "google_calendar",
    source_task_id: `special-date:${item.source_event_id}`,
    source_kind: "special_date",
    title: item.title,
    notes: item.description,
    status: "needsAction",
    due_at: null,
    due_date: dueDate,
    completed_at: null,
    calendar_item_source_id: item.source_event_id,
    source_url: item.html_link,
    metadata: {
      eventType: item.event_type,
      specialDateLabel: item.special_date_label,
      birthdayType: item.birthday_type
    },
    synced_at: item.synced_at
  };
}

export function googleTaskToNovaTask({
  userId,
  taskList,
  task,
  syncedAt
}: {
  userId: string;
  taskList: GoogleTaskList;
  task: GoogleTask;
  syncedAt: string;
}) {
  return {
    user_id: userId,
    source_provider: "google_tasks",
    source_list_id: taskList.id,
    source_task_id: task.id,
    source_kind: "task",
    title: task.title || "(No title)",
    notes: task.notes ?? null,
    status: task.status ?? "needsAction",
    due_at: task.due ?? null,
    due_date: dateOnly(task.due),
    completed_at: task.completed ?? null,
    calendar_item_source_id: null,
    source_url: task.links?.[0]?.link ?? null,
    metadata: {
      taskListTitle: taskList.title ?? null,
      updated: task.updated ?? null,
      parent: task.parent ?? null,
      position: task.position ?? null,
      links: task.links ?? []
    },
    synced_at: syncedAt
  };
}

async function fetchJson(url: string, accessToken: string, label: string) {
  const response = await resilientFetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 }
  }, {
    label,
    timeoutMs: 10_000,
    attempts: 2
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    let detail = raw.slice(0, 300);
    try {
      const payload = JSON.parse(raw);
      const message = payload?.error?.message;
      const reason = payload?.error?.errors?.[0]?.reason;
      detail = [reason, message].filter(Boolean).join(": ") || detail;
    } catch {
      // Keep the bounded raw response as diagnostic detail.
    }
    throw new Error(`${label} returned ${response.status}${detail ? `: ${detail}` : ""}.`);
  }

  return response.json();
}

async function fetchCalendarList(accessToken: string, errors: string[]) {
  const calendars: GoogleCalendarListEntry[] = [];
  let pageToken: string | null = null;

  try {
    for (let page = 0; page < 10; page += 1) {
      const params = new URLSearchParams({
        maxResults: "250",
        showHidden: "true",
        minAccessRole: "reader"
      });
      if (pageToken) params.set("pageToken", pageToken);
      const payload = await fetchJson(`https://www.googleapis.com/calendar/v3/users/me/calendarList?${params.toString()}`, accessToken, "Google Calendar list");
      calendars.push(...((payload.items ?? []) as GoogleCalendarListEntry[]));
      pageToken = payload.nextPageToken ?? null;
      if (!pageToken) break;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Google Calendar list unavailable.");
  }

  return calendars.length ? calendars : [{ id: "primary", summary: "Primary calendar", primary: true, accessRole: "owner" }];
}

async function fetchEventsForCalendar({
  accessToken,
  calendar,
  timeMin,
  timeMax,
  errors
}: {
  accessToken: string;
  calendar: GoogleCalendarListEntry;
  timeMin: string;
  timeMax: string;
  errors: string[];
}) {
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | null = null;

  try {
    for (let page = 0; page < 10; page += 1) {
      const params = new URLSearchParams({
        singleEvents: "true",
        orderBy: "startTime",
        showDeleted: "true",
        maxResults: "2500",
        timeMin,
        timeMax
      });
      if (pageToken) params.set("pageToken", pageToken);
      const payload = await fetchJson(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params.toString()}`,
        accessToken,
        `Google Calendar events ${calendar.summary ?? calendar.id}`
      );
      events.push(...((payload.items ?? []) as GoogleCalendarEvent[]));
      pageToken = payload.nextPageToken ?? null;
      if (!pageToken) break;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `Google Calendar events unavailable for ${calendar.summary ?? calendar.id}.`);
  }

  return events;
}

async function fetchGoogleTaskLists(accessToken: string, errors: string[]) {
  const lists: GoogleTaskList[] = [];
  let pageToken: string | null = null;

  try {
    for (let page = 0; page < 10; page += 1) {
      const params = new URLSearchParams({ maxResults: "100" });
      if (pageToken) params.set("pageToken", pageToken);
      const payload = await fetchJson(`https://tasks.googleapis.com/tasks/v1/users/@me/lists?${params.toString()}`, accessToken, "Google Task lists");
      lists.push(...((payload.items ?? []) as GoogleTaskList[]));
      pageToken = payload.nextPageToken ?? null;
      if (!pageToken) break;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Google Task lists unavailable.");
  }

  return lists;
}

async function fetchTasksForList(accessToken: string, taskList: GoogleTaskList, errors: string[]) {
  const tasks: GoogleTask[] = [];
  let pageToken: string | null = null;

  try {
    for (let page = 0; page < 10; page += 1) {
      const params = new URLSearchParams({
        maxResults: "100",
        showCompleted: "true",
        showDeleted: "true",
        showHidden: "true"
      });
      if (pageToken) params.set("pageToken", pageToken);
      const payload = await fetchJson(
        `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskList.id)}/tasks?${params.toString()}`,
        accessToken,
        `Google Tasks ${taskList.title ?? taskList.id}`
      );
      tasks.push(...((payload.items ?? []) as GoogleTask[]));
      pageToken = payload.nextPageToken ?? null;
      if (!pageToken) break;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `Google Tasks unavailable for ${taskList.title ?? taskList.id}.`);
  }

  return tasks;
}

export async function syncGoogleContentForUser({
  supabase,
  userId,
  accessToken,
  grantedScopes = "",
  now = new Date()
}: {
  supabase: SupabaseLike;
  userId: string;
  accessToken: string;
  grantedScopes?: string | null;
  now?: Date;
}): Promise<GoogleContentSyncSummary> {
  const syncedAt = new Date().toISOString();
  const scopes = parseGrantedScopes(grantedScopes ?? "");
  const tasksScopeGranted = scopes.has(GOOGLE_TASKS_READONLY_SCOPE);
  const calendarListScopeGranted =
    scopes.has("https://www.googleapis.com/auth/calendar.calendarlist.readonly") ||
    scopes.has("https://www.googleapis.com/auth/calendar.readonly") ||
    scopes.has("https://www.googleapis.com/auth/calendar");
  const errors: string[] = [];
  const { timeMin, timeMax } = buildGoogleImportWindow(now);
  const calendars = await fetchCalendarList(accessToken, errors);
  const rawCalendarRows = [];
  const rawSpecialDateTasks = [];

  for (const calendar of calendars) {
    const events = await fetchEventsForCalendar({ accessToken, calendar, timeMin, timeMax, errors });
    for (const event of events) {
      if (!event.id) continue;
      const item = calendarEventToNovaItem({ userId, calendar, event, syncedAt });
      rawCalendarRows.push(item);
      const task = specialDateTaskFromCalendarItem(item);
      if (task) rawSpecialDateTasks.push(task);
    }
  }

  const calendarRows = dedupeGoogleCalendarRows(rawCalendarRows);
  const specialDateTasks = dedupeTaskRows(rawSpecialDateTasks);

  if (calendarRows.length) {
    const { error } = await supabase
      .from("nova_calendar_items")
      .upsert(calendarRows, { onConflict: "user_id,source_provider,source_event_id" });
    if (error) errors.push(error.message);
  }

  if (specialDateTasks.length) {
    const { error } = await supabase
      .from("nova_tasks")
      .upsert(specialDateTasks, { onConflict: "user_id,source_provider,source_list_id,source_task_id" });
    if (error) errors.push(error.message);
  }

  let tasksSynced = specialDateTasks.length;
  if (tasksScopeGranted) {
    const taskLists = await fetchGoogleTaskLists(accessToken, errors);
    const taskRows = [];
    for (const taskList of taskLists) {
      const tasks = await fetchTasksForList(accessToken, taskList, errors);
      taskRows.push(...tasks.filter((task) => task.id).map((task) => googleTaskToNovaTask({ userId, taskList, task, syncedAt })));
    }
    const dedupedTaskRows = dedupeTaskRows(taskRows);
    if (dedupedTaskRows.length) {
      const { error } = await supabase
        .from("nova_tasks")
        .upsert(dedupedTaskRows, { onConflict: "user_id,source_provider,source_list_id,source_task_id" });
      if (error) errors.push(error.message);
      tasksSynced += dedupedTaskRows.length;
    }
  } else {
    errors.push("Google Tasks scope is not granted yet. Reconnect Google to import Google Tasks.");
  }

  return {
    calendarsScanned: calendars.length,
    calendarItemsSynced: calendarRows.length,
    tasksSynced,
    specialDatesSynced: specialDateTasks.length,
    tasksScopeGranted,
    calendarListScopeGranted,
    errors
  };
}
