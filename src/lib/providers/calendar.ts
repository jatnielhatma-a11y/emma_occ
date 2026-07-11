import { fallbackRoster } from '../fallback';
import { makeShift } from '../roster';
import type { Shift } from '../types';
import { getGoogleAccessToken } from './google-auth';

function hhmm(value?: string): string | undefined {
  if (!value) return undefined;
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Amsterdam',
  });
}

function eventDate(value?: string): string {
  return new Date(value ?? Date.now()).toISOString();
}

export async function getRoster(): Promise<Shift[]> {
  try {
    const token = await getGoogleAccessToken();
    if (!token) return fallbackRoster;

    const calendarId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID ?? 'primary');
    const now = new Date();
    const start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 21 * 86400000);
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);
    url.searchParams.set('timeMin', start.toISOString());
    url.searchParams.set('timeMax', end.toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '100');

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Calendar ${response.status}`);

    const data = await response.json() as { items?: Array<any> };
    const shifts = (data.items ?? []).map((event) => {
      const summary = String(event.summary ?? '').trim();
      const code = summary.match(/\b(?:VL|R|--|-|\d{3}[A-Z])\b/i)?.[0] ?? summary;
      const startValue = event.start?.dateTime ?? event.start?.date;
      const endValue = event.end?.dateTime ?? event.end?.date;
      return makeShift({
        date: eventDate(startValue),
        code,
        detail: summary || code,
        start: hhmm(event.start?.dateTime),
        end: hhmm(event.end?.dateTime),
      });
    }).filter((shift) => shift.label !== 'Unknown');

    return shifts.length ? shifts : fallbackRoster;
  } catch {
    return fallbackRoster;
  }
}
