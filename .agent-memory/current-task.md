# Current Task Checklist

Last updated: 2026-05-19 10:58:00 +02:00

## Active Task: Extra Income Explicit Night Bonus Count

- [x] Read required repository startup files and current git status.
- [x] Delegate backend/schema/calculation work to a Sub-Agent with a disjoint write scope.
- [x] Keep frontend/UI integration local in `dashboard/assets/app.js` and `tests/extra-income-render.test.js`.
- [x] Add failing calculation/source coverage for explicit `night_bonus_message_count`.
- [x] Implement schema, validation, persistence, split allocation, and response fields.
- [x] Replace the UI checkbox with a `Nachtbonus-Nachrichten` number field in the manual form and timer stop modal.
- [x] Update install schema for fresh installs.
- [x] Run deliberate production migration for `extra_income_sessions.night_bonus_message_count`.
- [x] Deploy runtime files to production.
- [x] Run relevant PHP/Node checks and live HTTP verification.
- [x] Update memory files and final git status.

## Current Findings

- Extra-income sessions now use explicit `night_bonus_message_count` for the
  standard 1-cent night bonus instead of a time-window checkbox.
- New behavior calculates night-bonus cents only from explicit
  `night_bonus_message_count`, capped to normal `message_count`.
- Free Messages remain separate and must not count toward night bonus.
- Local `php` is not available in PATH, so only the Node source contract could
  run locally in this session; PHP checks and the calculation contract were run
  on the production server with `php84`.
