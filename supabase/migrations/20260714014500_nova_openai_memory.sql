-- NOVA OpenAI core: private user-owned knowledge items for imported ChatGPT
-- exports and optional NOVA chat memory. Raw export files are not stored.

create table if not exists public.nova_ai_knowledge_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null check (source_kind in ('chatgpt_export', 'nova_chat', 'manual', 'web_search')),
  source_identifier text not null,
  title text not null,
  summary text not null default '',
  content_excerpt text not null default '',
  source_url text,
  source_created_at timestamptz,
  sensitive boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_kind, source_identifier)
);

create index if not exists nova_ai_knowledge_user_created_idx
  on public.nova_ai_knowledge_items(user_id, created_at desc);

create index if not exists nova_ai_knowledge_user_source_idx
  on public.nova_ai_knowledge_items(user_id, source_kind, source_created_at desc);

alter table public.nova_ai_knowledge_items enable row level security;

drop policy if exists "NOVA AI knowledge is self-owned" on public.nova_ai_knowledge_items;
create policy "NOVA AI knowledge is self-owned" on public.nova_ai_knowledge_items
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.nova_ai_knowledge_items to authenticated;

drop trigger if exists nova_ai_knowledge_items_touch_updated_at on public.nova_ai_knowledge_items;
create trigger nova_ai_knowledge_items_touch_updated_at
before update on public.nova_ai_knowledge_items
for each row execute function public.touch_updated_at();
