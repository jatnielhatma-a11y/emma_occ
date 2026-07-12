# NOVA Release 7 Production Hardening and Launch

Release 7 moves NOVA from readiness into a production-live release candidate while preserving Emma OCC as the active mission-control dashboard.

## Production-live rule

The app can be deployed to production when automated tests, build, end-to-end gates, fallback labels, notification dedupe, security review, privacy review, and release notes are represented and passing.

## Final v1.0 rule

Do not declare NOVA v1.0 production-ready until every critical and manual gate has proof. Remaining proof points include rollback rehearsal, real-device PWA behavior, accessibility testing, performance testing, GPS battery observation, backup recovery, and live integration observation.

## Release evidence

- Live URL: https://emma-occ-dashboard.vercel.app
- Candidate version: 1.0.0-rc.2
- Production deployment target: Vercel production
- Emma OCC: preserved
- Fallback behavior: required and labeled
- Notifications: duplicate suppression and cooldowns required
- Live integrations: must report real status and source freshness

## Operational notes

- Fallback data must remain visible as fallback.
- No known issue may be allowed to cause a missed duty without warning.
- Secrets stay in hosting environment variables and are not included in health output.
- Privacy controls must keep memory, location, and token state inspectable and revocable.
- Rollback must be rehearsed before final v1.0 approval.
