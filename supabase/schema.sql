-- Emma OCC Dashboard v3 database schema.
-- Run in the Supabase SQL editor after creating the project.

create extension if not exists "pgcrypto";

do $$
begin
  create type import_status as enum ('processing', 'ready_for_review', 'synced', 'failed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type conflict_severity as enum ('Low', 'Medium', 'High', 'Critical');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type calendar_sync_status as enum ('pending', 'synced', 'failed', 'skipped');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Europe/Amsterdam',
  home_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  notification_preferences jsonb not null default '{"conflicts": true, "syncFailures": true}'::jsonb,
  ai_behavior jsonb not null default '{"tone": "concise", "useCalendarData": true}'::jsonb,
  import_preferences jsonb not null default '{"confirmBeforeSync": true, "dedupe": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.commute_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  before_minutes integer not null default 45 check (before_minutes >= 0 and before_minutes <= 240),
  after_minutes integer not null default 45 check (after_minutes >= 0 and after_minutes <= 240),
  travel_mode text not null default 'manual' check (travel_mode in ('manual', 'ns')),
  home_station text,
  work_station text,
  home_address text,
  work_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.commute_settings
  add column if not exists travel_mode text not null default 'manual';

alter table public.commute_settings
  add column if not exists home_station text,
  add column if not exists work_station text,
  add column if not exists home_address text,
  add column if not exists work_address text;

create table if not exists public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id text not null default 'primary',
  access_token text,
  refresh_token text,
  scope text,
  token_type text,
  expires_at timestamptz,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, calendar_id)
);

create table if not exists public.rosters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Imported roster',
  status text not null default 'active',
  date_start date,
  date_end date,
  source_import_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  roster_id uuid references public.rosters(id) on delete set null,
  filename text not null,
  file_type text not null,
  file_size_bytes integer not null default 0,
  checksum text,
  status import_status not null default 'processing',
  date_start date,
  date_end date,
  row_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  comparison jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.rosters
  drop constraint if exists rosters_source_import_id_fkey,
  add constraint rosters_source_import_id_fkey
  foreign key (source_import_id) references public.imports(id) on delete set null;

create table if not exists public.duties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  roster_id uuid references public.rosters(id) on delete cascade,
  import_id uuid not null references public.imports(id) on delete cascade,
  duty_date date not null,
  start_time time,
  end_time time,
  starts_at timestamptz,
  ends_at timestamptz,
  original_duty_code text,
  duty_label text not null,
  location text,
  notes text,
  source_file text,
  source_row integer,
  is_off boolean not null default false,
  is_overnight boolean not null default false,
  is_sick_leave boolean not null default false,
  calendar_event_id text,
  commute_to_event_id text,
  commute_home_event_id text,
  manual_label_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.duties
  add column if not exists is_sick_leave boolean not null default false;

create table if not exists public.calendar_sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid references public.imports(id) on delete set null,
  duty_id uuid references public.duties(id) on delete set null,
  provider text not null default 'google',
  status calendar_sync_status not null default 'pending',
  event_id text,
  idempotency_key text,
  action text,
  error_message text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.conflict_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid references public.imports(id) on delete cascade,
  duty_id uuid references public.duties(id) on delete cascade,
  severity conflict_severity not null,
  conflict_type text not null,
  title text not null,
  detail text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  answer text,
  context_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.nova_calendar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_provider text not null default 'google_calendar',
  source_calendar_id text not null,
  source_calendar_summary text,
  source_event_id text not null,
  external_etag text,
  event_type text not null default 'default',
  item_kind text not null default 'appointment' check (item_kind in ('appointment', 'special_date', 'blocked_time', 'focus_time', 'working_location')),
  title text not null,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  all_day_date date,
  all_day_end_date date,
  is_all_day boolean not null default false,
  status text not null default 'confirmed',
  html_link text,
  is_recurring boolean not null default false,
  recurring_event_id text,
  birthday_type text,
  special_date_label text,
  attendees jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_provider, source_calendar_id, source_event_id)
);

create table if not exists public.nova_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_provider text not null default 'manual',
  source_list_id text not null default 'nova',
  source_task_id text not null,
  source_kind text not null default 'task' check (source_kind in ('task', 'special_date', 'appointment_followup', 'manual')),
  title text not null,
  notes text,
  status text not null default 'needsAction',
  due_at timestamptz,
  due_date date,
  completed_at timestamptz,
  calendar_item_source_id text,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_provider, source_list_id, source_task_id)
);

