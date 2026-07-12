# NOVA Release 4 - Intelligence and Automation

## Scope

Release 4 activates the advisory intelligence layer while preserving Emma OCC as the active mission-control module.

It covers:

- Predictions
- Recommendations
- Context signals
- Automation-rule candidates
- Daily AI routines

## Guardrails

- Recommendations are advisory records, not silent actions.
- Automation is disabled by default.
- Automation rules require confirmation.
- Calendar, notification, commute, email, and memory changes remain user-confirmed.
- Daily AI uses verified context and deterministic fallback.
- Release 5 remains planned.

## Verification

Run:

```bash
npm audit --audit-level=low
npm test
npm run build
```
