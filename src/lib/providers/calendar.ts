import { fallbackRoster } from '../fallback';
import { makeShift } from '../roster';
import type { Shift } from '../types';
function hhmm(value?: string): string | undefined { if (!value) return undefined; return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }); }
export async function getRoster(): Promise<Shift[]> {
  const token = process.env.GOOGLE_ACCESS_TOKEN;
  if (!token) return fallbackRoster;
  try {
    const calendarId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID ?? 'primary');
    const now = new Date();
    const end = new Date(now.getTime() + 14 * 86400000);
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);
    url.searchParams.set('timeMin', now.toISOString());
    url.searchParams.set('timeMax', end.toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Calendar ${response.status}`);
    const data = await response.json() as { items?: Array<any> };
    const shifts = (data.items ?? []).map((event) => {
      const summary = String(event.summary ?? '').trim();
      const code = summary.match(/\b(?:VL|R|--|-|\d{3}[A-Z])\b/i)?.[0] ?? summary;
      return makeShift({
        date: new Date(event.start?.dateTime ?? event.start?.date ?? Date.now()).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Amsterdam' }),
        code, detail: summary || code, start: hhmm(event.start?.dateTime), end: hhmm(event.end?.dateTime),
      });
    }).filter((shift) => shift.label !== 'Unknown');
    return shifts.length ? shifts : fallbackRoster;
  } catch { return fallbackRoster; }
}
