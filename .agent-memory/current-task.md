# Current Task

Last updated: 2026-06-04 23:38:00 +02:00

## Task

Consolidate generic `Zusatzeinkommen` survey/task portals into one reusable
portal form with provider dropdown, type dropdown, date, and USD amount.

## Scope

- `api/_misc_income.php`
- `dashboard/assets/app.js`
- `tests/misc-income-backend-source.test.js`
- `tests/misc-income-render.test.js`
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Add/update failing contracts for a generic portal form.
- [x] Keep `Tech-Support` as its own EUR hours/rate form.
- [x] Replace separate `User Testing` and `Testable Minds` forms with one
  `miscIncomePortalForm`.
- [x] Add provider dropdown for `User Testing` and `Testable Minds`.
- [x] Add type dropdown with `Umfrage` and `Aufgabe`; keep backend support for
  legacy `test` entries.
- [x] Update portal logo switching when provider changes.
- [x] Deploy runtime files to production.
- [x] Verify focused tests, full JS test suite, JS syntax, server PHP 8.4 lint,
  live asset delivery, and browser login-state limitation.

## Notes

- No DB migration is required. Provider identity remains stored in the existing
  `category` column (`user_testing`, `testable_minds`).
- Portal entries use USD amounts and the existing Frankfurter `fxRates` path for
  EUR display and overview aggregation.
- Browser DOM verification could not inspect the authenticated dashboard because
  the in-app browser was on the login page. Live asset verification confirmed
  the deployed JS contains the new form and no old separated form IDs.