create index if not exists duties_user_date_idx on public.duties(user_id, duty_date);
create index if not exists duties_import_idx on public.duties(import_id);
create index if not exists imports_user_imported_idx on public.imports(user_id, imported_at desc);
create index if not exists conflict_logs_user_idx on public.conflict_logs(user_id, created_at desc);
create index if not exists calendar_sync_logs_user_idx on public.calendar_sync_logs(user_id, created_at desc);
create index if not exists calendar_sync_logs_key_idx on public.calendar_sync_logs(user_id, idempotency_key);
create index if not exists nova_calendar_items_user_time_idx on public.nova_calendar_items(user_id, starts_at, all_day_date);
create index if not exists nova_calendar_items_user_kind_idx on public.nova_calendar_items(user_id, item_kind, status);
create index if not exists nova_tasks_user_due_idx on public.nova_tasks(user_id, due_date, due_at);
create index if not exists nova_tasks_user_status_idx on public.nova_tasks(user_id, status);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.commute_settings enable row level security;
alter table public.google_calendar_connections enable row level security;
alter table public.rosters enable row level security;
alter table public.imports enable row level security;
alter table public.duties enable row level security;
alter table public.calendar_sync_logs enable row level security;
alter table public.conflict_logs enable row level security;
alter table public.ai_queries enable row level security;
alter table public.nova_calendar_items enable row level security;
alter table public.nova_tasks enable row level security;

drop policy if exists "Profiles are self-owned" on public.profiles;
create policy "Profiles are self-owned" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "User settings are self-owned" on public.user_settings;
create policy "User settings are self-owned" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Commute settings are self-owned" on public.commute_settings;
create policy "Commute settings are self-owned" on public.commute_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Google calendar connections are self-owned" on public.google_calendar_connections;
create policy "Google calendar connections are self-owned" on public.google_calendar_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Rosters are self-owned" on public.rosters;
create policy "Rosters are self-owned" on public.rosters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Imports are self-owned" on public.imports;
create policy "Imports are self-owned" on public.imports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Duties are self-owned" on public.duties;
create policy "Duties are self-owned" on public.duties
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Calendar logs are self-owned" on public.calendar_sync_logs;
create policy "Calendar logs are self-owned" on public.calendar_sync_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Conflicts are self-owned" on public.conflict_logs;
create policy "Conflicts are self-owned" on public.conflict_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "AI queries are self-owned" on public.ai_queries;
create policy "AI queries are self-owned" on public.ai_queries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "NOVA calendar items are self-owned" on public.nova_calendar_items;
create policy "NOVA calendar items are self-owned" on public.nova_calendar_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "NOVA tasks are self-owned" on public.nova_tasks;
create policy "NOVA tasks are self-owned" on public.nova_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists user_settings_touch_updated_at on public.user_settings;
create trigger user_settings_touch_updated_at
before update on public.user_settings
for each row execute function public.touch_updated_at();

drop trigger if exists commute_settings_touch_updated_at on public.commute_settings;
create trigger commute_settings_touch_updated_at
before update on public.commute_settings
for each row execute function public.touch_updated_at();

drop trigger if exists google_calendar_connections_touch_updated_at on public.google_calendar_connections;
create trigger google_calendar_connections_touch_updated_at
before update on public.google_calendar_connections
for each row execute function public.touch_updated_at();

drop trigger if exists rosters_touch_updated_at on public.rosters;
create trigger rosters_touch_updated_at
before update on public.rosters
for each row execute function public.touch_updated_at();

drop trigger if exists duties_touch_updated_at on public.duties;
create trigger duties_touch_updated_at
before update on public.duties
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, preferred_language)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 'en')
  on conflict (id) do nothing;

  insert into public.user_settings (user_id, preferred_language)
  values (new.id, 'en')
  on conflict (user_id) do nothing;

  insert into public.commute_settings (user_id, travel_mode, home_address, work_address, home_station, work_station)
  values (
    new.id,
    'ns',
    'Lemmerstraat 18, 1324 BP Almere, Netherlands',
    'Admiraal Helfrichlaan 1, 3527 KV Utrecht, Netherlands',
    'Almere Centrum',
    'Utrecht Centraal'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- NOVA Phase 2: identity, Google integrations, and user preference data.

alter table public.profiles
  add column if not exists preferred_language text not null default 'en' check (preferred_language in ('en', 'es', 'fr')),
  add column if not exists phone_timezone text;

alter table public.user_settings
  add column if not exists preferred_language text not null default 'en' check (preferred_language in ('en', 'es', 'fr')),
  add column if not exists route_preferences jsonb not null default '{
    "preferDirectTrains": true,
    "minimizeTransfers": true,
    "minimizeWalking": false,
    "preferFastestArrival": true,
    "preferLowestCost": false,
    "allowCycling": false,
    "allowBus": true,
    "allowTaxi": true,
    "avoidPoorlyLitRoutesAtNight": true,
    "avoidStairs": false,
    "requireStepFreeAccess": false,
    "extraWeatherBufferMinutes": 5,
    "stationArrivalBufferMinutes": 12,
    "normalWalkingSpeedKmh": 4.8,
    "reducedWalkingSpeedKmh": 3.6,
    "preferFamiliarRoutes": true,
    "preferReliabilityOverSpeed": true
  }'::jsonb,
  add column if not exists location_preferences jsonb not null default '{
    "enabled": false,
    "highAccuracyWhenCommuting": false,
    "storeCoarseEvents": true,
    "storeRawHistory": false,
    "stationRadiusMeters": 350,
    "homeRadiusMeters": 160,
    "workRadiusMeters": 180
  }'::jsonb,
  add column if not exists privacy_settings jsonb not null default '{
    "gmailTriageEnabled": false,
    "calendarReadEnabled": true,
    "locationDataRetentionDays": 30,
    "commuteHistoryRetentionDays": 180,
    "allowAiCalendarContext": true,
    "allowAiEmailContext": false
  }'::jsonb;

