# Current State

Last updated: 2026-05-18

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
- Production PHP target: PHP 8.4 in All-Inkl/KAS for `prolific.nickkrakow.de`.
- Server PHP CLI check target: `php84`.
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

- Reward calculation fix: `api/_rewards.php` derives effective rewards from
  base reward, adjustment, bonus, screened-out amount, and raw reward fallback.
  Production browser verification showed `HEUTE` as `£1,86` plus pending
  amounts after reload.
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
  `tests/overview-render.test.js`, historical `php74`/`php84` lint on `api/data.php`,
  server-side PHP lints for runtime files, live root `200`, unauthenticated
  overview API `401`, asset delivery checks, and direct server DB query smoke test.
- A final read-only review found one P2 hardening issue; `fmtAmount()` now
  sanitizes unknown currency codes before rendering, covered by the overview
  render contract test.
- The remaining roadmap items are implemented and deployed: stats/account/system/settings
  tabs, calendar heatmap, monthly comparison, CSV export, monthly report,
  requester analysis, settings for goals/quality thresholds, and study quality tags.
- Study notes were removed again after owner review. Study cards no longer
  render note fields/buttons, `/api/notes.php` is removed from runtime deploys
  and the production webspace, and reinstall setup no longer creates
  `study_notes`. The existing production table was left untouched to avoid
  destructive data loss.
- New session write endpoints are hardened with `X-Requested-With`/same-origin
  checks, and CSV export neutralizes spreadsheet formula prefixes.
- Browser review fix: the former `Log` tab is now labelled `Sync-Status`.
  `/api/data.php?type=events` returns a `syncStatus` summary, and the detailed
  event log is hidden behind a collapsed `Log` disclosure by default.
- Browser review fix: the settings tab uses slider controls plus exact GBP
  number inputs and saves changes automatically through the existing protected
  `/api/data.php?type=settings` POST route.
- Browser review fix: normal page links use warm near-white/yellow `--link`
  tokens instead of blue; active tabs, icon buttons, focus rings, and controls
  remain on their existing interaction colors.
- Browser review fix: stats calendar heatmap renders all days of the current
  server month in seven columns and dims future days. Backend still provides
  data through today; the frontend fills the rest of the month visually.
- Browser review fix: stats requester analysis renders as a responsive table.
  Columns are requester, count, earnings, hourly rate, and `Approval-Rate`
  (`APPROVED / (APPROVED + REJECTED)`, pending excluded).
- Browser review fix: the monthly report keeps API month values as `YYYY-MM`,
  but renders them in German display format such as `Mai 2026`.
- Browser review fix: study notes are no longer part of the dashboard UI or
  runtime API.
- Browser review fix: study cards render reward, duration, places, hourly rate,
  and seen time as responsive detail tiles instead of a compact text line.
- Browser review fix: the manual refresh button now wraps its icon in
  `.icon-btn-symbol`, spins while the active tab reloads, disables itself during
  the request, and shows a subtle page-level loading overlay on the active tab.
- Browser review fix: overview daily and monthly goal cards now use saved
  dashboard settings from `dashboardGoals` through `load_dashboard_settings()`,
  so changing values in the settings tab updates the overview.
- Browser review fix: overview monthly comparison is now a top
  `comparison-tile`. It shows current month versus previous month as an
  FX-aware percentage when `fxRates` are available and keeps the previous month
  amounts as the subline. The old wide `Vergleich` status box is removed.
- Browser review fix: overview goal progress for Tagesziel and Monatsziel now
  uses `earned + pending` in GBP. `earned` contains approved and screened-out
  effective rewards, and `pending` contains in-review rewards. The UI label
  remains `Erreicht`, while the normal earnings tiles keep earned and pending
  visually separate.
- Browser review fix: the former `Tagesziel` status card is now the `Heute`
  status card. It combines daily goal progress with the useful today stats:
  `Teilnahmen`, `Ø pro Teilnahme`, and `Effektiver Stundenlohn`. The separate
  today detail card with `Verdient` and `Ausstehend` rows is removed.
- Browser review fix: efficiency and monthly-report basis labels use
  `Studie`/`Studien` instead of `Samples`.
- Browser review fix: `System-Health` is no longer rendered in the overview.
  `/api/data.php?type=settings` now includes `system` data, and the settings
  renderer places the System-Health card below the settings form.
- Browser review fix: the top overview comparison tile is labelled `Vormonat`,
  shows only the previous month sums below the percentage, and color-codes the
  percentage via `comparisonPercentClass()`: below 95 red, 95 through 105
  yellow, above 105 green.
- Browser review fix: overview goal cards (`Heute`, `Aktueller Monat`),
  settings money controls, `Monatsprognose`, `Effizienz / Stundenlohn`, and
  `Top-Studien` render Euro values from stored `fxRates`. Effective hourly
  averages are one converted EUR/h value based on converted reward totals and
  total duration. Top earnings tiles and `Pending-Übersicht` intentionally
  remain in original currencies.
