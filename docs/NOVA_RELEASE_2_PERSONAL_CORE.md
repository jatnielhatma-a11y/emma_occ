# NOVA Release 2 - Personal Core

## Goal

Add personal identity, privacy-first memory, interests, goals, habits, relationships, and timeline architecture while preserving Emma OCC as the active operational module.

## Scope Implemented

- Release 2 is marked active in the NOVA registry.
- Added `/personal-core` for identity, memory, and life-graph readiness.
- Added privacy-first memory rules in `src/lib/nova/personal-core.ts`.
- Updated `/platform` to show Releases 1-2 active and Releases 3-5 planned.

## Privacy Guardrails

- Memory starts disabled.
- Manual memory requires explicit memory consent.
- AI-suggested memories require separate permission.
- Memory retention is explicit.
- Release 2 does not change Emma OCC roster, commute, calendar, Gmail, NS, weather, or notification behavior.

## Verification

```bash
npm test
npm run build
```

## Release 3 Boundary

Finance, home, travel, health, and learning remain planned for Release 3.
