# NOVA Release 3 - Life Domains

## Goal

Add finance, home, travel, health, and learning as structured personal domains while preserving Emma OCC operations and the Release 2 privacy model.

## Scope Implemented

- Release 3 is marked active in the NOVA registry.
- Added `/life-domains` for finance, home, travel, health, and learning readiness.
- Added shared life-domain readiness and privacy notes in `src/lib/nova/life-domains.ts`.
- Updated `/platform` to show Releases 1-3 active and Releases 4-5 planned.
- Added tests for domain readiness and privacy boundaries.

## Privacy and Safety Boundaries

- Finance stores planning metadata only. No bank connection is active in Release 3.
- Health records are sensitive personal notes and are not medical advice.
- Travel records do not alter Emma OCC commute planning in Release 3.
- Future recommendations can use this context only after explicit review.

## Verification

```bash
npm test
npm run build
```

## Release 4 Boundary

Prediction, recommendations, context automation, and Daily AI remain planned for Release 4.
