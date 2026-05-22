# Current Task

Last updated: 2026-05-22 13:39:56 +02:00

## Task

Make the overview `Auszahlbar` tile open the Prolific Balance Hub in a new
browser tab.

## Scope

- `dashboard/assets/app.js`
- `dashboard/assets/style.css`
- `tests/overview-render.test.js`
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Keep the change local because it is a small shared frontend render change
  with no safe parallel write split.
- [x] Add a failing render contract for the external balance-hub link.
- [x] Extend the overview tile helper to support link tiles.
- [x] Link `Auszahlbar` to `https://app.prolific.com/balance-hub` with
  `target="_blank"` and `rel="noopener noreferrer"`.
- [x] Preserve the tile visual style and avoid default blue link styling.
- [x] Deploy runtime files to production.
- [x] Verify Node render tests, JS syntax, and live production DOM attributes.

## Notes

- The `In Prüfung` balance tile remains a normal dashboard tile.
- The linked tile uses the same `earning-tile` structure plus
  `earning-tile-link`.
