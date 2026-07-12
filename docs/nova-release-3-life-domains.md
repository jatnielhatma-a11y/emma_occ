# NOVA Release 3 - Life Domains

## Goal

Add finance, home, travel, health, and learning as structured personal domains while preserving Emma OCC operations and the Release 2 privacy model.

## Implementation

- Release 3 is marked active in the NOVA module registry.
- Added `/life-domains` for finance, home, travel, health, and learning records.
- Added a shared life-domain schema and readiness helper in `lib/nova/life-domains.ts`.
- Added `POST /api/life-domains` for authenticated manual record capture and archiving.
- Added Supabase migration `20260712080000_release3_life_domains.sql`.
- Added navigation labels in EN/ES/FR.
- Added tests for domain validation, readiness, and privacy boundary notes.

## Privacy and Safety Boundaries

- Finance stores planning metadata only. No bank connection is active in Release 3.
- Health records are sensitive personal notes and are not medical advice.
- Travel records do not alter Emma OCC commute planning in Release 3.
- All records are manually captured, user-scoped, and protected by RLS.
- Future recommendations can use this context only after explicit review.

## Supabase Migration

Run:

```text
supabase/migrations/20260712080000_release3_life_domains.sql
```

The migration enables RLS, adds authenticated-role grants for Data API access, and scopes every row by `user_id`.

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

## Release 4 Boundary

Prediction, recommendations, context automation, and Daily AI remain planned for Release 4. Release 3 only structures life-domain context.
