# NOVA Release 8 - Post-launch Optimization

Release 8 turns NOVA into a learning production system without removing human control. It improves daily usefulness from observed outcomes, user feedback, provider freshness, and verified operational signals.

## Scope

- Real-world usage feedback loop
- Commute prediction accuracy learning
- Duty-risk forecasting
- Memory recommendation review
- Proactive daily planning refinement
- Mobile and installed PWA polish
- Privacy controls refinement
- Family context tuning
- Monitoring noise reduction

## Guardrails

- No silent automation is enabled in Release 8.
- Recommendations remain advisory until the user confirms an external action.
- Personal-data optimization requires privacy review.
- High-impact fallback data cannot drive optimization without source verification.
- Feedback records should store labels, summaries, and evidence references instead of raw email bodies, raw calendar notes, full location history, provider secrets, or private memory content.

## Implementation

Release 8 adds:

- `lib/nova/post-launch-optimization.ts`
- `/optimization`
- Roadmap registry entries in `lib/nova/modules.ts`
- Navigation labels in EN, ES, and FR
- Supabase migration `20260713012654_release8_post_launch_optimization.sql`
- Tests in `tests/nova-post-launch-optimization.test.mjs`

## Storage Notes

The migration creates user-owned tables for optimization feedback and tuning records. Row-level security is enabled, policies use `(select auth.uid()) = user_id`, and authenticated grants are explicit for Data API access.

## Release Boundary

Release 8 is a post-launch refinement layer. It does not declare NOVA fully autonomous, and it does not bypass Release 2 memory consent, Release 4 automation approval, or Release 7 launch safety gates.
