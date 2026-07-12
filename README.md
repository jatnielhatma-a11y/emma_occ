# Emma OCC v4.1

Operational core for roster, commute execution, weather risk, Gmail attention items, and decision support.

## NOVA Release 1 Foundation

Emma OCC is preserved as the active operations module inside the NOVA personal operating system foundation. Release 1 adds a module registry, roadmap guardrails, and a `/platform` readiness surface while keeping later releases planned only.

See `docs/NOVA_RELEASE_1_FOUNDATION.md` for the audit, architecture notes, and merge checklist.

## NOVA Release 2 Personal Core

Release 2 adds the `/personal-core` readiness surface for personal identity, opt-in memory, interests, goals, habits, relationships, and timeline architecture. Memory is disabled by default and AI-suggested memories require separate permission.

See `docs/NOVA_RELEASE_2_PERSONAL_CORE.md` for privacy guardrails and verification notes.

## NOVA Release 3 Life Domains

Release 3 adds the `/life-domains` readiness surface for finance, home, travel, health, and learning architecture. The domain layer is manual, privacy-labeled, and does not connect banks, diagnose health, or change Emma OCC commute behavior.

See `docs/NOVA_RELEASE_3_LIFE_DOMAINS.md` for boundaries and verification notes.

## NOVA Release 4 Intelligence and Automation

Release 4 adds the `/intelligence` readiness surface for predictions, recommendations, context signals, automation-rule candidates, and Daily AI routines. Automation remains disabled by default and requires explicit confirmation before any operational action.

See `docs/NOVA_RELEASE_4_INTELLIGENCE_AUTOMATION.md` for boundaries and verification notes.

## NOVA Release 5 NOVA Intelligence

Release 5 adds the `/nova-intelligence` readiness surface for multi-device sync, voice, vision, collaboration, developer platform boundaries, and NOVA Intelligence orchestration. Voice and vision stay consent-gated, local-only records cannot sync, and developer access requires scoped privacy controls.

See `docs/NOVA_RELEASE_5_NOVA_INTELLIGENCE.md` for boundaries and verification notes.

## What works now

- Mobile-first Next.js PWA dashboard
- Server-side `/api/ops` aggregation endpoint
- Roster classification for Late Shift, Night Shift, OFF Day, and Vacation
- Google Maps Routes API walking calculations when configured
- NS journey, platform, delay, and cancellation integration when configured
- Live no-key weather integration using Open-Meteo
- Google Calendar and Gmail OAuth integration when configured
- Explicit fallback mode when credentials are unavailable
- Five-minute dashboard refresh
- Green/Amber/Red risk and mission-confidence logic

## Vercel environment variables

Copy `.env.example` into Vercel Project Settings -> Environment Variables.

- `GOOGLE_ACCESS_TOKEN`: OAuth access token with Calendar and Gmail scopes
- `GOOGLE_CALENDAR_ID`: normally `primary`
- `GOOGLE_MAPS_API_KEY`: server-side Routes API key
- `NS_API_KEY`: NS Reisinformatie API subscription key
- `NS_TRIPS_BASE_URL`: optional override
- `GMAIL_QUERY`: optional Gmail search query

## Commands

```bash
npm install
npm run build
npm start
```

## Security

All credentials are server-only. Do not prefix secrets with `NEXT_PUBLIC_`.

## Data behavior

Live providers are used when credentials are configured. If a provider is unavailable, Emma OCC clearly labels the source as fallback and keeps the dashboard operational instead of crashing.
