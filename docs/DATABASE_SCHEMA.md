# Emma OS 1.0 — Database Schema

## Conventions
- UUID primary keys.
- Europe/Amsterdam stored as user timezone; timestamps stored in UTC.
- Soft deletion for operational records where audit history matters.
- Provider IDs are unique with provider/source scope.
- Sensitive fields encrypted where required.

## Core entities
### users
id, name, timezone, created_at, updated_at.

### user_settings
user_id, home_address, work_address, home_station, work_station, walking_speed, arrival_buffer_min, notification_window_min, contractual_day_minutes, vacation_entitlement_minutes, jarvis_enabled, risk_thresholds_json.

### integrations
id, user_id, provider, status, scopes, last_success_at, last_error_code, encrypted_credentials_ref.

### roster_sources
id, user_id, provider, external_message_id, sender, received_at, schedule_week, version_key, content_hash, parse_status, confidence, original_reference.

### roster_entries
id, user_id, roster_source_id, external_key, work_date, start_at, end_at, raw_code, normalized_type, duty_code, description, location, revision, status, validation_notes.

Unique constraint: user_id + external_key + revision.

### calendar_sync_records
id, roster_entry_id, calendar_id, external_event_id, source_hash, sync_status, synced_at, last_error.

### duty_actuals
id, roster_entry_id, actual_start_at, actual_relief_at, source, notes.

### vacation_entries
id, user_id, roster_entry_id, start_at, end_at, status, minutes, source, entitlement_year.

### sick_leave_entries
id, user_id, roster_entry_id, start_at, end_at, calendar_minutes, scheduled_minutes_missed, status, source, restricted_notes_ref.

### commute_missions
id, user_id, roster_entry_id, direction, mode, status, planned_start_at, actual_start_at, planned_arrival_at, actual_arrival_at, target_buffer_minutes, selected_route_id, confidence, risk, completed_at.

### mission_legs
id, mission_id, sequence, type, origin, destination, planned_start_at, actual_start_at, planned_end_at, actual_end_at, provider, external_service_id, platform, distance_meters, duration_seconds, status.

### route_options
id, mission_id, provider_set, rank, score, arrival_at, transfers, walking_meters, cost_estimate, reliability_score, disruption_exposure, selected, source_freshness_at.

### disruptions
id, provider, external_id, type, severity, title, description, starts_at, ends_at, affected_routes_json, fetched_at.

### weather_risks
id, mission_id, provider, risk_type, severity, walking_buffer_minutes, valid_from, valid_until, fetched_at.

### mission_events
id, mission_id, occurred_at, event_type, source, payload_json, user_visible.

### action_items
id, user_id, category, severity, title, description, due_at, status, source_reference, created_at, resolved_at.

### frequent_routes
id, user_id, name, origin, destination, preferred, provider_preferences_json, active.

### preferred_trains
id, user_id, direction, day_type, departure_local_time, usual_platform, direct_required, active, last_verified_at.

### weekly_work_summaries
id, user_id, iso_year, iso_week, scheduled_minutes, actual_minutes, late_shift_minutes, night_shift_minutes, overtime_minutes, early_relief_minutes, vacation_minutes, sick_minutes, commute_minutes, duty_count, off_day_count.

### monthly_work_summaries
id, user_id, year, month, same aggregate metrics.

### annual_work_summaries
id, user_id, year, same aggregate metrics plus vacation_entitlement_minutes and vacation_remaining_minutes.

## Derived rules
- Night shifts cross midnight and remain one roster entry.
- Vacation minutes equal replaced scheduled-duty minutes when known; otherwise use contractual day length.
- Sick calendar duration and missed scheduled-duty minutes are separate metrics.
- OFF days contribute zero duty minutes.
- Summary tables are rebuildable from source records.

## Indexes
- roster_entries(user_id, work_date)
- roster_sources(user_id, schedule_week, received_at desc)
- commute_missions(user_id, planned_start_at desc)
- mission_events(mission_id, occurred_at)
- disruptions(provider, starts_at, ends_at)
- action_items(user_id, status, due_at)

## Retention
- Operational mission history: configurable.
- Raw email content: minimize; retain reference and hash where possible.
- Precise location events: retain only when required for mission replay.
- Sick-leave private notes: separate restricted storage or do not store.
