# Current Task

Last updated: 2026-05-19

## Task

Fix implausible `Arbeitszeit heute` value in overview.

## Scope

- `api/_worktime.php`
- `api/data.php`
- `dashboard/assets/app.js`
- relevant tests
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Trace source of `Arbeitszeit heute` from API to UI.
- [x] Reproduce/inspect production aggregate that yields `45 h 56 min`.
- [x] Fix root cause without hiding valid worktime.
- [x] Add/update focused regression coverage.
- [x] Deploy and verify live.
- [x] Commit product changes.
- [ ] Commit memory changes and push.

## Notes

- Root cause: worktime buckets used `completed_at` fallback to `started_at`, which assigned a multi-day participation fully to the completion day.
- Worktime period buckets now use `started_at` fallback to `completed_at`, so worktime belongs to the day/week/month the work started in.
- Period contribution is capped by the available period window to prevent one row from exceeding the current period's elapsed time.
- Live production check after deploy now reports today as `6720` paid seconds (`1 h 52 min`) plus `120` unpaid seconds (`2 min`).
- Product commit: `b81a65a Fix worktime period aggregation`.
