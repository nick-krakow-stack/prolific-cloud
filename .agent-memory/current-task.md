# Current Task

Last updated: 2026-06-05 17:20:12 +02:00

## Task

Switch the `Statistiken` tab money displays to EUR-first formatting with the
original currencies in parentheses.

## Scope

- `dashboard/assets/app.js`
- `tests/roadmap-rest-render.test.js`
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Delegate read-only statistics renderer mapping to a Sub-Agent.
- [x] Add regression coverage for EUR-first statistics money rendering.
- [x] Add shared frontend helpers for EUR-first original-currency display.
- [x] Update statistics heatmap, daily income history, monthly comparison,
  requester analysis, monthly report, top studies, and embedded studies list.
- [x] Deploy runtime files to production.
- [x] Verify focused/full Node tests, JS syntax, server PHP 8.4 lint, and live
  JS delivery.

## Notes

- Target display format is `€ XX,XX (£ XX,XX + $ XX,XX)`.
- Hourly values use the same format with `/h` after the parenthesized original
  currencies.
- Signed deltas keep an explicit sign before the EUR-first amount.
- Top overview tiles and non-statistics areas were intentionally left on their
  existing display rules unless they are rendered inside `Statistiken`.
