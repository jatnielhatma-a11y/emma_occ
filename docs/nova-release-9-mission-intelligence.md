# NOVA Release 9 Mission Voice and Autonomous Intelligence

## Goal

Release 9 adds a NOVA voice command layer while preserving Emma OCC and the Release 1-8 architecture. The voice layer is designed for quick operational use on desktop and phone without always-listening behavior.

## Implemented Scope

- Added `/mission-intelligence` as the Release 9 command surface.
- Added a dashboard voice panel for direct access from Mission Control.
- Added browser push-to-talk speech recognition with optional spoken replies.
- Added quick command buttons for browsers that do not expose speech recognition.
- Added a local command classifier for:
  - Daily brief
  - Next duty and Emma OCC
  - Commute and NS route review
  - Calendar review
  - Notifications
  - Settings
  - Privacy controls
  - Optimization loops
- Added Release 9 registry entries to the NOVA roadmap.
- Added EN/ES/FR navigation labels.

## Privacy and Safety Guardrails

- NOVA does not listen in the background.
- Voice commands start only after pressing the microphone button.
- Voice transcripts are not stored by default.
- Command matching happens in the browser session.
- External actions remain advisory and require review before changing Google Calendar, Gmail, notifications, commute settings, memory, or location state.
- Unknown commands are marked for review instead of being executed.

## Architecture Notes

- `lib/nova/mission-intelligence.ts` owns the command classifier, Release 9 focus records, summary builder, and safety guardrails.
- `components/nova/MissionVoicePanel.tsx` owns the push-to-talk interface and optional spoken replies.
- `/mission-intelligence` exposes the full Release 9 status, safety posture, and command surface.
- `/dashboard` includes the same voice surface in compact form for daily use.

## Not Included Yet

- Always-on wake-word listening.
- Silent calendar, Gmail, notification, memory, commute, or location mutations.
- Stored voice transcripts.
- Server-side voice processing.
- Continuous background GPS or microphone activity.

These omissions are intentional for privacy, battery, and operational safety.

## Verification

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Release 9 is production-ready only when all checks pass and the deployed `/mission-intelligence` route loads successfully.
