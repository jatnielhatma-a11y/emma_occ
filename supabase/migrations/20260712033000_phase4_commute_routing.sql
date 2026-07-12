-- NOVA Phase 4: live commute route intelligence and route snapshots.

create table if not exists public.commute_route_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commute_mission_id uuid references public.commute_missions(id) on delete set null,
  direction text not null check (direction in ('outbound', 'return')),
  route_status text not null check (route_status in ('green', 'amber', 'red')),
  confidence numeric(4, 3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  is_live boolean not null default false,
  provider_summary jsonb not null default '{}'::jsonb,
  recommended_option jsonb not null default '{}'::jsonb,
  backup_options jsonb not null default '[]'::jsonb,
  incidents jsonb not null default '[]'::jsonb,
  source_age_seconds integer,
  created_at timestamptz not null default now()
);

create index if not exists commute_route_snapshots_user_created_idx
  on public.commute_route_snapshots(user_id, created_at desc);

create index if not exists commute_route_snapshots_user_direction_idx
  on public.commute_route_snapshots(user_id, direction, created_at desc);

alter table public.commute_route_snapshots enable row level security;

drop policy if exists "Commute route snapshots are self-owned" on public.commute_route_snapshots;
create policy "Commute route snapshots are self-owned" on public.commute_route_snapshots
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.commute_route_snapshots to authenticated;

alter table public.commute_missions
  add column if not exists latest_route_snapshot_id uuid references public.commute_route_snapshots(id) on delete set null;
