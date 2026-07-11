# Emma OS 1.0 — System Architecture

## Architecture principles
- Next.js App Router with strict TypeScript.
- Server components by default; client components only for interactivity.
- External integrations behind typed adapters.
- Pure business rules separated from provider code.
- Mock, demo, and live modes.
- No secrets or sensitive data in client bundles.
- Every external fact carries source and freshness metadata.

## High-level flow
Email/Calendar/Manual Input → Validation → Domain Models → Decision Engine → Dashboard/Notifications → Mission History/Analytics.

## Modules
### Core Platform
Authentication, settings, feature flags, integration registry, notification engine, audit logging, and PWA shell.

### Mission Center
Builds a single current operational picture from roster, calendar, mobility, and action items.

### WOCC
Roster ingestion, classification, revision control, calendar sync, duty calculations, vacation, sick leave, attendance, and workforce summaries.

### MOCC
Door-to-door routing, live monitoring, route ranking, recovery, contingency, weather adjustment, and mission confidence.

### Intelligence Center
Mission event storage, operations replay, KPI calculation, trend analysis, and personalization.

### Emma AI
Produces structured operational decisions and concise briefings. It must never invent live facts.

## Suggested source structure
- src/app
- src/components
- src/features/mission-center
- src/features/mocc
- src/features/wocc
- src/features/roster
- src/features/workforce
- src/features/intelligence
- src/features/action-center
- src/features/emma-ai
- src/lib/integrations
- src/lib/domain
- src/lib/security
- src/lib/validation
- src/lib/database
- src/types
- src/tests

## Plugin contract
Each provider adapter exposes:
- provider metadata
- configuration validation
- health/status check
- typed request/response methods
- source timestamp
- normalized errors
- retry policy
- mock implementation

Initial plugins:
- Google Calendar
- Gmail
- NS
- Google Maps
- 9292
- Weather
- Notifications

## Decision engine
Inputs:
- active duty or commitment
- current mission phase
- route options
- live disruptions
- walking times
- weather risk
- user preferences
- historical performance

Outputs:
- recommended action
- selected route
- fallback route
- risk state
- confidence band
- reasons
- next reevaluation trigger

## Operating modes
- Normal: preferred route viable.
- Recovery: primary route disrupted; viable alternative selected.
- Contingency: major disruption; all modes compared.
- Predictive: risk detected before departure.

## Data ownership
- Google Calendar: operational calendar source.
- Roster source record: audit source for imported duties.
- Emma database: normalized operational history and analytics.
- Provider APIs: live truth only for their own domain.

## Security
- OAuth tokens encrypted at rest.
- Least-privilege scopes.
- Read only approved work-email sources.
- Never log token values, full sensitive email bodies, precise location history, or medical details.
- Sick-leave data receives restricted access and minimal retention.

## Reliability
- Idempotent roster imports.
- Stable external IDs for calendar events.
- Revision-aware schedule replacement.
- Provider timeout and fallback behavior.
- No live badge unless provider status and freshness are verified.
- Graceful degradation to last confirmed data with visible timestamp.

## Deployment
- GitHub main is production source of truth.
- Feature branches and pull requests for every change.
- Vercel production deployment from main.
- Required checks: lint, tests, and production build.
