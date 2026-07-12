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
  add column if not exists connected_services jsonb not null default '{"calendar": false, "gmail": false}'::jsonb,
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
