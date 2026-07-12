create table if not exists public.production_readiness_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gate text not null check (gate in (
    'test_suite',
    'build',
    'e2e',
    'security',
    'monitoring',
    'fallback_behavior',
    'notifications',
    'rollback',
    'privacy_controls',
    'mobile_pwa',
    'commute_accuracy'
  )),
  title text not null,
  detail text not null default '',
  status text not null default 'manual' check (status in ('passed', 'attention', 'blocked', 'manual')),
  severity text not null default 'medium' check (severity in ('critical', 'high', 'medium', 'low')),
  stage text not null default 'manual' check (stage in ('automated', 'live', 'manual')),
  source_freshness text not null default 'manual' check (source_freshness in ('live', 'recent', 'fallback', 'manual', 'unavailable')),
  evidence_refs text[] not null default '{}',
  checked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.release_incident_runbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration text not null,
  failure_mode text not null,
  user_action text not null default '',
  escalation text not null default '',
  rollback_step text not null default '',
  status text not null default 'draft' check (status in ('draft', 'verified', 'needs_review', 'retired')),
  last_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commute_accuracy_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duty_id uuid references public.duties(id) on delete set null,
  direction text not null check (direction in ('home_to_work', 'work_to_home')),
  planned_departure_at timestamptz,
  actual_departure_at timestamptz,
  planned_arrival_at timestamptz,
  actual_arrival_at timestamptz,
  planned_minutes integer check (planned_minutes is null or planned_minutes >= 0),
  actual_minutes integer check (actual_minutes is null or actual_minutes >= 0),
  outcome text not null default 'unknown' check (outcome in ('on_time', 'delayed', 'missed_train', 'cancelled', 'route_closure', 'unknown')),
  source text not null default 'manual' check (source in ('manual', 'gps', 'calendar', 'ns', 'google_maps', 'fallback')),
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists production_readiness_reviews_user_gate_idx
  on public.production_readiness_reviews(user_id, gate)
  where archived_at is null;

create index if not exists release_incident_runbooks_user_integration_idx
  on public.release_incident_runbooks(user_id, integration)
  where archived_at is null;

create index if not exists commute_accuracy_measurements_user_created_idx
  on public.commute_accuracy_measurements(user_id, created_at desc)
  where archived_at is null;

alter table public.production_readiness_reviews enable row level security;
alter table public.release_incident_runbooks enable row level security;
alter table public.commute_accuracy_measurements enable row level security;

drop policy if exists "production readiness records are user owned" on public.production_readiness_reviews;
create policy "production readiness records are user owned"
on public.production_readiness_reviews
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "release runbooks are user owned" on public.release_incident_runbooks;
create policy "release runbooks are user owned"
on public.release_incident_runbooks
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "commute accuracy records are user owned" on public.commute_accuracy_measurements;
create policy "commute accuracy records are user owned"
on public.commute_accuracy_measurements
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.production_readiness_reviews to authenticated;
grant select, insert, update, delete on public.release_incident_runbooks to authenticated;
grant select, insert, update, delete on public.commute_accuracy_measurements to authenticated;
