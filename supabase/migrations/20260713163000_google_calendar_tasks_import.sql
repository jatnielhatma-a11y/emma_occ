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

alter table public.google_calendar_connections
  alter column connected_services set default '{"calendar": false, "calendarList": false, "gmail": false, "tasks": false}'::jsonb;

update public.google_calendar_connections
set connected_services = connected_services || '{"calendarList": false, "tasks": false}'::jsonb
where connected_services is not null;

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

create index if not exists nova_calendar_items_user_time_idx on public.nova_calendar_items(user_id, starts_at, all_day_date);
create index if not exists nova_calendar_items_user_kind_idx on public.nova_calendar_items(user_id, item_kind, status);
create index if not exists nova_tasks_user_due_idx on public.nova_tasks(user_id, due_date, due_at);
create index if not exists nova_tasks_user_status_idx on public.nova_tasks(user_id, status);

alter table public.nova_calendar_items enable row level security;
alter table public.nova_tasks enable row level security;

drop policy if exists "NOVA calendar items are self-owned" on public.nova_calendar_items;
create policy "NOVA calendar items are self-owned" on public.nova_calendar_items
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "NOVA tasks are self-owned" on public.nova_tasks;
create policy "NOVA tasks are self-owned" on public.nova_tasks
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.nova_calendar_items to authenticated;
grant select, insert, update, delete on public.nova_tasks to authenticated;

drop trigger if exists nova_calendar_items_touch_updated_at on public.nova_calendar_items;
create trigger nova_calendar_items_touch_updated_at
before update on public.nova_calendar_items
for each row execute function public.touch_updated_at();

drop trigger if exists nova_tasks_touch_updated_at on public.nova_tasks;
create trigger nova_tasks_touch_updated_at
before update on public.nova_tasks
for each row execute function public.touch_updated_at();
