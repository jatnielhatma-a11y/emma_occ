# NOVA Release 5 - NOVA Intelligence

## Scope

Release 5 completes the NOVA roadmap while preserving Emma OCC as the active mission-control module.

It covers:

- Multi-device sync
- Voice readiness
- Vision readiness
- Collaboration readiness
- Developer platform readiness
- NOVA Intelligence orchestration

## Guardrails

- Emma OCC remains preserved and active.
- Phone, desktop, and installed PWA sync must respect local-only records.
- Voice and vision are consent-gated.
- Collaboration requires invite scopes and auditability.
- Developer platform records require developer-scoped privacy mode.
- NOVA Intelligence may recommend actions, but operational writes still require confirmation.
- Privacy labels and source boundaries remain visible before AI context is used.

## Verification

Run:

```bash
npm audit --audit-level=low
npm test
npm run build
```
