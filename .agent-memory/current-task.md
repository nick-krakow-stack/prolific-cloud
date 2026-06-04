# Current Task

Last updated: 2026-06-04 22:45:00 +02:00

## Task

Add `Testable Minds` to the generic `Zusatzeinkommen` tab as a USD income
source with date and amount input, including local logos for Testable Minds and
UserTesting.

## Scope

- `api/_misc_income.php`
- `dashboard/assets/app.js`
- `dashboard/assets/style.css`
- `dashboard/assets/testable-minds-logo.svg`
- `dashboard/assets/user-testing-logo.svg`
- `scripts/deploy-webspace.ps1`
- `tests/misc-income-backend-source.test.js`
- `tests/misc-income-render.test.js`
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Keep implementation local because the backend data model already supports
  date, currency, and amount without a schema migration.
- [x] Add failing source/render tests for the new category, form, logos, and
  deploy assets.
- [x] Add `testable_minds` as a valid generic USD amount category.
- [x] Add a Testable Minds form with date and USD amount.
- [x] Add local Testable Minds and UserTesting logo assets.
- [x] Keep the existing Frankfurter `fxRates` path for EUR display and overview
  aggregation.
- [x] Deploy runtime files to production.
- [x] Verify focused tests, full JS test suite, JS syntax, server PHP 8.4 lint,
  live asset delivery, live root HTTP 200, and unauthenticated API 401.

## Notes

- No DB migration is required because `misc_income_entries` already stores
  category, date, amount, and currency.
- Testable Minds entries are stored in USD and are included in the existing
  `monthByCurrency` summary; overview EUR totals continue to use Frankfurter
  rates through the existing `fxRates` conversion path.
- Browser automation reached the login page, so authenticated DOM verification
  was replaced by render tests and live asset verification.
