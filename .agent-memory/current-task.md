# Current Task

Last updated: 2026-06-08 02:32:00 +02:00

## Task

Fix statistics heatmap totals so each day shows all earned Prolific income, including pending/AWAITING REVIEW amounts, matching the overview `Heute` semantics per day.

## Scope

- `dashboard/assets/app.js`
- `tests/roadmap-rest-render.test.js`
- memory files

## Requirements

- Calendar heatmap day intensity and displayed amount must use earned + pending amounts.
- Future/empty day behavior must stay unchanged.
- Existing EUR-first statistics formatting must remain intact.
- Backend stats contract should remain compatible because it already exposes pending values.

## Checklist

- [x] Confirm root cause in API/frontend data flow.
- [x] Add/update a failing regression test for heatmap earned+pending totals.
- [x] Implement the minimal renderer/API fix.
- [x] Run focused and full verification.
- [x] Deploy runtime files to production.
- [x] Verify live browser output where feasible.
- [x] Update memory and git status.

## Verification Notes

- Root cause: `api/data.php` already returns `earned` and `pending` per heatmap day, but `renderHeatmap()` and `renderDailyStatsCard()` rendered only `earned`.
- Red test first: `tests/roadmap-rest-render.test.js` failed on heatmap earned+pending and income-history earned+pending expectations.
- Focused test passed after implementation: `node tests\roadmap-rest-render.test.js`.
- Full JS test suite passed: all `tests\*.js` via Node.
- `node --check dashboard\assets\app.js` passed.
- `git diff --check` passed after trimming hook-written trailing whitespace in `.agent-memory/feedback.md`.
- Runtime deploy completed with `scripts/deploy-webspace.ps1`.
- Live asset check confirmed deployed `dashboard/assets/app.js` contains the combined day-total renderer.
- Live browser check on `https://prolific.nickkrakow.de/` confirmed the `Statistiken` tab heatmap is visible and renders EUR-first combined daily values.
