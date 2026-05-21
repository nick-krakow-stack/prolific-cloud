# Current Task

Last updated: 2026-05-21 21:25:00 +02:00

## Task

Fix effective hourly-rate calculations so Pending rewards are included wherever
paid worktime already includes Pending.

## Scope

- `api/data.php`
- `api/_telegram_commands.php`
- `dashboard/assets/app.js`
- related Node source/render tests
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Delegate backend and frontend read-only audits to focused Sub-Agents.
- [x] Identify the mixed status basis: paid worktime included `AWAITING REVIEW`,
  but several reward sums used only `APPROVED` and `SCREENED OUT`.
- [x] Add failing regression checks for overview, month stats, worktime source,
  and Telegram effective hourly.
- [x] Route dashboard effective hourly, efficiency, goal detail stats,
  monthly report hourly/top/requester stats, and Telegram `/effective` through
  paid reward statuses.
- [x] Deploy runtime files to the live webspace.
- [x] Verify JavaScript tests, server PHP 8.4 lint, live root HTTP 200, and
  unauthenticated API 401.

## Notes

- `paid_reward_statuses()` is now the shared dashboard status set for effective
  paid work: `APPROVED`, `SCREENED OUT`, `SCREENED-OUT`, and `AWAITING REVIEW`.
- The separated visible `earned` and `pending` maps are unchanged; only the
  calculations that are supposed to represent achieved/paid work now use the
  combined status basis.
