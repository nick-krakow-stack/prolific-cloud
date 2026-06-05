# Current Task

Last updated: 2026-06-05 16:20:00 +02:00

## Task

Add `Testbirds` and `Respondent` as generic portal providers in the
`Zusatzeinkommen` tab.

## Scope

- `api/_misc_income.php`
- `dashboard/assets/app.js`
- `tests/misc-income-backend-source.test.js`
- `tests/misc-income-render.test.js`
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Add failing tests for the two missing providers.
- [x] Allow `testbirds` and `respondent` as USD portal categories in the backend.
- [x] Add both providers to the frontend dropdown and labels.
- [x] Hide the corner logo cleanly for providers without local logo assets.
- [x] Deploy runtime files to production.
- [x] Verify focused tests, full Node test suite, JS syntax, server PHP 8.4 lint,
  and live JS delivery.

## Notes

- No schema migration was required because the existing `category` column stores
  provider identifiers generically.
- `Testbirds` and `Respondent` use the same portal entry model as User Testing
  and Testable Minds: date, type (`Umfrage`/`Aufgabe`), and USD amount.