alter table public.google_calendar_connections
  add column if not exists provider text not null default 'google',
  add column if not exists access_token_encrypted text,
  add column if not exists refresh_token_encrypted text,
  add column if not exists token_encryption_version text,
  add column if not exists granted_scopes text not null default '',
  add column if not exists connected_services jsonb not null default '{"calendar": false, "calendarList": false, "gmail": false, "tasks": false}'::jsonb,
  add column if not exists oauth_state_hash text,
  add column if not exists last_status_check_at timestamptz,
  add column if not exists disconnected_at timestamptz,
  add column if not exists last_error text;

create table if not exists public.saved_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('home', 'work', 'station', 'custom')),
  address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  radius_meters integer not null default 200 check (radius_meters between 25 and 5000),
  provider_source text not null default 'user',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.geofences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  saved_location_id uuid references public.saved_locations(id) on delete cascade,
  label text not null,
  radius_meters integer not null default 200 check (radius_meters between 25 and 5000),
  cooldown_minutes integer not null default 20 check (cooldown_minutes between 0 and 1440),
  min_accuracy_meters integer not null default 120 check (min_accuracy_meters between 10 and 1000),
  enabled boolean not null default true,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.location_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  geofence_id uuid references public.geofences(id) on delete set null,
  event_type text not null check (event_type in ('enter', 'exit', 'inferred_enter', 'inferred_exit', 'permission_lost')),
  coarse_location_label text,
  accuracy_meters integer,
  confidence numeric(4, 3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  source text not null default 'browser',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_metadata (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  service text not null,
  status text not null default 'not_connected' check (status in ('connected', 'not_connected', 'needs_reconnect', 'error')),
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, service)
);

create index if not exists saved_locations_user_kind_idx on public.saved_locations(user_id, kind) where deleted_at is null;
create index if not exists geofences_user_enabled_idx on public.geofences(user_id, enabled);
create index if not exists location_events_user_created_idx on public.location_events(user_id, created_at desc);
create index if not exists integration_metadata_user_provider_idx on public.integration_metadata(user_id, provider, service);

alter table public.saved_locations enable row level security;
alter table public.geofences enable row level security;
alter table public.location_events enable row level security;
alter table public.integration_metadata enable row level security;

drop policy if exists "Saved locations are self-owned" on public.saved_locations;
create policy "Saved locations are self-owned" on public.saved_locations
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Geofences are self-owned" on public.geofences;
create policy "Geofences are self-owned" on public.geofences
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Location events are self-owned" on public.location_events;
create policy "Location events are self-owned" on public.location_events
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Integration metadata is self-owned" on public.integration_metadata;
create policy "Integration metadata is self-owned" on public.integration_metadata
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop trigger if exists saved_locations_touch_updated_at on public.saved_locations;
create trigger saved_locations_touch_updated_at
before update on public.saved_locations
for each row execute function public.touch_updated_at();

drop trigger if exists geofences_touch_updated_at on public.geofences;
create trigger geofences_touch_updated_at
before update on public.geofences
for each row execute function public.touch_updated_at();

drop trigger if exists integration_metadata_touch_updated_at on public.integration_metadata;
create trigger integration_metadata_touch_updated_at
before update on public.integration_metadata
for each row execute function public.touch_updated_at();

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

-- NOVA Phase 5: AI Core daily briefs and smart update suppression.

create table if not exists public.ai_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brief_date date not null,
  language text not null default 'en' check (language in ('en', 'es', 'fr')),
  status text not null check (status in ('green', 'amber', 'red')),
  title text not null,
  summary text not null,
  facts jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  suppressed_updates jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  should_notify boolean not null default false,
  confidence numeric(4, 3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  generated_by text not null default 'fallback' check (generated_by in ('openai', 'fallback')),
  model text,
  prompt_version text not null default 'nova-ai-core-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brief_date, language)
);

create index if not exists ai_briefs_user_created_idx on public.ai_briefs(user_id, created_at desc);
create index if not exists ai_briefs_user_date_idx on public.ai_briefs(user_id, brief_date desc);

alter table public.ai_briefs enable row level security;

drop policy if exists "AI briefs are self-owned" on public.ai_briefs;
create policy "AI briefs are self-owned" on public.ai_briefs
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.ai_briefs to authenticated;

drop trigger if exists ai_briefs_touch_updated_at on public.ai_briefs;
create trigger ai_briefs_touch_updated_at
before update on public.ai_briefs
for each row execute function public.touch_updated_at();

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
