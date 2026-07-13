# Emma OCC Dashboard v3

Professional operations control dashboard for airline/rail-style roster monitoring, duty classification, conflict detection, and calendar-ready schedule management.

## NOVA Release 1 Foundation

Emma OCC is now preserved as the active operations module inside the NOVA personal operating system foundation. Release 1 adds a module registry, roadmap guardrails, and a protected Platform page at `/platform` while keeping later releases planned only.

See `docs/nova-release-1-foundation.md` for the audit, architecture notes, and PR checklist.

## NOVA Release 2 Personal Core

Release 2 adds the protected `/personal-core` surface for personal identity, opt-in memory consent, interests, goals, habits, relationships, and timeline capture. Memory is disabled by default and AI-suggested memories require separate permission.

See `docs/nova-release-2-personal-core.md` for the implementation notes, Supabase migration, and privacy guardrails.

## NOVA Release 3 Life Domains

Release 3 adds `/life-domains` for finance, home, travel, health, and learning records. The domain layer is manual, user-scoped, and privacy-labeled; it does not connect banks, diagnose health, or change Emma OCC commute behavior.

See `docs/nova-release-3-life-domains.md` for the implementation notes, Supabase migration, and Release 4 boundary.

## NOVA Release 4 Intelligence and Automation

Release 4 adds `/intelligence` for predictions, recommendations, context signals, automation-rule candidates, and Daily AI routines. Automation remains disabled by default and requires explicit confirmation before any operational action.

See `docs/nova-release-4-intelligence-automation.md` for the implementation notes, Supabase migration, and Release 5 boundary.

## NOVA Release 5 NOVA Intelligence

Release 5 adds `/nova-intelligence` for multi-device sync, voice, vision, collaboration, developer-platform readiness, and unified NOVA Intelligence. Capabilities are consent-gated, scoped, and private by default.

See `docs/nova-release-5-nova-intelligence.md` for the implementation notes, Supabase migration, and platform guardrails.

## NOVA Release 6 Production Readiness

Release 6 adds `/production-readiness` for release gates, live integration health, fallback verification, notification safety, rollback posture, privacy controls, and planned-versus-actual commute accuracy. It keeps NOVA honest as a launch candidate without declaring v1.0 ready while manual launch gates remain open.

See `docs/nova-release-6-production-readiness.md` for the implementation notes, Supabase migration, and launch guardrails.

## NOVA Release 7 Production Hardening and Launch

Release 7 turns the launch surface into final production certification. It tracks automated tests, production build, e2e gates, live integration health, fallback behavior, notifications, security, privacy, rollback rehearsal, real-device/PWA checks, accessibility, performance, backup recovery, release notes, and production deployment status.

See `docs/nova-release-7-production-launch.md` for the launch checklist, deployment notes, and v1.0 release gate.

## NOVA Release 8 Post-launch Optimization

Release 8 adds `/optimization` for real-world feedback loops, commute accuracy learning, duty-risk forecasting, proactive daily planning, memory recommendation review, mobile/PWA polish, privacy tuning, family-context refinement, and monitoring noise reduction. It keeps recommendations advisory and blocks silent automation.

See `docs/nova-release-8-post-launch-optimization.md` for the optimization guardrails and storage notes.

## NOVA Release 9 Mission Voice and Autonomous Intelligence

Release 9 adds `/mission-intelligence` and a dashboard voice panel for a JARVIS-style, push-to-talk command layer. It can route daily brief, duty, commute, calendar, alerts, settings, privacy, and optimization commands while keeping transcripts unstored and external actions approval-gated.

See `docs/nova-release-9-mission-intelligence.md` for the voice guardrails and command-routing notes.

## Phase 1 Scope

Built in this phase:

- Supabase schema for profiles, rosters, imports, duties, calendar sync logs, commute settings, conflict logs, AI queries, and user settings.
- Row-level security policies so every table is scoped to the authenticated user.
- Login and registration screens using Supabase Auth.
- Protected dashboard routes with an OCC-style sidebar and mobile navigation.
- Dashboard panels for today's duty, next duty, weekly overview, roster counts, import status, conflict status, and Emma AI placement.
- Roster import flow for CSV, Excel, text-based PDF, and validated image uploads.
- Shared roster engine for duty labeling, overnight handling, OFF day detection, conflict detection, import comparison, and calendar idempotency fingerprints.
- Demo CSV, optional seed SQL, and basic tests for roster rules.

