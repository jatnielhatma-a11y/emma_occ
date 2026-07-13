-- Stabilize Google Calendar imports after expanded calendar-list permissions.
-- Older syncs used the primary fallback calendar id; newer syncs can see real
-- calendar ids. Keep one NOVA row per Google event and prefer real calendar ids.

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, source_provider, source_event_id
      order by
        case when source_calendar_id = 'primary' then 1 else 0 end,
        synced_at desc,
        updated_at desc,
        created_at desc,
        id desc
    ) as row_rank
  from public.nova_calendar_items
  where source_provider = 'google_calendar'
)
delete from public.nova_calendar_items item
using ranked
where item.id = ranked.id
  and ranked.row_rank > 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, source_provider, regexp_replace(source_task_id, '^special-date:[^:]+:', 'special-date:')
      order by
        case when source_list_id = 'google_calendar' then 0 else 1 end,
        synced_at desc,
        updated_at desc,
        created_at desc,
        id desc
    ) as row_rank
  from public.nova_tasks
  where source_provider = 'google_calendar'
    and source_kind = 'special_date'
)
delete from public.nova_tasks task
using ranked
where task.id = ranked.id
  and ranked.row_rank > 1;

update public.nova_tasks
set
  source_list_id = 'google_calendar',
  source_task_id = regexp_replace(source_task_id, '^special-date:[^:]+:', 'special-date:'),
  updated_at = now()
where source_provider = 'google_calendar'
  and source_kind = 'special_date'
  and source_task_id like 'special-date:%:%';

do $$
declare
  calendar_constraint_name text;
begin
  select conname
  into calendar_constraint_name
  from pg_constraint
  where conrelid = 'public.nova_calendar_items'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) ilike '%source_calendar_id%'
    and pg_get_constraintdef(oid) ilike '%source_event_id%'
  limit 1;

  if calendar_constraint_name is not null then
    execute format('alter table public.nova_calendar_items drop constraint %I', calendar_constraint_name);
  end if;
end $$;

create unique index if not exists nova_calendar_items_user_event_uidx
  on public.nova_calendar_items(user_id, source_provider, source_event_id);
