import { buildCalendarEventDrafts, type CalendarEventDraft, type CommuteDraftSettings } from "@/lib/roster/calendar";
import type { NormalizedDuty } from "@/lib/roster/types";
import {
  encryptGoogleToken,
  decryptGoogleToken,
  hasGoogleTokenEncryptionKey
} from "@/lib/google/token-crypto";
import {
  buildGoogleOAuthUrl,
  exchangeGoogleCode,
  getGoogleOAuthConfig,
  hasGoogleOAuthConfig,
  refreshGoogleAccessToken as refreshGoogleAccessTokenWithRefreshToken,
  type GoogleTokenResponse
} from "@/lib/google/oauth";

export { buildGoogleOAuthUrl, exchangeGoogleCode, getGoogleOAuthConfig, hasGoogleOAuthConfig };

export type GoogleCalendarConnection = {
  id: string;
  user_id: string;
  calendar_id: string;
  access_token: string | null;
  refresh_token: string | null;
  access_token_encrypted?: string | null;
  refresh_token_encrypted?: string | null;
  token_encryption_version?: string | null;
  granted_scopes?: string | null;
  expires_at: string | null;
  scope: string | null;
  token_type: string | null;
};

export type SyncableDuty = NormalizedDuty & {
  id: string;
  importId: string;
  calendarEventId?: string | null;
  commuteToEventId?: string | null;
  commuteHomeEventId?: string | null;
};

export type CalendarSyncPlanItem = {
  dutyId: string;
  kind: "duty" | "commute-to" | "commute-home";
  draft: CalendarEventDraft;
  storedEventId: string | null;
};

export type CalendarSyncPlan = {
  importId: string;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  items: CalendarSyncPlanItem[];
};

export async function refreshGoogleAccessToken(connection: GoogleCalendarConnection): Promise<GoogleTokenResponse | null> {
  const refreshToken = getGoogleRefreshToken(connection);
  if (!refreshToken) {
    return null;
  }

  return refreshGoogleAccessTokenWithRefreshToken(refreshToken);
}

export function getGoogleAccessToken(connection: GoogleCalendarConnection) {
  return decryptGoogleToken(connection.access_token_encrypted ?? connection.access_token);
}

export function getGoogleRefreshToken(connection: GoogleCalendarConnection) {
  return decryptGoogleToken(connection.refresh_token_encrypted ?? connection.refresh_token);
}

export function serializeGoogleTokenUpdate(token: GoogleTokenResponse, existingRefreshToken?: string | null) {
  const refreshToken = token.refresh_token ?? existingRefreshToken ?? null;

  if (!hasGoogleTokenEncryptionKey()) {
    return {
      access_token: token.access_token,
      refresh_token: refreshToken,
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      token_encryption_version: null
    };
  }

  return {
    access_token: null,
    refresh_token: null,
    access_token_encrypted: encryptGoogleToken(token.access_token),
    refresh_token_encrypted: encryptGoogleToken(refreshToken),
    token_encryption_version: "v1"
  };
}

function eventIdForDraft(duty: SyncableDuty, kind: CalendarSyncPlanItem["kind"]) {
  if (kind === "commute-to") return duty.commuteToEventId ?? null;
  if (kind === "commute-home") return duty.commuteHomeEventId ?? null;
  return duty.calendarEventId ?? null;
}

function kindForDraft(idempotencyKey: string): CalendarSyncPlanItem["kind"] {
  if (idempotencyKey.startsWith("commute-to:")) return "commute-to";
  if (idempotencyKey.startsWith("commute-home:")) return "commute-home";
  return "duty";
}

export function buildCalendarSyncPlan(
  importId: string,
  duties: SyncableDuty[],
  commute: CommuteDraftSettings
): CalendarSyncPlan {
  const items = duties.flatMap((duty) =>
    buildCalendarEventDrafts(duty, commute).map((draft) => {
      const kind = kindForDraft(draft.idempotencyKey);
      return {
        dutyId: duty.id,
        kind,
        draft,
        storedEventId: eventIdForDraft(duty, kind)
      };
    })
  );

  const dates = duties.map((duty) => duty.date).filter(Boolean).sort();

  return {
    importId,
    dateRange: {
      start: dates[0] ?? null,
      end: dates[dates.length - 1] ?? null
    },
    items
  };
}

export function toGoogleCalendarEvent(draft: CalendarEventDraft) {
  const timeZone = process.env.APP_TIMEZONE || "Europe/Amsterdam";
  const colorIdByKey: Record<CalendarEventDraft["colorKey"], string> = {
    night: "3",
    late: "5",
    off: "10",
    custom: "9",
    commute: "7"
  };
  const event: Record<string, unknown> = {
    summary: draft.title,
    description: `${draft.description}\n\nManaged by Emma OCC.`,
    colorId: colorIdByKey[draft.colorKey],
    extendedProperties: {
      private: {
        emmaKey: draft.idempotencyKey
      }
    }
  };

  if (draft.start && draft.end) {
    event.start = { dateTime: draft.start, timeZone };
    event.end = { dateTime: draft.end, timeZone };
  } else {
    const date = draft.allDayDate ?? draft.idempotencyKey.split("|")[0].replace("duty:", "");
    const nextDate = new Date(`${date}T00:00:00.000Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    event.start = { date };
    event.end = { date: nextDate.toISOString().slice(0, 10) };
  }

  return event;
}

export async function writeGoogleEvent({
  accessToken,
  calendarId,
  eventId,
  draft
}: {
  accessToken: string;
  calendarId: string;
  eventId?: string | null;
  draft: CalendarEventDraft;
}) {
  const encodedCalendarId = encodeURIComponent(calendarId || "primary");
  const payload = toGoogleCalendarEvent(draft);
  const url = eventId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events/${encodeURIComponent(eventId)}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events`;

  const response = await fetch(url, {
    method: eventId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Google Calendar write failed with ${response.status}.`);
  }

  return response.json();
}