Image OCR, Google Calendar OAuth/writeback, editable settings controls, and the live Emma AI endpoint are intentionally staged for the next phases.

## Phase 2 Scope

Added in phase 2:

- Google Calendar OAuth start/callback routes.
- Calendar sync planning and writeback endpoint for duties and commute blocks.
- Duplicate-safe event keys stored in Google Calendar private extended properties and Supabase sync logs.
- Amsterdam-time calendar payloads for roster duties, commute blocks, and all-day OFF events.
- Editable commute buffer settings.
- Emma AI chat panel backed only by roster and conflict data, with an OpenAI Responses API path when `OPENAI_API_KEY` is configured and a deterministic fallback when it is not.
- Live demo support for weather, NS status, and read-only session calendar data.
- Editable Sick-leave / SL duty marking, fixed 8h05m duty accounting, and vacation totals up to the current day.

## Phase 3 Scope

Added in phase 3:

- Roster screenshot/image OCR through the OpenAI Responses API when `OPENAI_API_KEY` is configured.
- Manual pasted roster text import for OCR fallback and copied roster data.
- Structured OCR prompt that converts roster screenshots into the standard roster CSV fields.
- Calendar sync preview showing create/update action, event color, time window, and event summary before sync.
- Google Calendar color mapping for night, late, OFF, custom, and commute events.
- NS live reference as a commute source, attached to commute blocks and visible in settings/sync preview.
- NS commute alert checks for configured home/work stations, platform-change language, disruption/works language, and unavailable status checks.
- Ranked live commuting options that prefer NS when the route is clear, then lift 9292 and Google Transit alternatives when NS needs attention.
- Hourly Google Calendar refresh through Vercel Cron and an actual live Amsterdam-time clock on the dashboard.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add Supabase keys:

   ```bash
   cp .env.example .env.local
   ```

3. In Supabase, run:

   ```text
   supabase/schema.sql
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`, register, then import `data/demo-roster.csv`.

## Supabase Notes

- `profiles`, `user_settings`, and `commute_settings` are created automatically when a new Supabase Auth user signs up.
- Commute settings support manual buffers or NS live reference mode.
- The live commute card compares NS planner links, 9292 public transport, Google Transit, driving, and cycling routes for both work and home directions. Door-to-door Google route links can use full home/work addresses while NS alerts stay station-based.
- All operational data tables include `user_id` and RLS policies using `auth.uid()`.
- Each duty belongs to a user and an import batch through `import_id`.
- The import API stores the comparison summary before calendar sync, so users can confirm changes in a later phase.

## Roster Import Rules

- `23:00-07:05` becomes `Night Shift`.
- `15:00-23:05` becomes `Late Shift`.
- `-`, `Rest`, or an empty duty becomes `OFF Day`.
- Any duty whose end time is before or equal to its start time is treated as overnight.
- The original duty code is preserved separately from the derived duty label.

## Verification

Run the roster logic tests:

```bash
npm test
```

When dependencies are installed, also run:

```bash
npm run typecheck
npm run build
```

## Deployment

The app is Vercel-ready. Production deployments need these environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
OPENAI_OCR_MODEL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
NEXT_PUBLIC_APP_URL
APP_TIMEZONE
CRON_SECRET
```

`CRON_SECRET` is recommended for protecting the hourly calendar refresh endpoint. Vercel Cron will call `/api/cron/calendar-sync` every hour.

Optional local-only demo variables:

```text
DEMO_LOGIN_EMAIL
DEMO_LOGIN_PASSWORD
LIVE_DEMO_CALENDAR_JSON
WEATHER_LOCATION
COMMUTE_HOME_ADDRESS
COMMUTE_WORK_ADDRESS
NS_HOME_STATION
NS_WORK_STATION
```

Do not store private calendar snapshots in project files. Use OAuth-backed calendar access for production.

## Next Phase

Recommended next build slice:

- Production OAuth setup with real Supabase, Google, and OpenAI environment variables.
- Deployment after explicit production approval.
- Manual duty-label editing and richer schedule table views.
