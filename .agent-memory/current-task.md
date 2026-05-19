# Current Task

Last updated: 2026-05-19 16:35:00 +02:00

## Task

Audit and fix worktime/time_taken_seconds period logic across the whole dashboard.

## Scope

- `api/_worktime.php`
- `api/data.php`
- `api/export.php`
- `api/_telegram_commands.php`
- frontend render tests / source tests
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Audit all backend period/hourly aggregations that use `time_taken_seconds` or `worktime_seconds_sql()`.
- [x] Audit frontend/Telegram/export display paths for worktime-derived values.
- [x] Fix remaining period buckets so working time is not assigned by completion date where that is wrong.
- [x] Add/update regression coverage for the shared rule.
- [x] Deploy and verify live.

## Notes

- Owner reports the issue appears across the dashboard, not just `Arbeitszeit heute`.
- The previously found root cause was completion-date bucketing for worktime. The system now needs a full pass for all derived worktime/hourly calculations.
- Production diagnosis found the remaining visible distortion came from one stale approved Prolific timer: raw `time_taken_seconds` was 158,676 seconds for a study with `estimated_minutes = 5`.
- Shared worktime now caps implausible stale durations only when an estimate exists and the raw value is both over 4 hours and more than 6x the estimate.
- Period/hourly aggregations in overview, efficiency cards, monthly report, requester analysis, CSV hourly export, and Telegram `/effective` now share the started-at/worktime helper path.
