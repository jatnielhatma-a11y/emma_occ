# Emma OCC deployment

## Required runtime environment variables

Set these in the deployment platform (for example Vercel Project Settings > Environment Variables):

- `GOOGLE_CALENDAR_ACCESS_TOKEN`
- `GMAIL_ACCESS_TOKEN`
- `GOOGLE_MAPS_API_KEY`
- `NS_API_KEY`
- `WEATHER_API_KEY`
- `WEATHER_API_URL`

Do not commit secret values to GitHub.

## Runtime behavior

- The dashboard aggregates roster, NS, Maps, weather, and Gmail data server-side.
- Missing credentials automatically fall back to safe mock data.
- The client refreshes live operations data every five minutes.
- OFF Day/R and Vacation/VL never produce commute plans.

## Deployment

1. Import `jatnielhatma-a11y/emma_occ` into Vercel.
2. Keep the framework preset on Next.js.
3. Add the environment variables above.
4. Deploy from `main` after merging the operational-core PR.
