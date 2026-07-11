# Vercel live integration checklist

Add the following variables in Vercel Project Settings → Environment Variables:

- `GOOGLE_ACCESS_TOKEN`
- `GOOGLE_CALENDAR_ID=primary`
- `GOOGLE_MAPS_API_KEY`
- `NS_API_KEY`
- `NS_TRIPS_BASE_URL` (optional)
- `GMAIL_QUERY` (optional)

Redeploy after changing environment variables. The dashboard will show each provider as LIVE or FALLBACK in the Integration Control panel.

Keep all credentials server-only. Never prefix them with `NEXT_PUBLIC_`.
