# Current Task

Last updated: 2026-05-19 16:50:00 +02:00

## Task

Polish the monthly forecast verdict in the overview dashboard.

## Scope

- `dashboard/assets/app.js`
- `dashboard/assets/style.css`
- `tests/overview-render.test.js`
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Inspect forecast renderer and existing status-card CSS.
- [x] Move the forecast verdict from a normal status row into a large centered callout.
- [x] Color forecast verdict green/red/neutral based on forecast outcome.
- [x] Add responsive CSS so the card remains readable on mobile.
- [x] Add regression coverage for the forecast callout and CSS hooks.
- [x] Deploy and verify live assets.

## Notes

- The forecast card now renders `Ziel wird voraussichtlich erreicht` or
  `Ziel wird voraussichtlich verfehlt` as a prominent bottom-aligned verdict.
- The callout uses green glow for reached, red glow for missed, and muted neutral
  styling if no forecast verdict is available.
