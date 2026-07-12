-- NOVA Release 2: personal core, privacy-first memory, and life graph.

create table if not exists public.nova_personal_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_name text,
  family_context text,
  primary_language text not null default 'en' check (primary_language in ('en', 'es', 'fr')),
  timezone text not null default 'Europe/Amsterdam',
  visibility_settings jsonb not null default '{"shareWithAi": false, "showOnDashboard": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nova_memory_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  memory_enabled boolean not null default false,
  allow_ai_suggestions boolean not null default false,
  retention_days integer not null default 365 check (retention_days between 1 and 3650),
  consent_version text not null default 'nova-r2-privacy-v1',
  consented_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memory_consent_requires_timestamp check (
    memory_enabled = false or consented_at is not null
  )
);

create table if not exists public.nova_memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_type text not null default 'general',
  title text not null,
  body text,
  source_kind text not null default 'manual' check (source_kind in ('manual', 'calendar', 'gmail', 'roster', 'system', 'ai_suggestion')),
  source_ref text,
  tags text[] not null default '{}',
  confidence numeric(4,3) not null default 1 check (confidence >= 0 and confidence <= 1),
  is_sensitive boolean not null default false,
  pinned boolean not null default false,
  archived_at timestamptz,
  expires_at timestamptz,
  created_by text not null default 'user' check (created_by in ('user', 'system', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nova_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  detail text,
  category text not null default 'general',
  priority integer not null default 3 check (priority between 1 and 5),
  tags text[] not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nova_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  detail text,
  category text not null default 'general',
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nova_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  detail text,
  cadence text not null default 'weekly' check (cadence in ('daily', 'weekly', 'monthly', 'custom')),
  target_count integer not null default 1 check (target_count > 0),
  is_active boolean not null default true,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nova_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  relationship_type text not null default 'personal',
  context_note text,
  important_dates jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nova_timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_on date,
  title text not null,
  detail text,
  event_type text not null default 'personal',
  source_kind text not null default 'manual' check (source_kind in ('manual', 'calendar', 'gmail', 'roster', 'system', 'ai_suggestion')),
  source_ref text,
  tags text[] not null default '{}',
  is_private boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nova_memory_items_user_created_idx on public.nova_memory_items(user_id, created_at desc);
create index if not exists nova_interests_user_idx on public.nova_interests(user_id, archived_at, created_at desc);
create index if not exists nova_goals_user_status_idx on public.nova_goals(user_id, status, target_date);
create index if not exists nova_habits_user_active_idx on public.nova_habits(user_id, is_active, created_at desc);
create index if not exists nova_relationships_user_idx on public.nova_relationships(user_id, archived_at, display_name);
create index if not exists nova_timeline_events_user_date_idx on public.nova_timeline_events(user_id, occurred_on desc nulls last);

alter table public.nova_personal_profiles enable row level security;
alter table public.nova_memory_settings enable row level security;
alter table public.nova_memory_items enable row level security;
alter table public.nova_interests enable row level security;
alter table public.nova_goals enable row level security;
alter table public.nova_habits enable row level security;
alter table public.nova_relationships enable row level security;
alter table public.nova_timeline_events enable row level security;

drop policy if exists "NOVA personal profiles are self-owned" on public.nova_personal_profiles;
create policy "NOVA personal profiles are self-owned" on public.nova_personal_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "NOVA memory settings are self-owned" on public.nova_memory_settings;
create policy "NOVA memory settings are self-owned" on public.nova_memory_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "NOVA memory items are self-owned" on public.nova_memory_items;
create policy "NOVA memory items are self-owned" on public.nova_memory_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "NOVA interests are self-owned" on public.nova_interests;
create policy "NOVA interests are self-owned" on public.nova_interests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "NOVA goals are self-owned" on public.nova_goals;
create policy "NOVA goals are self-owned" on public.nova_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "NOVA habits are self-owned" on public.nova_habits;
create policy "NOVA habits are self-owned" on public.nova_habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "NOVA relationships are self-owned" on public.nova_relationships;
create policy "NOVA relationships are self-owned" on public.nova_relationships
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "NOVA timeline events are self-owned" on public.nova_timeline_events;
create policy "NOVA timeline events are self-owned" on public.nova_timeline_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists nova_personal_profiles_touch_updated_at on public.nova_personal_profiles;
create trigger nova_personal_profiles_touch_updated_at
before update on public.nova_personal_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists nova_memory_settings_touch_updated_at on public.nova_memory_settings;
create trigger nova_memory_settings_touch_updated_at
before update on public.nova_memory_settings
for each row execute function public.touch_updated_at();

drop trigger if exists nova_memory_items_touch_updated_at on public.nova_memory_items;
create trigger nova_memory_items_touch_updated_at
before update on public.nova_memory_items
for each row execute function public.touch_updated_at();

drop trigger if exists nova_interests_touch_updated_at on public.nova_interests;
create trigger nova_interests_touch_updated_at
before update on public.nova_interests
for each row execute function public.touch_updated_at();

drop trigger if exists nova_goals_touch_updated_at on public.nova_goals;
create trigger nova_goals_touch_updated_at
before update on public.nova_goals
for each row execute function public.touch_updated_at();

drop trigger if exists nova_habits_touch_updated_at on public.nova_habits;
create trigger nova_habits_touch_updated_at
before update on public.nova_habits
for each row execute function public.touch_updated_at();

drop trigger if exists nova_relationships_touch_updated_at on public.nova_relationships;
create trigger nova_relationships_touch_updated_at
before update on public.nova_relationships
for each row execute function public.touch_updated_at();

drop trigger if exists nova_timeline_events_touch_updated_at on public.nova_timeline_events;
create trigger nova_timeline_events_touch_updated_at
before update on public.nova_timeline_events
for each row execute function public.touch_updated_at();
