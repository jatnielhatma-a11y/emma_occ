# NOVA Release 1 - Foundation

## Goal

Transform the existing Emma OCC dashboard into the foundation of a modular, AI-powered personal operating system while preserving Emma OCC as the active operational control module.

## Audit

- The existing application is a Next.js App Router dashboard backed by Supabase.
- Emma OCC already contains operational duty, commute, weather, calendar, Gmail, GPS, geofencing, notification, and AI brief surfaces.
- Supabase migrations, RLS, Google OAuth, live route planning, health checks, and production hardening documentation already exist from earlier phases.
- The current local folder is not a git repository, so a real feature branch and pull request cannot be created from this workspace until it is initialized or connected to a remote repository.

## Release 1 Implementation

Release 1 adds a NOVA foundation layer without activating later roadmap features:

- Added a central module and release registry in `lib/nova/modules.ts`.
- Added foundation readiness helpers in `lib/nova/foundation.ts`.
- Added a protected Platform page at `/platform`.
- Added desktop and mobile navigation to the Platform page.
- Added EN/ES/FR navigation labels.
- Added tests that verify Emma OCC remains active, later releases remain planned, and foundation capabilities are represented.

## Preserved Emma OCC

Emma OCC remains the active operational module for:

- Mission Control dashboard
- Roster and duty accounting
- Sick leave and vacation accounting
- Google Calendar
- Gmail
- Google Maps
- NS commute reference
- Weather
- GPS and geofencing
- Notifications

## Roadmap Guardrails

The following releases are represented as planned only:

- Release 2: Personal identity, privacy-first memory, interests, goals, habits, relationships, timeline.
- Release 3: Finance, home, travel, health, learning.
- Release 4: Prediction, recommendations, context, automation, daily AI.
- Release 5: Multi-device sync, voice, vision, collaboration, developer platform, NOVA Intelligence.

The privacy-first memory engine is intentionally not active in Release 1. It must remain opt-in, inspectable, revocable, and source-attributed before activation.

## Pull Request Preparation

When the project is connected to git, use this flow:

```bash
git checkout -b feature/nova-release-1-foundation
git add app components docs lib messages tests
git commit -m "Add NOVA Release 1 foundation architecture"
git push -u origin feature/nova-release-1-foundation
```

Open the PR against `main` with this title:

```text
NOVA Release 1: Foundation architecture
```

Recommended PR checklist:

- Emma OCC remains accessible and unchanged as the active operations module.
- `/platform` shows Release 1 as active and Releases 2-5 as planned.
- No future release product features are activated.
- `npm test` passes.
- `npm run build` passes.
- Supabase and OAuth secrets remain in environment variables only.
