# NOVA Release 7 - Production Hardening and Launch

## Scope

Release 7 is the final launch-hardening layer. It is allowed to deploy NOVA to production, but it must not declare NOVA v1.0 final-ready until all automated and manual gates are complete.

It covers:

- Automated tests
- Production build
- End-to-end flows
- Live integration health
- Fallback verification
- Notification dedupe and cooldown verification
- Security review
- Privacy review
- Rollback rehearsal
- Real iPhone, Android, desktop, and installed PWA validation
- Accessibility review
- Performance and GPS battery review
- Backup and recovery proof
- Release notes
- Production deployment status

## Production-Live Rule

NOVA may be deployed as a production-live candidate when:

- Tests pass.
- Build passes.
- E2E gates pass.
- No critical security issue is known.
- Fallback behavior is verified.
- Notification behavior is verified.
- The production deployment finishes successfully.

## Final v1.0 Rule

Do not mark NOVA v1.0 final-ready until:

- Production `/api/health` reports real live/degraded/fallback status.
- No known issue can cause a missed duty without warning.
- Rollback has been rehearsed.
- Backup/recovery has been recorded.
- iPhone, Android, desktop, and installed PWA behavior are checked.
- Accessibility and performance are checked.
- GPS battery impact has been reviewed during realistic use.

## Deployment Notes

- Production deployment is done through Vercel.
- The Launch page remains honest after deployment: production can be live while final v1.0 manual gates remain open.
- Rollback target should be recorded from the previous Vercel production deployment before final v1.0 approval.

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
