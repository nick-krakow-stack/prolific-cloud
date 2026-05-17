# Next Steps

Last updated: 2026-05-17

## Immediate

- Commit and push roadmap Phase 1 + Phase 2 product changes.
- Owner should log in at `https://prolific.nickkrakow.de/` and visually verify the overview cards with real data.
- After visual verification, continue with Phase 3/4 candidates: efficiency, top studies, and daily chart data.

## Phase 1 + Phase 2 Work Split

Potential parallel Sub-Agent ownership:

- Backend Agent: `api/data.php`, `config.example.php` if goals config is added.
- Frontend Rendering Agent: `dashboard/assets/app.js` render helpers and dashboard HTML.
- CSS Agent: `dashboard/assets/style.css` cards, progress bars, status pills, responsive layout.
- QA/Review Agent: read-only review of data contracts, root routing, auth, and verification gaps.

The Orchestrator should integrate cross-file contracts and keep shared-file edits sequenced.

## Deployment Routine

- Use SSH alias `prolific-cloud`.
- Use webroot `/www/htdocs/w021974e/prolific.nickkrakow.de`.
- Dry-run deploy command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-webspace.ps1 -DryRun
```

- Real deploy command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-webspace.ps1
```

- The helper uploads only runtime files by default.
- If a task explicitly changes real config, use `-IncludeConfig` to upload `config.php` deliberately.

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
