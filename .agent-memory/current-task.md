# Current Task Checklist

Last updated: 2026-05-19 12:50:00 +02:00

## Active Task: Rename Arbeit-Zuhause And Add Zusatzeinkommen

- [x] Read required repository startup files and current git status.
- [x] Confirm design with owner: existing chatmoderator tab becomes
  `Arbeit-Zuhause`; new `Zusatzeinkommen` tab sits left of it.
- [x] Delegate backend/persistence for the new generic income entries to a
  Sub-Agent with a disjoint write scope.
- [x] Delegate frontend/UI for new tabs, forms, and range picker to a Sub-Agent
  with a disjoint write scope from backend.
- [x] Integrate Sub-Agent results and resolve contract gaps.
- [x] Add deliberate production DB migration for new generic income table.
- [x] Deploy runtime files to production.
- [x] Run local Node checks and server PHP 8.4 lint/calculation smoke tests.
- [x] Update memory files, commit product changes and memory changes
  separately, and push `main`.

## Completed Notes

- Existing `extraIncome` API remains the chatmoderator/work-from-home backend.
  UI labels now use `Arbeit-Zuhause`; existing calculations remain unchanged.
- New generic `Zusatzeinkommen` is separate from `Arbeit-Zuhause`.
  First categories are `Tech-Support` and `User Testing`.
- Tech-Support entries store date, hours with two decimals, EUR hourly rate
  defaulting to 50, and calculated EUR amount.
- User Testing entries store date, type `Test`/`Umfrage`, and USD amount.
  EUR display uses existing FX conversion when available.
- The Arbeit-Zuhause range picker is a larger modal with quick selections,
  calendar-like month grid, and separate start/end time fields.
- Production schema `misc_income_entries` was created deliberately before
  deploy. Normal deploy still excludes setup files and `config.php`.
