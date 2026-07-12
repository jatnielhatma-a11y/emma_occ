# NOVA Release 6 - Production Readiness

## Scope

Release 6 hardens NOVA for daily operational use. It does not add unrelated product features; it makes the completed Release 1-5 system measurable, monitored, rollback-aware, and honest about manual launch gates.

It covers:

- Production release gates
- Live integration health and source freshness
- Fallback behavior verification
- Notification cooldown and dedupe verification
- OAuth scope and token-storage review
- Supabase RLS and explicit Data API grants
- Privacy controls and location-data deletion
- Backup, recovery, and migration rollback procedures
- Mobile, desktop, and installed PWA behavior tracking
- Planned-versus-actual commute accuracy

## Launch Rules

- Do not declare NOVA v1.0 launch-ready while any critical or high gate is blocked.
- Fallback data must stay labeled before it influences duty, commute, calendar, email, or notification decisions.
- Notifications must be deduplicated and cooldown-aware.
- Rollback and recovery procedures must be documented and rehearsed before production approval.
- Health checks must report live, degraded, fallback, and unavailable states without exposing secrets.
- Commute accuracy records are user-owned and must not require continuous background GPS.

## Verification

Run:

```bash
npm audit --audit-level=low
npm test
npm run build
```
