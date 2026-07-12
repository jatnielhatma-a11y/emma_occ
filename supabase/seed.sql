-- Optional demo data. Replace the user id with an existing auth.users id before running.
do $$
declare
  demo_user uuid := '00000000-0000-0000-0000-000000000000';
  demo_roster uuid;
  demo_import uuid;
begin
  insert into public.rosters (user_id, name, date_start, date_end)
  values (demo_user, 'Demo July roster', '2026-07-07', '2026-07-14')
  returning id into demo_roster;

  insert into public.imports (user_id, roster_id, filename, file_type, status, date_start, date_end, row_count)
  values (demo_user, demo_roster, 'demo-roster.csv', 'text/csv', 'ready_for_review', '2026-07-07', '2026-07-14', 8)
  returning id into demo_import;

  update public.rosters set source_import_id = demo_import where id = demo_roster;

  insert into public.duties
    (user_id, roster_id, import_id, duty_date, start_time, end_time, starts_at, ends_at, original_duty_code, duty_label, location, notes, source_file, is_off, is_overnight)
  values
    (demo_user, demo_roster, demo_import, '2026-07-07', '15:00', '23:05', '2026-07-07 15:00+02', '2026-07-07 23:05+02', 'LATE', 'Late Shift', 'AMS OCC', 'Platform supervision', 'demo-roster.csv', false, false),
    (demo_user, demo_roster, demo_import, '2026-07-08', '23:00', '07:05', '2026-07-08 23:00+02', '2026-07-09 07:05+02', 'NIGHT', 'Night Shift', 'AMS OCC', 'Overnight duty', 'demo-roster.csv', false, true),
    (demo_user, demo_roster, demo_import, '2026-07-09', null, null, null, null, 'Rest', 'OFF Day', null, null, 'demo-roster.csv', true, false);
end $$;
