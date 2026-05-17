# Current State

Last updated: 2026-05-17

## Project

`prolific-cloud` is a plain PHP/MySQL cloud dashboard for Prolific Watcher. It
receives sync data from the Chrome extension and renders a private dashboard for
earnings, studies, submissions, account balance, logs, and future analytics.

## Repository

- Local path: `C:\Users\email\prolific-cloud`
- GitHub remote: `https://github.com/nick-krakow-stack/prolific-cloud.git`
- Main branch: `main`
- Initial commit pushed: `3b66524 Initial dashboard backup`
- `config.php` is intentionally ignored and must stay local.

## Runtime Files

- `.htaccess`: root routing, HTTPS/security headers, hides sensitive files.
- `api/_common.php`: config loading, DB connection, JSON helpers, auth helpers, settings helpers.
- `api/sync.php`: authenticated extension sync endpoint.
- `api/data.php`: authenticated dashboard data endpoint.
- `dashboard/session.php`: secure session helpers and login/logout logic.
- `dashboard/index.php`: login page and internal dashboard loader.
- `dashboard/app.php`: dashboard shell and tab markup.
- `dashboard/assets/app.js`: vanilla JS API calls and rendering.
- `dashboard/assets/style.css`: responsive dashboard styling.

## Setup Files

- `config.example.php`: template for local/server configuration.
- `install.php`: one-time DB setup script; remove from production after setup.
- `hash-generator.php`: one-time helper for password hash/API key/session secret; remove from production after setup.
- These setup files are intentionally kept in GitHub for backup/reinstallation,
  but excluded from normal SSH deployments to the live webspace.

## Architecture Summary

- There is no framework and no build step.
- The visible domain root `/` loads `dashboard/index.php` through `.htaccess`.
- If logged in, `dashboard/index.php` includes `dashboard/app.php` directly so
  `/dashboard/` or `/app.php` do not need to appear in the URL.
- Frontend API base is `/api/data.php`.
- Session auth protects dashboard data; API key auth protects extension sync.
- DB state is stored in MySQL tables created by `install.php`: `studies`,
  `submissions`, `settings`, `events`, and `sync_log`.

## Production Deployment

- Hosting: All-Inkl file-based PHP webspace.
- Domain: `https://prolific.nickkrakow.de/`.
- SSH alias: `prolific-cloud` configured locally in `~/.ssh/config`.
- SSH host: `w021974e.kasserver.com`.
- Webroot: `/www/htdocs/w021974e/prolific.nickkrakow.de`.
- Server PHP CLI: `PHP 7.4.33-nmm8`.
- Server DB client: `MariaDB 10.6.23`.
- Server `config.php` is present and must remain server-side.
- `install.php`, `hash-generator.php`, and `config.example.php` are absent on production.
- Keep setup files in GitHub, but do not upload them to production during normal operation.
- Normal deploy command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-webspace.ps1
```

Normal deploys upload only runtime files: `.htaccess`, `api/`, and `dashboard/`.
If a task explicitly changes real configuration, deploy `config.php` deliberately
with `scripts/deploy-webspace.ps1 -IncludeConfig`. Never commit or print
`config.php`.

## Current Product Direction

`CODEX_PROLIFIC_WATCHER_ROADMAP.md` defines the active roadmap. The first
implementation target is Phase 1 + Phase 2:

- extend `/api/data.php?type=overview` with `goals`, `forecast`,
  `pendingStats`, `statusStats`, and `todayStats`
- render expanded dashboard cards in `dashboard/assets/app.js`
- add modern cards, progress bars, and status pills in `dashboard/assets/style.css`
- preserve all existing tabs and root routing

Phase 1 + Phase 2 is implemented in the working tree and deployed to production:

- `api/data.php` adds `goals`, `forecast`, `pendingStats`, `statusStats`, and `todayStats`.
- `dashboard/assets/app.js` renders earnings, two Prolific account tiles
  (`Auszahlbar`, `In Prüfung`), goals, forecast, today, pending, and status cards.
- `dashboard/assets/style.css` adds overview card/progress/status UI components.
- `config.example.php` documents optional `goals` defaults; live `config.php` was not changed.
- The topbar sync lamp is green only when the last Watcher sync is fresh
  (10 minutes or newer) and red when no fresh sync is available.
- The old `Prolific-Konto` status box, `Gesamt offen`, and balance update row
  are no longer shown in the overview.
- The remaining overview roadmap block is implemented and deployed: overview now has
  `efficiency`, `topStudies`, `dailyStats`, and `system` data; the frontend renders
  efficiency/hourly rates, top studies, a 30-day daily earnings chart, system
  health, and EUR equivalents from the `prolific-watcher` Frankfurter.app
  `fxRates` structure (`base: GBP`, `rates.EUR`, `rates.USD`).

## Operating Model

- Codex acts as Orchestrator only.
- Implementation should be delegated to Sub-Agents whenever tooling supports it.
- Prefer multiple focused Sub-Agents for independent work with separate file ownership.
- The Orchestrator integrates and reviews all Sub-Agent results.
- Completed or unused Sub-Agents should be closed when the environment provides
  a real close/stop mechanism; hooks should not pretend to close in-process agents.
- GitHub is the only remote target.

## Verification Notes

- GitHub CLI is installed at `C:\Program Files\GitHub CLI\gh.exe` and authorized.
- Local `php` was not available in PATH during initial setup.
- `node` availability should be checked before JS syntax verification.
- Server PHP lint passed after Phase 1 + Phase 2 deploy.
- Live HTTP checks after deploy: `/` returns login page, unauthenticated `/api/data.php?type=overview` returns `401`.
- Sync lamp change verified with `node --check`, a JS state test, deploy, server
  PHP lint, and live unauthenticated HTTP checks.
- Account tile adjustment verified with `node --check`, a JS render-state test,
  deploy, server PHP lint, and live unauthenticated HTTP checks.
- Remaining overview block currently has a dedicated Node render contract test at
  `tests/overview-render.test.js`.
- Deployment verification for the remaining overview block passed: `node --check`,
  `tests/overview-render.test.js`, `php74`/`php84` lint on `api/data.php`,
  server-side PHP lints for runtime files, live root `200`, unauthenticated
  overview API `401`, asset delivery checks, and direct server DB query smoke test.
- A final read-only review found one P2 hardening issue; `fmtAmount()` now
  sanitizes unknown currency codes before rendering, covered by the overview
  render contract test.
- The remaining roadmap items are implemented and deployed: stats/account/system/settings
  tabs, calendar heatmap, monthly comparison, CSV export, monthly report,
  study notes, requester analysis, settings for goals/quality thresholds, and
  study quality tags.
- `study_notes` was migrated on production with
  `migrations/2026-05-17-create-study-notes.sql`; `install.php` includes the
  table for future reinstall backup, but setup and migration files are still not
  uploaded by normal deploys.
- New session write endpoints are hardened with `X-Requested-With`/same-origin
  checks, and CSV export neutralizes spreadsheet formula prefixes.
- Browser review fix: the former `Log` tab is now labelled `Sync-Status`.
  `/api/data.php?type=events` returns a `syncStatus` summary, and the detailed
  event log is hidden behind a collapsed `Log` disclosure by default.
- Browser review fix: the settings tab uses slider controls plus exact GBP
  number inputs and saves changes automatically through the existing protected
  `/api/data.php?type=settings` POST route.
- Before broad staging, verify `config.php` is ignored:

```powershell
git check-ignore -v config.php
```
