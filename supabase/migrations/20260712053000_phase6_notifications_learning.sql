-- NOVA Phase 6: notifications, mission history, walking-speed learning, and analytics.

create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  user_agent text,
  permission text not null default 'default' check (permission in ('granted', 'denied', 'default')),
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null default 'in_app' check (channel in ('in_app', 'push', 'email', 'sms', 'whatsapp')),
  event_type text not null check (
    event_type in (
      'leave_home',
      'return_trip',
      'delay_or_cancellation',
      'platform_change',
      'traffic_incident',
      'severe_weather',
      'buffer_risk',
      'calendar_change',
      'missed_departure_risk',
      'arrival',
      'gps_permission_lost',
      'integration_failure',
      'daily_brief',
      'manual'
    )
  ),
  severity text not null default 'amber' check (severity in ('green', 'amber', 'red')),
  title text not null,
  body text not null,
  action_label text,
  action_url text,
  source_table text,
  source_id uuid,
  dedupe_key text,
  status text not null default 'pending' check (status in ('pending', 'suppressed', 'sent', 'read', 'failed')),
  should_notify boolean not null default false,
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  suppressed_reason text,
  cooldown_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notification_events_user_dedupe_idx
  on public.notification_events(user_id, dedupe_key)
  where dedupe_key is not null;

create table if not exists public.mission_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commute_mission_id uuid references public.commute_missions(id) on delete set null,
  duty_id uuid references public.duties(id) on delete set null,
  direction text not null check (direction in ('outbound', 'return')),
  status text not null check (status in ('completed', 'missed', 'cancelled', 'partial')),
  started_at timestamptz,
  completed_at timestamptz,
  planned_departure_at timestamptz,
  planned_arrival_at timestamptz,
  actual_departure_at timestamptz,
  actual_arrival_at timestamptz,
  departure_delta_minutes integer,
  arrival_delta_minutes integer,
  confidence numeric(4, 3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.walking_speed_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commute_mission_id uuid references public.commute_missions(id) on delete set null,
  source text not null default 'manual' check (source in ('gps', 'manual', 'route_inference')),
  segment_label text not null,
  distance_meters integer not null check (distance_meters between 20 and 50000),
  duration_seconds integer not null check (duration_seconds between 30 and 28800),
  speed_kmh numeric(5, 2) not null check (speed_kmh between 1 and 8),
  confidence numeric(4, 3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  sampled_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.route_preference_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_snapshot_id uuid references public.commute_route_snapshots(id) on delete set null,
  selected_option_id text,
  feedback_type text not null check (
    feedback_type in ('accepted', 'rejected', 'too_much_walking', 'too_many_transfers', 'late', 'unsafe', 'other')
  ),
  comment text,
  preference_delta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.operational_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_date date not null,
  metric_key text not null,
  metric_value numeric not null default 0,
  source text not null default 'nova',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, metric_date, metric_key)
);

create index if not exists notification_events_user_status_idx on public.notification_events(user_id, status, created_at desc);
create index if not exists notification_subscriptions_user_active_idx on public.notification_subscriptions(user_id, is_active);
create index if not exists mission_history_user_created_idx on public.mission_history(user_id, created_at desc);
create index if not exists walking_speed_samples_user_created_idx on public.walking_speed_samples(user_id, created_at desc);
create index if not exists route_feedback_user_created_idx on public.route_preference_feedback(user_id, created_at desc);
create index if not exists operational_metrics_user_date_idx on public.operational_metrics(user_id, metric_date desc);

alter table public.notification_subscriptions enable row level security;
alter table public.notification_events enable row level security;
alter table public.mission_history enable row level security;
alter table public.walking_speed_samples enable row level security;
alter table public.route_preference_feedback enable row level security;
alter table public.operational_metrics enable row level security;

drop policy if exists "Notification subscriptions are self-owned" on public.notification_subscriptions;
create policy "Notification subscriptions are self-owned" on public.notification_subscriptions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Notification events are self-owned" on public.notification_events;
create policy "Notification events are self-owned" on public.notification_events
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Mission history is self-owned" on public.mission_history;
create policy "Mission history is self-owned" on public.mission_history
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Walking speed samples are self-owned" on public.walking_speed_samples;
create policy "Walking speed samples are self-owned" on public.walking_speed_samples
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Route feedback is self-owned" on public.route_preference_feedback;
create policy "Route feedback is self-owned" on public.route_preference_feedback
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Operational metrics are self-owned" on public.operational_metrics;
create policy "Operational metrics are self-owned" on public.operational_metrics
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.notification_subscriptions to authenticated;
grant select, insert, update, delete on public.notification_events to authenticated;
grant select, insert, update, delete on public.mission_history to authenticated;
grant select, insert, update, delete on public.walking_speed_samples to authenticated;
grant select, insert, update, delete on public.route_preference_feedback to authenticated;
grant select, insert, update, delete on public.operational_metrics to authenticated;

drop trigger if exists notification_subscriptions_touch_updated_at on public.notification_subscriptions;
create trigger notification_subscriptions_touch_updated_at
before update on public.notification_subscriptions
for each row execute function public.touch_updated_at();

drop trigger if exists notification_events_touch_updated_at on public.notification_events;
create trigger notification_events_touch_updated_at
before update on public.notification_events
for each row execute function public.touch_updated_at();
