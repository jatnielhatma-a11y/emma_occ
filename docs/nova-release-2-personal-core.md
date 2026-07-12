# NOVA Release 2 - Personal Core

## Goal

Add user-controlled personal identity, privacy-first memory, interests, goals, habits, relationships, and a timeline while preserving Emma OCC as the operational control module.

## Implementation

- Release 2 is now marked active in the NOVA module registry.
- Added the Personal Core page at `/personal-core`.
- Added profile capture for preferred name, family context, language, and timezone.
- Added memory consent controls with memory disabled by default.
- Added manual capture for interests, goals, habits, relationships, timeline events, and memories.
- Added Supabase tables for personal profile, memory settings, memory items, interests, goals, habits, relationships, and timeline events.
- Added RLS policies for every new table.
- Added tests for memory consent, AI-suggested memory gating, readiness counts, and table routing.

## Privacy Guardrails

- Memory starts disabled.
- Manual memories require explicit memory consent.
- AI-suggested memories require a separate permission.
- Memory records include source kind and tags.
- Personal-core records are scoped by `user_id` and protected by Supabase RLS.
- Emma OCC duty, commute, calendar, Gmail, NS, weather, GPS, and notification behavior remains unchanged.

## Supabase Migration

Run this migration before using the page in production:

```text
supabase/migrations/20260712070000_release2_personal_core.sql
```

## Verification

Required gates:

```bash
npm test
npm run build
```

Recommended gates:

```bash
npm run test:e2e
npm run lint
npm run typecheck
```

## Release 3 Boundary

Finance, home, travel, health, and learning remain planned for Release 3. Release 2 only creates the personal identity, privacy, and life-graph foundation those modules can build on later.