- `/api/data.php?type=overview` now exposes `monthStats` for monthly goal-card
  participation details, including `rewardByCurrency` for EUR hourly averages.
- Browser review fix: the dedicated `Studien` tab was removed. The `Statistiken`
  tab now ends with a `Studien` section that shows only currently active,
  not-expired studies by default. `Alle Studien anzeigen` stays in place as
  `Studien ausblenden` after expansion and toggles the full study list with the
  existing sort/filter/date/pagination controls. The stats tab fetches fresh
  study data alongside stats data, so active studies update with normal refresh
  and auto-refresh.
- Browser review fix: the stats calendar heatmap now has month navigation with
  previous/next buttons, a German month label such as `Mai 2026`, and a `Heute`
  button. The next-month button is disabled in the current server month. The
  stats API now returns historical heatmap buckets from the first available
  submission month through today instead of current-month-only data.
- Telegram command expansion backend is implemented and deployed:
  `api/_telegram_commands.php` owns command parsing, metadata, dispatch, expanded
  command handlers, and dashboard execution; `api/telegram-webhook.php` is back
  to request/security/log/send orchestration; `api/data.php?type=telegramCommand`
  is session/write-protected and sends responses to the configured allowed chat.
  Dashboard asset work was implemented in the system tab. Telegram Node source
  tests and remote PHP 8.4 lint passed for the backend files.
- Browser review fix: the overview top period tiles now count pending rewards in
  the primary total and render the pending share as `Davon ... ausstehend`.
  The `Heute` and `Aktueller Monat` goal cards use the same earned-plus-pending
  basis, including FX conversion for foreign-currency pending values, and render
  SVG progress rings with concrete stroke offsets so progress remains visible on
  production. The monthly forecast uses the same combined current-month basis.
- `dashboard/app.php` adds filemtime cache busters for `/assets/style.css` and
  `/assets/app.js` so live browser tabs stop using stale dashboard assets after
  a deploy.
- The `Heute` and `Aktueller Monat` SVG goal rings now use a continuous
  percent-based stroke color: 0-5% red, 5-50% red-to-yellow, 50-98%
  yellow-to-green, 98-100% green, and >100% keeps the existing blue overflow
  ring. Ring color is rendered as concrete SVG stroke attributes/styles and old
  CSS threshold stroke overrides were removed.
- Worktime tracking is implemented through `api/_worktime.php`. Effective
  hourly-rate calculations use `time_taken_seconds`; raw zero/missing values use
  60 seconds, screened-out rows have a 60-second minimum, and incomplete
  negative rows (`RETURNED`/`REJECTED`/`TIMED OUT` without `completed_at`) use
  60 seconds for the unbezahlt bucket so stale open timers do not dominate the
  dashboard. Worktime periods are anchored to `started_at` rather than
  `completed_at`, so multi-day submissions are not fully assigned to their
  completion day. Period contributions are capped by the available period
  window. Implausible stale completed timers are capped against
  `studies.estimated_minutes` when the raw value is over 4 hours and more than
  6x the study estimate, which keeps dashboard/month/all-time hourly cards from
  being dominated by abandoned Prolific timers. Dashboard overview goal-card
  hourly rates, efficiency cards, monthly report hourly rates, requester
  analysis, CSV export hourly rates, and Telegram `/effective` now use this
  same helper path. The dashboard and Telegram wording is `Davon ... unbezahlt`.
- The submissions status chart uses SVG circle segments instead of inline
  `conic-gradient` styles so the chart remains visible under the strict
  `style-src 'self'` Content-Security-Policy.
- The `Zusatzeinkommen` tab is implemented and deployed for chat moderator
  income. `api/_extra_income.php` owns the billing-week, message-tier, night
  bonus, special bonus, payout fee, timer, session, and payout calculations.
  `/api/data.php?type=extraIncome` is read-only/defensive when the schema is
  missing; write routes require the schema and do not create tables implicitly.
  The production schema was created deliberately via server-side migration after
  deploy. Overview shows an independent `Zusatzverdienste` tile and the `Heute`
  / `Aktueller Monat` goal cards include additional-income rows without adding
  them to Prolific rings or Prolific totals.
- `Zusatzeinkommen` sessions support `free_message_count`. Free Messages pay a
  fixed 10 cents each and are included in gross/net payout and hourly-rate
  calculations, but excluded from the normal weekly tier, night bonus, and
  special bonus thresholds. Production has the `free_message_count` DB column.
- `Zusatzeinkommen` night bonus is implemented as explicit per-session
  `night_bonus_message_count`. New calculations ignore the legacy
  `night_bonus_enabled` checkbox for bonus amount, cap night-bonus messages to
  normal paid `message_count`, and split night-bonus counts proportionally across
  billing weeks while preserving whole-count sums. Production has the
  `night_bonus_message_count` DB column.
