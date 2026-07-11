# Emma OS 1.0 — API and Integration Specification

## Integration rules
- All provider calls are server-side.
- Every response is normalized into typed domain data.
- Every live record includes provider, fetched_at, and freshness state.
- Timeouts and provider failures must degrade gracefully.
- Never label stale or mock data as live.

## Google Calendar
Purpose: read commitments and synchronize validated roster entries.

Initial scope:
- Read upcoming events.
- Create/update/delete only Emma-managed roster events.
- Preserve unrelated personal events.
- Store provider event ID and source hash.

Permissions: minimum calendar scopes required for selected calendars.

Failure handling: queue sync error as Action Item; do not create duplicates on retry.

## Gmail
Purpose: ingest approved work scheduling emails, primarily no-reply@ns.nl.

Initial scope:
- Read-only search for approved senders and roster keywords.
- Read relevant message bodies and attachments.
- Store source ID, timestamp, hash, and parse result.

Rules:
- Ignore unrelated mail.
- Do not log full sensitive bodies.
- Flag ambiguous roster content for review.
- Newer confirmed schedule version supersedes the older version for the same week.

## NS
Purpose: rail operational truth.

Data:
- journey options
- departures and arrivals
- platform and platform changes
- live delay and cancellation
- disruptions and engineering work
- replacement transport when provided

Rules:
- Prefer direct service when mission-safe.
- Verify preferred 06:55 weekday and 07:25 weekend return services live.
- Never assume timetable or platform remains permanent.

## Google Maps
Purpose: primary walking and door-to-door time calculator.

Data:
- walking route, duration, distance, pedestrian detours
- station-to-address and address-to-station legs
- optional driving/taxi comparison for contingency

Rules:
- Use current route estimate where available.
- Apply user walking-speed calibration only as a transparent adjustment.

## 9292
Purpose: public-transport cross-check and recovery planner.

Data:
- train, bus, tram, metro, mixed-mode alternatives
- replacement transport and non-NS recovery routes

Rules:
- Evaluate when NS direct service is unavailable or a multimodal option improves safe arrival.
- Normalize transfers, walking, ETA, and provider alerts.

## Weather
Purpose: operational walking-risk adjustment.

Data:
- precipitation, wind, snow/ice, storm, heat, warnings

Rules:
- Convert relevant conditions into walking buffer and risk reasons.
- Do not over-alert for minor conditions with no mission impact.

## Notifications
Purpose: Jarvis-style action alerts.

Channels: in-app first; prepare for push and voice.

Notify only when:
- leave/arrival recommendation changes
- route or platform changes
- risk materially changes
- mission may miss target
- roster/calendar sync needs action
- important approved work email needs action

## Provider arbitration
- NS owns rail operational facts.
- Google Maps owns walking-route calculations.
- 9292 provides multimodal recovery comparison.
- Weather provider owns weather facts.
- Emma decision engine ranks normalized options but does not rewrite provider facts.

## Error taxonomy
AUTH_REQUIRED, RATE_LIMITED, TIMEOUT, PROVIDER_UNAVAILABLE, INVALID_RESPONSE, STALE_DATA, PARSE_AMBIGUOUS, SYNC_CONFLICT, NOT_CONFIGURED.

## Mock/live contract
Each adapter must implement the same typed interface in mock and live modes. UI must visibly identify mode and last successful refresh.
