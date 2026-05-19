# Current Task

Last updated: 2026-05-19

## Task

Fix Arbeit-Zuhause manual-session date-range picker.

## Scope

- `dashboard/assets/app.js`
- `dashboard/assets/style.css`
- `tests/extra-income-render.test.js`
- `tests/extra-income-range-picker.test.js`
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Trace current date-range picker behavior and CSS layout.
- [x] Add failing Node tests for two-click range selection and modal width.
- [x] Fix calendar click sequence without breaking presets.
- [x] Widen and rebalance modal layout.
- [x] Run `node --check dashboard/assets/app.js`.
- [x] Run focused Node tests.
- [x] Deploy runtime files to production.
- [x] Run server/live smoke checks.
- [x] Commit product changes.
- [ ] Commit memory changes and push.

## Notes

- Calendar click behavior now starts a new range with start only when no start exists or a complete range already exists.
- The second calendar click sets the end date; if it is before start, start/end are swapped.
- Presets still set both date fields and the next calendar click starts a new range.
- Deployed to production via `scripts/deploy-webspace.ps1`.
- Server PHP 8.4 lint and live HTTP asset checks passed.
- Product commit: `527af3c Improve work-home range picker`.
- Do not revert or overwrite unrelated working-tree changes.
