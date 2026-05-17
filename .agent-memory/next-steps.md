# Next Steps

Last updated: 2026-05-17

## Immediate

- Owner should log in at `https://prolific.nickkrakow.de/` and do a full
  browser review across all tabs with real data.
- Collect review notes as a batch before starting the next fix pass.

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

- Review fixes from owner feedback.
- Optional hardening: stronger CSRF token, if the private dashboard later gets
  broader exposure.
- Optional polish: split large `dashboard/assets/app.js` after the review pass.
- Optional future features beyond the current roadmap.
