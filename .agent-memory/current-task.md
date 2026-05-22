# Current Task

Last updated: 2026-05-22 13:27:06 +02:00

## Task

Remove the duplicate two-card effective-hourly row and move the four-card
`Effizienz / Stundenlohn` row into that position in the overview.

## Scope

- `dashboard/assets/app.js`
- `dashboard/assets/style.css`
- `tests/overview-render.test.js`
- `tests/roadmap-rest-render.test.js`
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Keep the change local because the task touches one shared frontend file
  and cannot be split into disjoint implementation write scopes.
- [x] Add failing render contract checks for the requested row position and
  removal of the duplicate KPI row.
- [x] Remove the old `effective-hourly-grid` renderer and CSS.
- [x] Render the four-tile efficiency card immediately after the worktime cards.
- [x] Deploy runtime files to production.
- [x] Verify Node render tests, JS syntax, browser DOM on production, server
  PHP 8.4 lint, live root HTTP 200, and unauthenticated API 401.

## Notes

- The `Effizienz / Stundenlohn` row remains the single source for today, week,
  month, and total hourly metrics.
- The removed row had duplicated month and total values already shown in the
  four-card efficiency row.
