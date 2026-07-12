create table if not exists public.nova_intelligence_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('prediction', 'recommendation', 'context_signal', 'automation_rule', 'daily_ai_routine')),
  title text not null check (char_length(trim(title)) > 0),
  detail text not null default '',
  domain text not null default 'operations',
  status text not null default 'candidate' check (status in ('candidate', 'reviewed', 'approved', 'paused', 'completed', 'archived')),
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  priority integer not null default 3 check (priority between 1 and 5),
  risk text not null default 'green' check (risk in ('green', 'amber', 'red')),
  source_type text not null default 'manual' check (source_type in ('manual', 'ai', 'integration', 'fallback')),
  source_refs jsonb not null default '[]'::jsonb,
  automation_enabled boolean not null default false,
  requires_confirmation boolean not null default true,
  next_run_at timestamptz,
  last_evaluated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint nova_intelligence_records_confirm_automation
    check (kind <> 'automation_rule' or requires_confirmation = true)
);

create index if not exists nova_intelligence_records_user_kind_idx
  on public.nova_intelligence_records(user_id, kind, status);

create index if not exists nova_intelligence_records_user_priority_idx
  on public.nova_intelligence_records(user_id, priority, risk);

drop trigger if exists touch_nova_intelligence_records_updated_at on public.nova_intelligence_records;
create trigger touch_nova_intelligence_records_updated_at
before update on public.nova_intelligence_records
for each row execute function public.touch_updated_at();

alter table public.nova_intelligence_records enable row level security;

drop policy if exists "nova intelligence records are user scoped" on public.nova_intelligence_records;
create policy "nova intelligence records are user scoped"
on public.nova_intelligence_records
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.nova_intelligence_records to authenticated;
