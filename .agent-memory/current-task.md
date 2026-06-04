# Current Task

Last updated: 2026-06-04 12:48:28 +02:00

## Task

Fix the overview `Entwicklung zum Vormonat` tile so it compares current month
against previous month as an actual EUR revenue delta.

## Scope

- `dashboard/assets/app.js`
- `tests/overview-render.test.js`
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Keep the implementation local because the behavior is contained in one
  shared frontend render file and one render contract test.
- [x] Add failing tests for EUR-based previous-month display and signed
  revenue-delta percentages.
- [x] Change monthly comparison from current/previous share to
  `(current EUR - previous EUR) / previous EUR`.
- [x] Render the previous-month amount as a EUR amount using the existing
  Frankfurter `fxRates` conversion.
- [x] Update comparison colors to match delta semantics: negative red, zero
  yellow, positive green.
- [x] Deploy runtime files to production.
- [x] Verify focused render tests, full JS test suite, live asset contents,
  server PHP 8.4 lint, live root HTTP 200, and unauthenticated API 401.

## Notes

- If `fxRates` are unavailable, the tile falls back to the original currency
  display rather than rendering a misleading EUR amount.
- Browser automation reached the login page, so authenticated DOM verification
  was replaced by live asset verification plus render tests.
