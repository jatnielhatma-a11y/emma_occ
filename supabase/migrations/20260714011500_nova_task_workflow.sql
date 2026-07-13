-- NOVA task workflow: accept, start, and complete imported Google work items locally.

alter table public.nova_tasks
  add column if not exists workflow_status text not null default 'new'
    check (workflow_status in ('new', 'accepted', 'in_progress', 'done', 'dismissed')),
  add column if not exists accepted_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists done_at timestamptz;

alter table public.nova_calendar_items
  add column if not exists workflow_status text not null default 'new'
    check (workflow_status in ('new', 'accepted', 'in_progress', 'done', 'dismissed')),
  add column if not exists accepted_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists done_at timestamptz;

create index if not exists nova_tasks_user_workflow_idx
  on public.nova_tasks(user_id, workflow_status, due_date, due_at);

create index if not exists nova_calendar_items_user_workflow_idx
  on public.nova_calendar_items(user_id, workflow_status, starts_at, all_day_date);
