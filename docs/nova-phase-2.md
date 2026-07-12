# NOVA Phase 2

## Scope

Phase 2 implements the identity, Google, and data foundation for NOVA.

- Google OAuth now uses `/api/auth/google/start`, `/api/auth/google/callback`, `/api/auth/google/status`, and `/api/auth/google/disconnect`.
- OAuth state is validated with a hashed state cookie and PKCE verifier.
- Google Calendar and Gmail service status are separated. Gmail is read-only.
- Google tokens support encrypted storage with `GOOGLE_TOKEN_ENCRYPTION_KEY`.
- Existing `/api/google/connect` and `/api/google/callback` routes remain as compatibility redirects.
- Settings now persist profile language, route preferences, notification preferences, location preferences, and privacy settings.
- Supabase now includes saved-location, geofence, coarse location-event, and integration-metadata tables for later phases.

## Environment Variables

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_TOKEN_ENCRYPTION_KEY`
- `GOOGLE_CALENDAR_ID`

`GOOGLE_TOKEN_ENCRYPTION_KEY` may be a 64-character hex key, a 32-byte base64 key, or a strong passphrase that NOVA hashes to an AES-256 key. If it is not set yet, NOVA derives the token-encryption key from the server-only `SUPABASE_SERVICE_ROLE_KEY` so reconnects do not fall back to plaintext storage.

## Google Scopes

- Calendar event sync: `https://www.googleapis.com/auth/calendar.events`
- Gmail read-only foundation: `https://www.googleapis.com/auth/gmail.readonly`
- Identity: `openid email profile`

Gmail content is not displayed or sent to AI in Phase 2.

## Supabase Migration

Applied migration:

- `phase2_identity_google_data`

Local migration file:

- `supabase/migrations/20260712013000_phase2_identity_google_data.sql`

New or extended data areas:

- `profiles.preferred_language`
- `user_settings.preferred_language`
- `user_settings.route_preferences`
- `user_settings.location_preferences`
- `user_settings.privacy_settings`
- `google_calendar_connections.*_encrypted`
- `google_calendar_connections.connected_services`
- `saved_locations`
- `geofences`
- `location_events`
- `integration_metadata`

All new user-owned tables have RLS enabled with authenticated self-owned policies.

## Verification

- Unit tests cover Google PKCE URL creation, scope detection, and token encryption.
- Full test suite passes.
- TypeScript passes.
- Lint passes.
- Production build passes without warnings.
