-- NOVA AI operational database: runtime state and privacy-safe AI event telemetry.

create table if not exists public.nova_ai_runtime_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ai_core_status text not null default 'online' check (ai_core_status in ('online', 'degraded', 'offline')),
  voice_enabled boolean not null default true,
  web_lookup_enabled boolean not null default true,
  last_voice_command_at timestamptz,
  last_daily_brief_at timestamptz,
  last_mission_started_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.nova_ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('voice_command', 'text_command', 'daily_brief', 'mission_start', 'web_lookup', 'system')),
  intent text,
  status text not null default 'completed' check (status in ('completed', 'failed', 'blocked', 'routed')),
  route text,
  confidence numeric(4, 3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  used_web boolean not null default false,
  generated_by text check (generated_by is null or generated_by in ('openai', 'fallback', 'system')),
  source_count integer check (source_count is null or source_count >= 0),
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists nova_ai_events_user_created_idx on public.nova_ai_events(user_id, created_at desc);
create index if not exists nova_ai_events_user_type_idx on public.nova_ai_events(user_id, event_type, created_at desc);
create index if not exists nova_ai_runtime_state_user_status_idx on public.nova_ai_runtime_state(user_id, ai_core_status);

alter table public.nova_ai_runtime_state enable row level security;
alter table public.nova_ai_events enable row level security;

drop policy if exists "NOVA AI runtime state is self-owned" on public.nova_ai_runtime_state;
create policy "NOVA AI runtime state is self-owned" on public.nova_ai_runtime_state
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "NOVA AI events are self-owned" on public.nova_ai_events;
create policy "NOVA AI events are self-owned" on public.nova_ai_events
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.nova_ai_runtime_state to authenticated;
grant select, insert, update, delete on public.nova_ai_events to authenticated;

drop trigger if exists nova_ai_runtime_state_touch_updated_at on public.nova_ai_runtime_state;
create trigger nova_ai_runtime_state_touch_updated_at
before update on public.nova_ai_runtime_state
for each row execute function public.touch_updated_at();
