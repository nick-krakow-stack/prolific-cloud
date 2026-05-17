# Next Steps

Last updated: 2026-05-17

## Immediate

- Verify the adapted Codex workflow files.
- Commit workflow/protocol setup separately from product changes.
- Start `CODEX_PROLIFIC_WATCHER_ROADMAP.md` Phase 1 + Phase 2.

## Phase 1 + Phase 2 Work Split

Potential parallel Sub-Agent ownership:

- Backend Agent: `api/data.php`, `config.example.php` if goals config is added.
- Frontend Rendering Agent: `dashboard/assets/app.js` render helpers and dashboard HTML.
- CSS Agent: `dashboard/assets/style.css` cards, progress bars, status pills, responsive layout.
- QA/Review Agent: read-only review of data contracts, root routing, auth, and verification gaps.

The Orchestrator should integrate cross-file contracts and keep shared-file edits sequenced.

## Backlog

- Dashboard account card with native balance structure support.
- Daily/monthly goals and forecast.
- Today statistics.
- Pending overview.
- Status distribution.
- Effective hourly-rate metrics.
- Top studies.
- Daily earnings bars and later heatmap.
- EUR conversion when `fxRates` are available.
- System health card.
- CSV export and monthly report after the dashboard foundation is stable.
