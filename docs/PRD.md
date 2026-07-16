# Emma OS 1.0 — Product Requirements Document

## Product mission
Emma OS is a personal operations platform that converts roster, calendar, email, mobility, weather, and live mission data into one clear next action.

## Primary user
Jay, logistics planner and shift worker commuting between Almere and Utrecht.

## Core outcomes
- Accurately interpret weekly work rosters.
- Treat the latest official `no-reply@ns.nl` roster as the single source of truth.
- Synchronize validated roster data to Google Calendar without duplicates.
- Maintain roster versions, audit history, and confidence status.
- Calculate scheduled and actual duty time, overtime, early relief, vacation, sick leave, and commute time.
- Plan and monitor door-to-door commute missions.
- Recover automatically when direct rail service is unavailable.
- Deliver concise Jarvis-style briefings only when action is relevant.

## Control centers
### Mission Center
Shows today, next duty, current mission phase, countdown, ETA, buffer, risk, confidence, and next action.

### MOCC — Mobility Operations Control Center
Combines NS, Google Maps, 9292, weather, frequent routes, and live user updates to select the best route and recovery plan.

### WOCC — Workforce Operations Control Center
Manages roster ingestion, duty classification, roster versions, calendar synchronization, weekly/monthly/yearly hours, vacation, sick leave, overtime, and attendance metrics.

### Intelligence Center
Stores mission history and produces operational analytics, including planned versus actual performance.

### Emma AI
Acts as the decision layer. It prioritizes safety, time-critical action, work commitments, commute risk, weather, important work email, and personal reminders.

## Fixed operating rules
- Timezone: Europe/Amsterdam.
- Home: Lemmerstraat 18, Almere.
- Home station: Almere Centrum.
- Work: Admiraal Helfrichlaan 1, Utrecht.
- Work station: Utrecht Centraal.
- Late Shift: 15:00–23:05.
- Night Shift: 23:00–07:05 next day; preserve as one overnight event.
- R, -, --: OFF Day.
- VL: Vacation.
- OFF Day, Vacation, and Sick Leave never create commute missions.
- Target arrival buffer: 10–15 minutes.

## Roster source-of-truth policy
- The newest official roster received from `no-reply@ns.nl` is authoritative for its schedule period.
- Older official versions become superseded and must no longer drive calendar, commute, or workforce calculations.
- Importing a revision replaces only Emma-managed NS roster events in the affected period.
- Personal appointments, reminders, travel, and unrelated calendar events remain untouched.
- Calendar duty titles must include the official duty code where available.
- Generic duplicate titles must be removed when a code-correct official duty exists.

## Roster Version Manager
Every roster record must include:
- schedule week or covered period
- source email ID
- source sent timestamp
- import timestamp
- version identifier
- status: Current, Superseded, Archived, or Review Required
- parser version
- change summary
- audit events

Only one roster may be Current for a schedule period. When a newer version is accepted, the old version becomes Superseded, affected calendar duties are reconciled idempotently, and all workforce and MOCC outputs are recalculated.

## Roster Confidence
Emma OS must calculate a Roster Confidence score from 0–100 with a factor breakdown and last-validated timestamp.

Suggested bands:
- 95–100: Green — official, complete, conflict-free, and synchronized.
- 80–94: Amber — official but contains a limited issue requiring attention.
- Below 80: Red — unresolved conflict, missing source data, failed sync, or ambiguous parsing.

Confidence factors:
- approved sender/authenticity
- source recency and version ordering
- date and time completeness
- duty-code recognition
- parsing certainty
- duplicate detection
- overlap/conflict detection
- calendar synchronization success
- reconciliation against the active schedule period

Red confidence must block authoritative MOCC commute notifications and final workforce totals until reviewed. Amber may proceed only with the uncertainty clearly surfaced. Never display false precision; explain the factors driving the score.

## Workforce requirements
Track scheduled duty, actual duty, late-shift hours, night-shift hours, overtime, early/late relief, OFF days, vacation days/hours, sick-leave days/hours, missed scheduled duty hours, commute hours, and weekly/monthly/yearly totals.

## Mobility requirements
Source priority:
1. NS for rail truth.
2. Google Maps for walking and door-to-door timing.
3. 9292 for multimodal recovery.
4. Weather for walking-risk adjustments.

Preferred return services are treated as defaults only and must be live-verified:
- Weekdays: around 06:55 from Utrecht Centraal, usually platform 1, direct to Almere Centrum.
- Weekends: around 07:25 from Utrecht Centraal, usually platform 1, direct to Almere Centrum.

## Recovery policy
When the direct route fails, evaluate alternatives through Amsterdam Zuid, Amsterdam Centraal, Weesp, Hilversum, replacement bus, 9292 multimodal options, and taxi/rideshare when public transport cannot meet the mission objective.

## Jarvis behavior
- Action first.
- Calm and concise.
- No irrelevant details.
- Notify only when action, route, risk, roster confidence, or mission confidence changes materially.

## Success metrics
- Roster classification accuracy.
- Zero duplicate calendar events.
- Correct roster version transitions.
- Roster-confidence calibration and issue detection.
- On-time arrival rate.
- ETA accuracy.
- Mission-confidence calibration.
- Duty/vacation/sick-leave calculation accuracy.
- Recovery-route time saved.

## Delivery phases
1. Architecture Lock.
2. Roster and Workforce Intelligence.
3. Google Workspace integration.
4. MOCC live integrations.
5. Jarvis notifications.
6. Analytics and learning.
