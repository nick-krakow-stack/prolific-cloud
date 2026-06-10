# Current Task

Last updated: 2026-06-10 17:35:00 +02:00

## Task

Add `User Interviews` to the generic `Zusatzeinkommen` survey/task portal provider list.

## Scope

- `api/_misc_income.php`
- `dashboard/assets/app.js`
- `tests/misc-income-backend-source.test.js`
- `tests/misc-income-render.test.js`
- memory files

## Checklist

- [x] Add failing provider contract tests.
- [x] Add backend category and USD-category support.
- [x] Add frontend label/dropdown support.
- [x] Run focused and relevant verification.
- [x] Deploy runtime files.
- [x] Update memory and git status.

## Verification Notes

- Red tests first: `tests/misc-income-render.test.js` and `tests/misc-income-backend-source.test.js` failed on missing `user_interviews` / `User Interviews`.
- Focused tests passed after implementation.
- Full Node test suite under `tests/*.js` passed.
- `node --check dashboard/assets/app.js` passed.
- Local `php` is not available in PATH, so local PHP lint could not run.
