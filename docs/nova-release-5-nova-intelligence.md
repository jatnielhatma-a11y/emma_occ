# NOVA Release 5 - NOVA Intelligence

## Scope

Release 5 completes the NOVA roadmap with a consent-gated platform layer:

- Multi-device sync
- Voice
- Vision
- Collaboration
- Developer platform
- NOVA Intelligence

## Guardrails

- Emma OCC remains the active mission-control operations module.
- Voice is explicit-session only; there is no always-listening mode.
- Vision uses user-submitted media and reviewable extraction only.
- Collaboration is family-scoped and private memory remains private by default.
- Developer extensions require explicit scopes and cannot receive service-role secrets.
- NOVA Intelligence coordinates approved Release 1-4 context without bypassing consent gates.

## Supabase

Release 5 adds `public.nova_capability_records` with:

- User-scoped `user_id`
- Row-level security enabled
- An authenticated ownership policy using `(select auth.uid()) = user_id`
- Explicit authenticated grants for Data API access
- Database checks for voice/vision consent, developer scoping, and disabled sync

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
