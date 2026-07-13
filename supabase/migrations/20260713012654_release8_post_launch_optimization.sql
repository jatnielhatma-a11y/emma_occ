create table if not exists public.optimization_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  focus text not null check (
    focus in (
      'usage_feedback',
      'commute_accuracy',
      'duty_risk',
      'memory_recommendations',
      'proactive_planning',
      'mobile_pwa_polish',
      'privacy_controls',
      'family_context',
      'monitoring_tuning'
    )
  ),
  title text not null check (char_length(title) between 1 and 180),
  detail text not null default '' check (char_length(detail) <= 2500),
  impact text not null default 'medium' check (impact in ('low', 'medium', 'high')),
  source_freshness text not null default 'manual' check (source_freshness in ('live', 'recent', 'manual', 'fallback')),
  source_label text,
  evidence_refs text[] not null default '{}',
  reviewed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.optimization_tuning_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feedback_id uuid references public.optimization_feedback(id) on delete set null,
  focus text not null check (
    focus in (
      'usage_feedback',
      'commute_accuracy',
      'duty_risk',
      'memory_recommendations',
      'proactive_planning',
      'mobile_pwa_polish',
      'privacy_controls',
      'family_context',
      'monitoring_tuning'
    )
  ),
  status text not null default 'observing' check (status in ('observing', 'tuning', 'verified', 'paused')),
  recommendation_mode text not null default 'advisory' check (recommendation_mode in ('advisory', 'manual_review', 'disabled')),
  uses_personal_data boolean not null default true,
  privacy_reviewed boolean not null default false,
  consent_required boolean not null default true,
  consent_granted boolean not null default false,
  automation_enabled boolean not null default false,
  metrics jsonb not null default '{}'::jsonb,
  notes text not null default '' check (char_length(notes) <= 2500),
  reviewed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint optimization_no_silent_automation
    check (automation_enabled = false or (consent_required = true and consent_granted = true))
);

create index if not exists optimization_feedback_user_focus_idx
  on public.optimization_feedback(user_id, focus)
  where archived_at is null;

create index if not exists optimization_tuning_records_user_focus_idx
  on public.optimization_tuning_records(user_id, focus)
  where archived_at is null;

create index if not exists optimization_tuning_records_feedback_idx
  on public.optimization_tuning_records(feedback_id)
  where feedback_id is not null;

alter table public.optimization_feedback enable row level security;
alter table public.optimization_tuning_records enable row level security;

drop policy if exists "optimization feedback is user owned" on public.optimization_feedback;
create policy "optimization feedback is user owned"
on public.optimization_feedback
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "optimization tuning records are user owned" on public.optimization_tuning_records;
create policy "optimization tuning records are user owned"
on public.optimization_tuning_records
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.optimization_feedback to authenticated;
grant select, insert, update, delete on public.optimization_tuning_records to authenticated;
