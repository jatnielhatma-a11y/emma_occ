# NOVA Phase 6

Phase 6 adds notifications, mission history foundations, and learning.

## What changed

- Added PWA manifest and service worker for future push notifications.
- Added browser push subscription storage.
- Added in-app notification events with cooldown and quiet-hour suppression.
- Added mission history storage.
- Added walking-speed samples and gradual walking-speed learning.
- Added route feedback and preference learning.
- Added operational metrics storage.
- Added Notifications page and upgraded Analytics.

## Live push status

NOVA can now store browser push subscriptions. Actual server push delivery requires:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Until those are configured with a sending provider/library, NOVA uses in-app alerts and clearly labels browser push setup status.

## Safety rules

- Notifications are user-owned through RLS.
- Green/non-actionable updates are suppressed.
- Amber alerts respect quiet hours.
- Duplicate alerts are suppressed during cooldown.
- Learning updates are gradual and bounded.
