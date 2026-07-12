# NOVA Release 4 - Intelligence and Automation

## Scope

Release 4 activates NOVA intelligence without changing Emma OCC operational behavior. It adds a reviewable intelligence layer for:

- Predictions
- Recommendations
- Context signals
- Automation-rule candidates
- Daily AI routines

## Privacy and Safety Boundaries

- Recommendations are advisory records, not silent actions.
- Automation is disabled by default.
- Automation rules must require confirmation.
- Calendar, notification, commute, email, and memory changes remain user-confirmed.
- Daily AI uses verified JSON context and the existing OpenAI Responses API path with `store=false`.
- Fallback and unavailable sources stay labeled before they can inform recommendations.

## Supabase

Release 4 adds `public.nova_intelligence_records` with:

- User-scoped `user_id`
- Row-level security enabled
- A single authenticated ownership policy using `(select auth.uid()) = user_id`
- Explicit authenticated grants for Data API access
- A database check that automation rules require confirmation

## Verification

Run:

```bash
pnpm audit --audit-level low
pnpm test
pnpm test:e2e
pnpm typecheck
pnpm lint
pnpm build
```

## Release Gate

Release 4 is complete when the new intelligence page, API, migration, tests, and documentation pass verification. Release 5 capabilities remain planned.
