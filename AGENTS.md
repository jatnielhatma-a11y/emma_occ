# AGENTS.md — Emma OS

## Mission
Build Emma OS as a reliable personal operations platform. Convert roster, calendar, email, mobility, weather, and live mission data into one safe, concise next action.

## Repository rules
- Production source: `main`.
- Work on feature branches and use pull requests.
- Preserve working functionality.
- Never claim an integration is live unless connected, tested, and verified.
- Run lint, tests, and production build before completion.

## Stack
- Next.js App Router
- React
- Strict TypeScript
- Tailwind CSS
- Server components by default
- Typed provider adapters

## Fixed configuration
- Timezone: Europe/Amsterdam
- Home: Lemmerstraat 18, Almere
- Home station: Almere Centrum
- Work: Admiraal Helfrichlaan 1, Utrecht
- Work station: Utrecht Centraal
- Target arrival buffer: 10–15 minutes

## Roster rules
- The latest official roster from `no-reply@ns.nl` is the authoritative source of truth.
- A newer official roster supersedes all older Emma-managed roster entries for the same schedule period.
- Preserve unrelated personal calendar events.
- Include official duty codes in event titles; do not keep generic duplicate shift titles.
- 15:00–23:05 = Late Shift
- 23:00–07:05 next day = Night Shift
- Night Shift remains one event crossing midnight
- R, -, -- = OFF Day
- VL = Vacation
- OFF Day, Vacation, and Sick Leave do not create commute missions
- Ambiguous roster data must be reviewed, never guessed
- Revised schedules replace prior Emma-managed entries for the same period
- Do not modify unrelated calendar events

## Roster version management
- Every imported roster must have: schedule period, source email ID, source timestamp, imported timestamp, version identifier, and status.
- Valid statuses: `current`, `superseded`, `archived`, `review_required`.
- Only one roster may be `current` for a schedule period.
- When a newer official roster is accepted, mark the previous one `superseded`, replace only affected NS duties, recalculate workforce totals, and refresh commute missions.
- Maintain an audit trail of added, removed, changed, and unchanged duties.

## Roster confidence
- Every current roster must expose a `RosterConfidence` score from 0–100 plus explicit reasons.
- Suggested bands:
  - 95–100 = Green: latest official roster validated and synchronized.
  - 80–94 = Amber: official roster imported but one or more entries need attention.
  - Below 80 = Red: roster/calendar conflict, missing source data, or unresolved ambiguity.
- Confidence inputs include source authenticity, recency, completeness, parse certainty, calendar-sync success, duplicate status, and conflict status.
- Never fake precision. Store the factor breakdown and last validation timestamp.
- MOCC and WOCC must not present high-confidence operational recommendations from a Red roster.
- A Red roster requires review before new commute notifications or workforce totals are treated as authoritative.

## Workforce rules
- Standard known duty duration: 8h05m unless source data says otherwise
- Track scheduled and actual duty separately
- Track overtime and early/late relief
- Vacation hours use replaced scheduled-duty time; otherwise configurable contractual day length
- Sick calendar duration and missed scheduled-duty hours are separate metrics
- Keep sick-leave details private and minimal

## Mobility provider priority
1. NS for rail operations
2. Google Maps for walking distance/time and door-to-door estimates
3. 9292 for multimodal recovery
4. Weather for mission-impact adjustments

Preferred return services are hints only:
- Weekdays around 06:55, usually platform 1, direct Utrecht–Almere
- Weekends around 07:25, usually platform 1, direct Utrecht–Almere
Always verify live.

## Recovery routing
When direct service is unavailable, evaluate Amsterdam Zuid, Amsterdam Centraal, Weesp, Hilversum, replacement buses, 9292 options, and contingency taxi/rideshare.

## Jarvis mode
- Calm, concise, proactive
- Action first
- Notify only when action, route, risk, or confidence changes materially
- Never flood the user with raw provider data
- Never invent a platform, departure, delay, or live status

## Security
- No client-side secrets
- Least-privilege OAuth scopes
- Never log tokens or full sensitive email bodies
- Protect Gmail, Calendar, location, mission history, and sick-leave data
- External data must include provider and freshness metadata

## Architecture
Use feature modules for Mission Center, MOCC, WOCC, Roster, Workforce, Intelligence, Action Center, and Emma AI. Keep business logic pure and separate from provider adapters.

## Tests required
- Roster classification
- Overnight duration
- Duty/vacation/sick calculations
- Duplicate/revision handling
- Roster version state transitions
- Roster-confidence calculation and gating
- Calendar idempotency
- Route ranking and recovery
- Weather walking buffer
- Mission-confidence behavior

## Completion report
Include branch, commit SHA, files changed, tests, build result, limitations, credentials needed, and next recommended task.
