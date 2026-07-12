# NOVA Phase 7 - Production Hardening and Launch

Status: `1.0.0-rc.1`

Phase 7 is a hardening phase. No new product workflows were added except production-readiness fixes for privacy deletion, health reporting, provider resilience, and release gates.

## Implemented Hardening

- Added bounded timeouts, retries, and exponential backoff for NS, Google Routes, Google OAuth, weather, and AI Core provider calls.
- Added structured JSON operational logging with secret redaction.
- Added `/api/health` for production health checks across Supabase, Google OAuth, Google Maps, NS, weather, notifications, and AI Core.
- Added freshness/status labels in the health report: `live`, `recent`, `fallback`, and `unavailable`.
- Added location-data deletion through `/api/privacy/location-data` and the dashboard GPS panel.
- Added notification cooldown metadata and duplicate-alert audit metadata.
- Explicitly classified roster edge cases: Late Shift, Night Shift, OFF Day, `R`, `*`, and `VL`.
- Added Phase 7 regression coverage for return trips, cancellations, platform changes, engineering works, severe weather buffers, route fallbacks, notification cooldowns, health reporting, and roster edge cases.

## Release Gate

NOVA v1.0 must not be declared production-ready unless all items are complete:

- `npm test` passes.
- `npm run build` passes.
- `npm run test:e2e` passes.
- `/api/health` returns a non-`down` status in production.
- No live integration is silently represented as live when it is fallback or unavailable.
- Duplicate notification and cooldown behavior has been verified.
- Google OAuth scopes and encrypted token storage have been reviewed.
- Supabase RLS policies remain self-owned by `user_id`.
- Location-data deletion has been tested from the dashboard.
- Rollback has been tested with a previous Vercel deployment.

## Runbooks

### Google Calendar or Gmail Failure

1. Open `/api/health` and confirm the `google-oauth` check.
2. Reconnect Google from Calendar Sync if OAuth is degraded.
3. Confirm the redirect URI matches `NEXT_PUBLIC_APP_URL` plus `/api/auth/google/callback`.
4. Verify `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `GOOGLE_TOKEN_ENCRYPTION_KEY`.
5. If tokens were exposed or encryption changed unexpectedly, disconnect/reconnect Google and rotate the encryption key only after invalidating old sessions.

### NS or Google Maps Failure

1. Open Commute and confirm whether the route is marked live, fallback, or unavailable.
2. Check `/api/health` for `ns` and `google-routes`.
3. If NS API is degraded, use the NS planner link in the commute panel.
4. If Google Routes is degraded, use the Google Maps planner links and verify departure manually.

### Weather Failure

1. Confirm the weather panel shows unavailable instead of live.
2. Check `WEATHER_LOCATION`.
3. Use the commute buffer manually until the weather provider recovers.

### Notification Failure

1. Check `/notifications` for in-app events.
2. Confirm VAPID variables exist for push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
3. Confirm duplicate events share the same `dedupe_key`.
4. Confirm cooldown metadata appears in `notification_events.metadata`.

### Supabase Failure

1. Check `/api/health`.
2. Confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. Review RLS policies before granting any additional table access.
4. Use Supabase backups or point-in-time recovery before applying emergency data fixes.

## Backup And Recovery

- Export schema before major migrations.
- Keep every SQL migration in `supabase/migrations`.
- Before applying a risky migration, record the current production deployment ID and Supabase backup timestamp.
- Recovery order: pause writes if needed, restore database backup, redeploy last known good Vercel deployment, then verify `/api/health`.

## Migration Rollback

Phase migrations are append-only. To roll back:

1. Create a new corrective migration instead of editing an applied migration.
2. Disable affected UI/API paths while the corrective migration is prepared.
3. Restore data from backup if the migration mutated user data incorrectly.
4. Run `npm test`, `npm run test:e2e`, and `npm run build`.
5. Deploy and verify `/api/health`.

## Release Notes

### 1.0.0-rc.1

- Production health endpoint.
- Provider retries, timeouts, and fallback labeling.
- Notification cooldown audit metadata.
- Privacy deletion for stored location data.
- Roster hardening for `R`, `*`, and `VL`.
- Phase 7 E2E-style release gate.

## Current Non-Automated Checks

These must still be manually verified on real devices before declaring final `v1.0.0`:

- iPhone installed PWA behavior.
- Android installed PWA behavior.
- Battery impact from GPS during an actual commute.
- Vercel rollback execution against a previous production deployment.
