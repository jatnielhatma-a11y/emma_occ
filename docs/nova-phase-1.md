# NOVA Phase 1

## Current-State Audit

- The app is a Next.js App Router dashboard with Supabase Auth, roster import, conflict detection, Google Calendar OAuth routes, NS commute reference, weather readout, and Emma AI endpoints.
- Emma OCC is the first working operational module and should remain intact while NOVA becomes the wider shell.
- The local folder is not currently a Git repository, so the requested `agent/nova-core` branch cannot be created from this workspace.

## Phase 1 Architecture

- `NOVA` becomes the product shell and Mission Control entry point.
- Emma OCC remains embedded as the first module inside Mission Control.
- Provider contracts live in `lib/providers/types.ts` so UI components do not depend directly on future Google, NS, traffic, weather, email, or AI vendors.
- Phase 1 traffic, email, tasks, and analytics pages are explicit placeholders. They do not claim live data.

## File And Folder Plan

- `components/nova/*`: Mission Control panels, integration health, module placeholders, and location permission status.
- `components/i18n/*` and `messages/*`: English, Spanish, and French language architecture.
- `lib/providers/*`: Provider result and health interfaces.
- Existing Emma OCC dashboard, Google OAuth routes, roster import, and commute logic remain in place.

## Environment Variables

- Existing: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `NEXT_PUBLIC_APP_URL`, `APP_TIMEZONE`, `NS_HOME_STATION`, `NS_WORK_STATION`, `COMMUTE_HOME_ADDRESS`, `COMMUTE_WORK_ADDRESS`, `OPENAI_API_KEY`, `OPENAI_MODEL`.
- Future Phase 2+: `GOOGLE_TOKEN_ENCRYPTION_KEY`, `GOOGLE_CALENDAR_ID`.
- Future Phase 4+: Google Maps and traffic provider keys.

## Supabase Schema

- Existing schema already supports profiles, user settings, commute settings, roster imports, duties, conflicts, Google Calendar connections, calendar sync logs, and AI query history.
- Phase 2 should extend settings for persisted language, route preferences, notification preferences, location preferences, and token encryption metadata.

## Provider Interface Design

- Every provider returns `data`, `source`, `retrievedAt`, `freshness`, `confidence`, `error`, and `isFallback`.
- Initial interfaces include Calendar, Email, Maps, Traffic, Transit, Weather, Location, Notification, and AI providers.
- UI panels consume provider health summaries instead of vendor-specific payloads.

## Known Phase 1 Limits

- Language switching currently covers the NOVA shell and Phase 1 module surfaces; deeper Emma OCC screens still use the existing English copy.
- Location permission is optional and user-triggered; no continuous GPS tracking or geofencing is implemented in Phase 1.
- Traffic and email modules are placeholders until provider connections are added in later phases.
