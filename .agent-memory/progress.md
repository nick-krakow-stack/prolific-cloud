# Progress

- 2026-05-17 - Browser review fix deployed: monthly report month labels now
  render in German format, e.g. `Mai 2026`, while the API keeps `YYYY-MM`.
- 2026-05-17 - Browser review fix deployed: requester analysis now renders as a
  responsive table with columns for requester, count, earnings, hourly rate, and
  approval rate.
- 2026-05-17 - Browser review fix deployed: calendar heatmap now uses a
  7-column current-month grid and dims future days.
- 2026-05-17 - Browser review fix deployed: global page links now use a warm
  near-white/yellow color instead of default/primary blue.
- 2026-05-17 - Browser review fix deployed: settings now use modern slider
  controls plus exact GBP inputs and debounced autosave with inline status.
- 2026-05-17 - Browser review fix deployed: `Log` is now `Sync-Status`, with
  last sync summary rows and the detailed event log collapsed by default.
- 2026-05-17 - Initial project backup committed and pushed to GitHub.
- 2026-05-17 - GitHub CLI installed and owner authorized it.
- 2026-05-17 - Roadmap file added to workspace.
- 2026-05-17 - Reference workflow from `prolific-watcher` inspected and adapted for `prolific-cloud`.
- 2026-05-17 - SSH key-based access to All-Inkl webspace verified.
- 2026-05-17 - Production webroot confirmed as `/www/htdocs/w021974e/prolific.nickkrakow.de`.
- 2026-05-17 - Runtime-only deploy helper added at `scripts/deploy-webspace.ps1`.
- 2026-05-17 - Deploy helper updated to support explicit `-IncludeConfig` config uploads.
- 2026-05-17 - Deployment rule clarified: setup files stay in GitHub but are excluded from live webspace updates.
- 2026-05-17 - Roadmap Phase 1 + Phase 2 overview metrics implemented.
- 2026-05-17 - Runtime files deployed to All-Inkl webspace.
- 2026-05-17 - Server PHP lint and live unauthenticated HTTP checks passed after deploy.
- 2026-05-17 - Topbar sync lamp changed to green for fresh Watcher sync and red otherwise.
- 2026-05-17 - Prolific account overview simplified: `Auszahlbar` and
  `In Prüfung` now render as overview tiles; the old account status box was removed.
- 2026-05-17 - Remaining overview roadmap block implemented locally:
  efficiency, top studies, daily earnings chart, system health, and EUR
  equivalents based on the `prolific-watcher` Frankfurter.app `fxRates` structure.
- 2026-05-17 - Final review finding fixed: unknown currency codes are sanitized
  before being rendered in dashboard HTML.
- 2026-05-17 - Remaining overview roadmap block deployed to All-Inkl webspace
  and verified with server lints, asset checks, HTTP checks, and DB query smoke test.
- 2026-05-17 - Rest of roadmap implemented: stats/account/system/settings tabs,
  calendar heatmap, monthly comparison, CSV export, monthly report, study notes,
  requester analysis, settings, and quality tags.
- 2026-05-17 - `study_notes` production migration applied and verified.
- 2026-05-17 - Rest-roadmap runtime files deployed to All-Inkl and verified with
  php74/php84 lints, authenticated CLI endpoint smoke tests, public auth checks,
  asset checks, and setup-file absence checks.
- 2026-05-17 14:14:24 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-17 14:14:58 +02:00 - Stop hook ran and refreshed central memory snapshot.
