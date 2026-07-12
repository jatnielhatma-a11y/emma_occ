-- NOVA Release 3: finance, home, travel, health, and learning life domains.

create table if not exists public.nova_life_domain_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null check (domain in ('finance', 'home', 'travel', 'health', 'learning')),
  title text not null,
  detail text,
  category text not null default 'general',
  status text not null default 'active' check (status in ('active', 'planned', 'paused', 'completed', 'archived')),
  priority integer not null default 3 check (priority between 1 and 5),
  target_date date,
  amount_cents bigint check (amount_cents is null or amount_cents >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  tags text[] not null default '{}',
  sensitive boolean not null default false,
  source_kind text not null default 'manual' check (source_kind in ('manual', 'calendar', 'gmail', 'roster', 'system', 'ai_suggestion')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nova_life_domain_records_user_domain_idx
  on public.nova_life_domain_records(user_id, domain, status, target_date);

create index if not exists nova_life_domain_records_user_created_idx
  on public.nova_life_domain_records(user_id, created_at desc);

alter table public.nova_life_domain_records enable row level security;

drop policy if exists "NOVA life domain records are self-owned" on public.nova_life_domain_records;
create policy "NOVA life domain records are self-owned" on public.nova_life_domain_records
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.nova_life_domain_records to authenticated;

drop trigger if exists nova_life_domain_records_touch_updated_at on public.nova_life_domain_records;
create trigger nova_life_domain_records_touch_updated_at
before update on public.nova_life_domain_records
for each row execute function public.touch_updated_at();