- The former `Zusatzeinkommen` chatmoderator area is now labeled
  `Arbeit-Zuhause` and remains backed by `api/_extra_income.php`.
  A separate generic `Zusatzeinkommen` tab exists left of it, backed by
  `api/_misc_income.php` and the `misc_income_entries` table. It currently
  supports `Tech-Support` entries with EUR hours/rate and `User Testing` entries
  with `Test`/`Umfrage` USD amounts. The Arbeit-Zuhause manual-session range
  picker is now a wider modal with quick presets, a calendar-like month grid,
  and separate start/end time inputs. Calendar clicks use a two-step range
  selection: first click sets only start, second click sets end, earlier end
  dates swap cleanly, and a click after a complete range starts a new range.
  The range-picker fix is deployed to production.
- The overview top grid now places `Entwicklung zum Vormonat` before the
  additional-income tile. That tile is labeled `Zusatzeinkommen`, uses a subtly
  different teal treatment to signal that it is separate from Prolific totals,
  and shows the current-month EUR total across Arbeit-Zuhause, User Testing,
  and Tech-Support.
- The overview monthly forecast card renders the forecast verdict as a large
  bottom-aligned callout: green/glowing when the goal is projected to be reached,
  red/glowing when it is projected to be missed, and muted when no verdict is
  available.
- Effective hourly-rate calculations now use the same paid status basis as
  paid worktime: `APPROVED`, `SCREENED OUT`, `SCREENED-OUT`, and
  `AWAITING REVIEW`. This applies to overview goal details, efficiency cards,
  monthly report hourly/top/requester stats, and Telegram `/effective`.
  Visible `earned` and `pending` display buckets remain separate. The former
  duplicate two-card effective-hourly overview row was removed; the four-card
  `Effizienz / Stundenlohn` row now appears directly after the worktime cards.
- The overview `Auszahlbar` tile is a styled external link to
  `https://app.prolific.com/balance-hub` and opens in a new tab with
  `rel="noopener noreferrer"`.
- The overview `Entwicklung zum Vormonat` tile compares current-month and
  previous-month Prolific revenue after converting both sides to EUR through
  the existing Frankfurter `fxRates`. Its percentage is now the actual revenue
  delta relative to previous month, not the reached share of previous month.
  The previous-month subline renders as a EUR amount when FX rates are present.
- The overview top period tiles (`Heute`, `Diese Woche`, `Dieser Monat`,
  `Gesamt`) keep earned plus pending rewards in the primary value, but their
  subline now shows only the EUR equivalent (`≈ €...`) instead of
  `Davon ... ausstehend`. The overview comparison tile uses
  `earnings.lastMonthComparable`, which is the previous calendar month through
  the same elapsed month day count, and compares the same earned-plus-pending
  EUR basis. The subline renders with the German month name and day count, e.g.
  `Mai: €20,44 in den ersten 5 Tagen`.
- The generic `Zusatzeinkommen` tab supports `Tech-Support`, `User Testing`,
  and `Testable Minds`. Testable Minds stores date plus USD amount in the
  existing `misc_income_entries` table, uses the same `fxRates` response for EUR
  display, and is included in the monthly additional-income overview tile.
  Testable Minds and UserTesting logos are local runtime assets under
  `dashboard/assets/`.
- User Testing and Testable Minds are now entered through one reusable portal
  form in `Zusatzeinkommen`: provider dropdown, type dropdown (`Umfrage` or
  `Aufgabe`), date, and USD amount. Provider identity is still stored in the
  existing `category` column (`user_testing`, `testable_minds`), so no schema
  migration was required. Existing legacy `test` entry types remain readable.
- The generic `Zusatzeinkommen` portal form also supports `Testbirds` and
  `Respondent` as USD providers through the same provider/category model.
- The `Statistiken` tab now renders Prolific money values EUR-first with
  original currencies in parentheses, e.g. `€ XX,XX (£ XX,XX + $ XX,XX)`.
  This covers the calendar heatmap, income history, monthly comparison,
  requester analysis, monthly report/top studies, and the studies list embedded
  at the bottom of `Statistiken`. Conversions use the existing Frankfurter
  `fxRates` path; the original currency values remain visible for traceability.
- The stats endpoint explicitly includes `fxRates` in `build_stats_response()`.
  This is required for the EUR-first `Statistiken` rendering; without it the
  frontend intentionally falls back to original GBP/USD amounts.
- The portal logo in the generic `Zusatzeinkommen` card is positioned as a small
  non-interactive top-right corner mark (`misc-income-brand--corner`) instead of
  sitting in the normal form flow. This keeps the provider hint without
  dominating the form layout.
- The top tab navigation is centered on desktop through a
  `@media (min-width: 761px)` rule while keeping the default mobile layout
  left-aligned and horizontally scrollable.
- `scripts/deploy-webspace.ps1` includes `api/_extra_income.php` and
  `api/_misc_income.php` in the runtime deploy list. Normal deploys still
  exclude `install.php`,
  `hash-generator.php`, `config.example.php`, and `config.php`.
- Before broad staging, verify `config.php` is ignored:

```powershell
git check-ignore -v config.php
```
