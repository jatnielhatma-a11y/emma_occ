import type { EmailAlert } from '../types';
import { getGoogleAccessToken } from './google-auth';

export async function getEmailAlerts(): Promise<EmailAlert[]> {
  try {
    const token = await getGoogleAccessToken();
    if (!token) return [];

    const query = encodeURIComponent(
      process.env.GMAIL_QUERY ?? 'is:unread newer_than:7d -category:promotions -category:social'
    );
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=${query}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );
    if (!response.ok) throw new Error(`Gmail ${response.status}`);

    const list = await response.json() as { messages?: Array<{ id: string }> };
    return Promise.all((list.messages ?? []).slice(0, 5).map(async ({ id }) => {
      const item = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      );
      if (!item.ok) throw new Error(`Gmail message ${item.status}`);
      const data = await item.json() as any;
      const headers = data.payload?.headers ?? [];
      return {
        subject: headers.find((h: any) => h.name === 'Subject')?.value ?? 'Untitled message',
        sender: headers.find((h: any) => h.name === 'From')?.value ?? 'Unknown sender',
        reason: 'Unread recent message',
        source: 'live' as const,
      };
    }));
  } catch {
    return [];
  }
}
