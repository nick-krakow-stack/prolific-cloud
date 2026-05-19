# Current Task Checklist

Last updated: 2026-05-19 13:30:58 +02:00

## Active Task: Dashboard Zusatzeinkommen Tile

- [x] Read required repository startup files and current git status.
- [x] Include generic miscIncome data in the overview API response.
- [x] Swap monthly comparison and additional-income dashboard tiles.
- [x] Rename dashboard tile to Zusatzeinkommen and show current-month total for Arbeit-Zuhause, User Testing, and Tech-Support.
- [x] Give the Zusatzeinkommen tile a distinct visual treatment so it is clearly separate from Prolific totals.
- [x] Update render/backend tests and deploy to production.

## Completed Notes

- The dashboard top grid now renders Entwicklung zum Vormonat before Zusatzeinkommen.
- The Zusatzeinkommen tile value is an EUR current-month total across extraIncome.monthGrossCents and miscIncome.summary.monthByCurrency.
- The tile has a subtle teal background/border/value color distinct from the normal Prolific earning tiles.