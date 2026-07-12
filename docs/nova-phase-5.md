# NOVA Phase 5

Phase 5 adds the AI Core foundation.

## What changed

- Added `ai_briefs` for stored daily operations briefs.
- Added a server-side NOVA operational context builder.
- Added a typed daily brief engine with deterministic fallback mode.
- Added OpenAI Responses API support with Structured Outputs when `OPENAI_API_KEY` is configured.
- Added `/api/ai/daily-brief`.
- Added a Phase 5 daily brief panel to Mission Control and Emma AI.
- Added smart suppression for non-actionable updates.

## Safety rules

- The browser never calls OpenAI or provider APIs directly.
- Briefs use compact verified operational facts from Supabase and provider snapshots.
- Fallback or unavailable provider data is labeled as fallback or unavailable.
- The brief separates facts from recommendations.
- Notifications are suggested only when risk or action changes materially.

## Environment

Required for AI-generated briefs:

- `OPENAI_API_KEY`

Optional:

- `OPENAI_MODEL`

If `OPENAI_API_KEY` is absent or the provider fails, NOVA still generates a deterministic fallback brief.
