# NOVA Phase 3

## Scope

Phase 3 adds optional browser GPS, saved location geofences, location confidence logic, commute progress state, and planned-versus-actual arrival storage.

## Implemented

- Browser GPS panel with explicit NOVA location enable/disable.
- Saved default locations for Home, Work, Almere Centrum, and Utrecht Centraal.
- Ability to bind the current GPS point to a saved location.
- Server-side geofence classification without storing raw GPS history by default.
- Coarse location events with confidence, accuracy, route phase, and source.
- Commute mission state with current phase, latest coarse location, confidence, actual departure, and actual arrival.
- Mission Control now shows latest location and commute phase.
- Commute page now shows GPS controls, saved geofence readiness, mission progress, recent coarse events, and NS route reference.

## Privacy Model

- Browser GPS is only requested after a user action.
- NOVA server-side location processing requires the user's location setting to be enabled.
- Raw browser coordinates are used for classification but are not stored in `location_events`.
- `location_events` stores coarse labels, accuracy, confidence, route phase, and non-coordinate metadata.
- Raw coordinates are only stored when the user explicitly binds a current GPS point to a saved location.

## Supabase Migration

Applied migration:

- `phase3_gps_geofencing`

Local migration file:

- `supabase/migrations/20260712023000_phase3_gps_geofencing.sql`

New or extended tables:

- `commute_missions`
- `location_events.commute_mission_id`
- `location_events.route_phase`

## Verification

- Unit tests cover geofence distance, nearest match, confirmed entry, and commute phase inference.
- Full test suite passes.
- TypeScript passes.
- Lint passes.
- Production build passes without warnings.
