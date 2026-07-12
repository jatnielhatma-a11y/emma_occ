create table if not exists public.nova_capability_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null check (capability in ('multi_device_sync', 'voice', 'vision', 'collaboration', 'developer_platform', 'nova_intelligence')),
  title text not null check (char_length(trim(title)) > 0),
  detail text not null default '',
  status text not null default 'candidate' check (status in ('candidate', 'enabled', 'paused', 'blocked', 'archived')),
  privacy_mode text not null default 'private' check (privacy_mode in ('private', 'family_scoped', 'developer_scoped', 'disabled')),
  consent_required boolean not null default true,
  consent_granted boolean not null default false,
  local_only boolean not null default false,
  sync_enabled boolean not null default false,
  device_scope text not null default 'personal' check (device_scope in ('personal', 'family', 'collaborator', 'developer')),
  risk text not null default 'green' check (risk in ('green', 'amber', 'red')),
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  source_refs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint nova_capability_voice_vision_consent
    check (capability not in ('voice', 'vision') or consent_required = true),
  constraint nova_capability_developer_scope
    check (capability <> 'developer_platform' or privacy_mode = 'developer_scoped'),
  constraint nova_capability_disabled_sync
    check (privacy_mode <> 'disabled' or sync_enabled = false)
);

create index if not exists nova_capability_records_user_capability_idx
  on public.nova_capability_records(user_id, capability, status);

create index if not exists nova_capability_records_user_scope_idx
  on public.nova_capability_records(user_id, device_scope, privacy_mode);

drop trigger if exists touch_nova_capability_records_updated_at on public.nova_capability_records;
create trigger touch_nova_capability_records_updated_at
before update on public.nova_capability_records
for each row execute function public.touch_updated_at();

alter table public.nova_capability_records enable row level security;

drop policy if exists "nova capability records are user scoped" on public.nova_capability_records;
create policy "nova capability records are user scoped"
on public.nova_capability_records
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.nova_capability_records to authenticated;
