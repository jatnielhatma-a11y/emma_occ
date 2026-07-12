# NOVA Phase 4

Phase 4 adds route intelligence for the commute workflow.

## What changed

- Added `commute_route_snapshots` for saved route checks.
- Added a server-side Google Routes adapter for road and cycling estimates.
- Added a server-side NS API adapter for rail trip status, platform changes, delays, and cancellations.
- Added `/api/commute/plan`, which builds a commute plan, stores a snapshot, and updates the active mission reference.
- Upgraded the Commute page with a refreshable route intelligence panel.
- Replaced the Traffic placeholder with a snapshot-based traffic and provider review page.

## Live data rules

NOVA only labels route data as live when the server has a provider key and receives a successful live provider response. Without keys, it falls back to planner links and recent public references.

Required optional keys:

- `GOOGLE_MAPS_API_KEY`
- `NS_API_KEY`
- `NS_API_BASE_URL`
- `GOOGLE_ROUTES_BASE_URL`

The keys are server-side only. Do not expose them with `NEXT_PUBLIC_`.
