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
- Before broad staging, verify `config.php` is ignored:

```powershell
git check-ignore -v config.php
```
