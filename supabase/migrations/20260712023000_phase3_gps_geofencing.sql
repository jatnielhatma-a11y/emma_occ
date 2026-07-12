-- NOVA Phase 3: GPS, geofencing, and commute progress state.

create table if not exists public.commute_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duty_id uuid references public.duties(id) on delete set null,
  direction text not null check (direction in ('outbound', 'return')),
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'missed', 'cancelled')),
  current_phase text not null default 'not_started' check (current_phase in ('not_started', 'left_origin', 'at_origin_station', 'on_train', 'at_destination_station', 'arrived_destination', 'unknown')),
  planned_departure_at timestamptz,
  planned_arrival_at timestamptz,
  actual_departure_at timestamptz,
  actual_arrival_at timestamptz,
  latest_location_label text,
  latest_confidence numeric(4, 3) check (latest_confidence is null or (latest_confidence >= 0 and latest_confidence <= 1)),
  latest_event_at timestamptz,
  source text not null default 'browser',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commute_missions_user_status_idx on public.commute_missions(user_id, status, created_at desc);
create index if not exists commute_missions_user_duty_idx on public.commute_missions(user_id, duty_id);

alter table public.commute_missions enable row level security;

drop policy if exists "Commute missions are self-owned" on public.commute_missions;
create policy "Commute missions are self-owned" on public.commute_missions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop trigger if exists commute_missions_touch_updated_at on public.commute_missions;
create trigger commute_missions_touch_updated_at
before update on public.commute_missions
for each row execute function public.touch_updated_at();

alter table public.location_events
  add column if not exists commute_mission_id uuid references public.commute_missions(id) on delete set null,
  add column if not exists route_phase text;

create index if not exists location_events_mission_idx on public.location_events(commute_mission_id, created_at desc);
