# Current Task

Last updated: 2026-06-05 17:47:04 +02:00

## Task

Fix `Statistiken` EUR-first rendering on production after the frontend change
still showed original currencies.

## Root Cause

The frontend formatter was deployed correctly, but `/api/data.php?type=stats`
did not include `fxRates`. Therefore `amountEurWithOriginal()` correctly fell
back to original currencies in the `Statistiken` tab.

## Scope

- `api/data.php`
- `tests/roadmap-rest-render.test.js`
- memory files

## Checklist

- [x] Reproduce the issue in the live in-app browser.
- [x] Verify that production loaded the new `app.js?v=1780672518`.
- [x] Identify missing `fxRates` in the stats API response as root cause.
- [x] Add a failing regression test for the stats endpoint FX contract.
- [x] Add `fxRates` to `build_stats_response()`.
- [x] Deploy runtime files to production.
- [x] Verify live `Statistiken` text renders EUR-first.
- [x] Verify focused/full Node tests, JS syntax, server PHP 8.4 lint, and
  `config.php` ignore status.

## Notes

- Browser verification after deploy showed examples such as
  `€11,47 (£5,95 + $5,34)` in the heatmap and EUR-first requester/monthly
  report values.
- No database migration was required.
