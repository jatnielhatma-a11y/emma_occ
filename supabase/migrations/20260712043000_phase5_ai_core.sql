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
