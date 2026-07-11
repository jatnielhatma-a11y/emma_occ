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
- 15:00–23:05 = Late Shift
- 23:00–07:05 next day = Night Shift
- Night Shift remains one event crossing midnight
- R, -, -- = OFF Day
- VL = Vacation
- OFF Day, Vacation, and Sick Leave do not create commute missions
- Ambiguous roster data must be reviewed, never guessed
- Revised schedules replace prior Emma-managed entries for the same period
- Do not modify unrelated calendar events

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
- Calendar idempotency
- Route ranking and recovery
- Weather walking buffer
- Mission-confidence behavior

## Completion report
Include branch, commit SHA, files changed, tests, build result, limitations, credentials needed, and next recommended task.
