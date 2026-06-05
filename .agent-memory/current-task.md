# Current Task

Last updated: 2026-06-05 19:33:28 +02:00

## Task

Update the overview top earnings tiles and previous-month comparison.

## Scope

- `api/data.php`
- `dashboard/assets/app.js`
- `tests/overview-render.test.js`
- memory files

## Requirements

- Top overview period tiles (`Heute`, `Diese Woche`, `Dieser Monat`, `Gesamt`)
  keep earned + pending in the primary value.
- Their subline no longer says `Davon ... ausstehend`; it shows only the EUR
  equivalent as `≈ €XX,XX`.
- `Entwicklung zum Vormonat` compares the current month-to-date against the
  previous month through the same number of elapsed month days.
- The comparison percentage is based on EUR conversion through the existing
  `fxRates` path.
- The comparison subline shows the previous month label and day count, e.g.
  `Mai: €XX,XX in den ersten 5 Tagen`.

## Checklist

- [x] Add/update failing regression tests.
- [x] Add comparable previous-month period to overview API data.
- [x] Update overview renderer for EUR sublines and comparable comparison.
- [x] Run focused/full verification.
- [x] Deploy runtime files to production.
- [x] Verify live browser output.
- [x] Update memory and git status.

## Verification Notes

- Red tests failed first in `tests/overview-render.test.js` and
  `tests/month-stats-source.test.js`.
- Full Node test suite passed after implementation.
- `node --check dashboard/assets/app.js` passed.
- `git diff --check` passed after trimming a hook-written trailing space in
  `.agent-memory/feedback.md`.
- Production deploy completed through `scripts/deploy-webspace.ps1`.
- Server PHP 8.4 lint passed for `api/data.php`, `dashboard/app.php`, and
  `dashboard/index.php`.
- Live browser verification showed top period tiles with `≈ €...` sublines and
  `Entwicklung zum Vormonat` with `Mai: €20,44 in den ersten 5 Tagen`.
