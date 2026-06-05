# Progress

- 2026-05-17 - Browser review fix deployed: `Heute`, `Aktueller Monat`,
  settings money controls, `Monatsprognose`, `Effizienz / Stundenlohn`, and
  `Top-Studien` now render money values and effective hourly averages in Euro
  using the stored Frankfurter/fxRates data. The top earnings tiles and
  `Pending-Ãœbersicht` remain in original currencies.
- 2026-05-17 - Browser review fix deployed: overview now shows `Heute` and
  `Aktueller Monat` as two side-by-side goal cards with circular progress
  rings instead of bars. Rings are red below 50%, yellow below 95%, green from
  95%, and support a blue outer overflow ring above 100%. The overview API now
  exposes `monthStats`, and the monthly card includes `Teilnahmen`,
  `Ã˜ pro Teilnahme`, and `Effektiver Stundenlohn`.
- 2026-05-17 - Browser review fix deployed: the top overview comparison tile
  is now labelled `Vormonat`, shows previous month sums without a repeated
  prefix, and color-codes the comparison percentage: red below 95%, yellow from
  95% through 105%, green above 105%.
- 2026-05-17 - Browser review fix deployed: `System-Health` was removed from
  the overview dashboard and moved to the bottom of the settings tab. The
  settings endpoint now includes the same system health payload used by the
  dashboard renderer.
- 2026-05-17 - Browser review fix deployed: replaced dashboard UI wording
  `Samples` with German `Studie`/`Studien` for efficiency basis and monthly
  report hourly-rate basis. Live browser verification showed `1 Studie Â· 10 Min`
  and no `Samples` text.
- 2026-05-17 - Browser review fix deployed: overview now merges the former
  `Tagesziel` card and the separate `Heute` stats card. The card title is
  `Heute`, keeps `Fortschritt`, `Erreicht`, and `Noch offen`, then shows
  `Teilnahmen`, `Ã˜ pro Teilnahme`, and `Effektiver Stundenlohn`. The old
  `Verdient` and `Ausstehend` rows in the separate today detail card are gone.
  Live browser verification showed one `HEUTE` status card and no `TAGESZIEL`.
- 2026-05-17 - Browser review fix deployed: overview Tagesziel and Monatsziel
  now calculate progress from `earned + pending` in GBP. `earned` already
  includes `APPROVED`, `SCREENED OUT`, and `SCREENED-OUT` with effective reward
  adjustments; pending adds `AWAITING REVIEW`. The goal label remains
  `Erreicht`. Live browser verification showed `TAGESZIEL` at `Â£7,16 von
  Â£30,00` and `MONATSZIEL` at `Â£157,13 von Â£600,00`.
- 2026-05-17 - Browser review fix deployed: overview `Vergleich` now renders as
  a top earnings tile. The main value compares current month to previous month
  as a percentage using FX-aware EUR conversion when rates are available, and
  the subline keeps the previous month amounts. The old wide comparison box was
  removed.
- 2026-05-17 - Browser review fix deployed: overview daily/monthly goal cards
  now read saved `dashboardGoals` via `load_dashboard_settings()` instead of
  using config defaults. Live browser verification showed `Â£30,00` daily and
  `Â£600,00` monthly targets.
- 2026-05-17 - Browser review fix deployed: manual refresh now spins the
  refresh icon, disables double-click refresh during the request, and shows a
  subtle page-level `Aktualisiere...` loading overlay for the active tab.
- 2026-05-17 - Reward calculation fix deployed: dashboard totals, stats,
  requester analysis, top studies, CSV export, and submission cards now use an
  effective reward amount derived from base reward plus adjustment plus bonus,
  with a screened-out fallback and raw reward fallback.
- 2026-05-17 - Browser review fix deployed: study cards now render reward,
  duration, places, hourly rate, and seen time as responsive detail tiles
  instead of a compact dot-separated meta line.
- 2026-05-17 - Browser review fix deployed: study notes were removed from the
  dashboard runtime. Study cards no longer render note fields/buttons, the
  notes API is no longer deployed, and the old server `api/notes.php` was
  removed. Existing production DB table was left untouched to avoid data loss.
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
  `In PrÃ¼fung` now render as overview tiles; the old account status box was removed.
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
  historical php74/php84 lints, authenticated CLI endpoint smoke tests, public auth checks,
  asset checks, and setup-file absence checks.
- 2026-05-18 - Production PHP version changed in All-Inkl/KAS to PHP 8.4.
  Live root/API/asset smoke checks and remote `php84 -l` checks passed.
- 2026-05-18 - Telegram backend phase 1 implemented and deployed: config
  placeholders, webhook secret generator, `telegram_messages` table, Telegram
  helper, webhook endpoint with `/start`, `/help`, `/status`, and webhook
  registration with Telegram.
- 2026-05-17 14:14:24 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-17 14:14:58 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-17 17:31:52 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-17 17:31:57 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-17 17:36:07 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-17 17:36:11 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-17 17:56:24 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-17 17:56:29 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-17 18:04:47 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-17 18:04:50 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-17 18:19:52 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-17 18:19:54 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-17 18:33:41 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-17 18:33:44 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-17 19:33:35 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-17 19:33:38 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-17 19:49:29 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-17 19:49:33 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 - Browser review fix deployed: removed the dedicated `Studien`
  navigation item and moved studies to the bottom of `Statistiken`. The section
  shows active, not-expired studies by default and expands the full study list
  with existing filters/pagination via `Alle Studien anzeigen`; after expansion
  the same button stays in place as `Studien ausblenden`.
- 2026-05-18 - Browser review fix deployed: calendar heatmap in `Statistiken`
  now supports previous/next month navigation plus `Heute`; next month is
  disabled in the current server month, and the stats API returns historical
  heatmap day buckets through today.
- 2026-05-18 01:19:08 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 01:19:17 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 01:47:46 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 01:47:50 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 02:05:47 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 02:05:49 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 02:27:36 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 02:27:39 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 02:50:26 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 - Telegram command expansion backend implemented locally:
  command parsing/dispatch moved into `api/_telegram_commands.php`, approved
  backend commands and metadata added, `api/data.php?type=telegramCommand` added
  behind session/write protection, and deploy script now uploads the shared
  command file. Relevant Telegram Node source tests pass. Local PHP CLI is not
  available in PATH, but PHP 8.4 lint passed via temporary `/tmp` upload on the
  configured `prolific-cloud` SSH host.
- 2026-05-18 09:05:38 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 09:06:08 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 09:06:11 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:06:16 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 09:08:03 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:13:25 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 09:17:35 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 09:19:23 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 09:19:55 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 09:20:18 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 09:23:26 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 09:26:38 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:26:52 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:27:13 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:28:40 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:29:08 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:30:52 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:36:06 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:38:07 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:40:49 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:42:26 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:44:56 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:47:12 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:49:33 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:50:40 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:52:40 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 09:55:03 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 - Overview pending-goal fix completed and deployed: top period
  tiles now include pending amounts in the primary total and label the pending
  share as `Davon ... ausstehend`; `Heute` and `Aktueller Monat` goal cards,
  their SVG progress rings, and the monthly forecast use the same
  earned-plus-pending basis. Added asset filemtime cache busters to prevent
  stale dashboard assets after deploy. Full JavaScript source tests and live
  browser verification passed.
- 2026-05-18 - Goal-ring color progression implemented and deployed. The
  `Heute` and `Aktueller Monat` SVG rings now use a continuous percent-based
  stroke color: 0-5 red, 5-50 red-to-yellow, 50-98 yellow-to-green, 98-100
  green, and over 100 keeps the existing blue overflow ring. Full JavaScript
  tests passed and live browser DOM verification confirmed concrete SVG stroke
  attributes with no old CSS stroke overrides.
- 2026-05-18 10:01:47 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 11:40:58 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 11:41:37 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 11:44:02 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 11:45:53 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 11:45:59 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 11:46:04 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 11:46:04 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 11:47:15 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 11:47:19 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 11:47:57 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 11:49:26 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 11:53:01 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 11:54:45 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 12:01:02 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 12:03:06 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 12:05:46 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 12:08:07 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 12:08:26 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 12:08:51 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 12:12:58 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 12:13:05 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 12:13:19 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 - Worktime backend and effective hourly-rate update completed and
  deployed. Added shared `api/_worktime.php` helpers, overview `worktime`
  periods, dashboard worktime/effective-hourly cards, CSV hourly fallback,
  Telegram `/worktime` and `/effective`, and source coverage. Hourly
  calculations now use `time_taken_seconds` with a 60-second fallback for raw
  zero/missing values and a 60-second minimum for screened-out submissions.
  Full JS/source tests, remote PHP 8.4 lint, and the deployment helper passed.
- 2026-05-18 - Corrected misleading `+ 1478 h 30 min ohne VergÃ¼tung` worktime
  display. Root cause was stale large `time_taken_seconds` values on
  `RETURNED`/`TIMED-OUT` rows without `completed_at`. Unpaid worktime for those
  incomplete negative rows now uses the one-minute fallback; dashboard and
  Telegram wording now says `Davon ... unbezahlt`.
- 2026-05-18 - Fixed missing submissions status donut chart. Root cause was the
  chart relying on inline `conic-gradient` styles while CSP blocks inline style
  attributes. Replaced the submissions pie with CSP-safe SVG circle segments,
  kept the legend/summary layout, added render coverage, and deployed.
- 2026-05-18 12:23:02 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 12:23:54 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 12:25:31 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 12:25:37 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 12:32:48 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 12:55:24 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 12:56:13 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 13:01:13 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 13:02:31 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 13:04:17 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 13:07:39 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 15:23:11 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 15:24:36 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 15:25:54 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 15:26:29 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 15:27:24 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 15:27:39 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 15:30:05 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 15:30:17 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 15:50:15 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 15:50:34 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 15:54:03 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 15:54:27 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 15:56:14 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 15:56:27 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 15:57:02 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 15:57:25 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 16:14:51 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 16:15:18 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 16:15:49 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 16:16:05 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 16:16:44 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 16:18:36 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 16:39:58 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 16:40:16 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 16:55:32 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 16:56:31 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 16:56:50 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 16:57:21 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 16:58:11 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 16:58:38 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 16:59:23 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 16:59:55 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:00:35 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:01:05 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:01:27 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:01:55 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:03:34 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:04:08 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:04:36 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:05:11 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:05:16 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:05:48 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:06:02 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:06:46 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:07:13 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:07:47 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:16:00 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:16:55 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:19:57 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:21:07 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:21:37 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:22:33 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:23:02 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:33:00 +02:00 - Drafted `docs/superpowers/specs/2026-05-18-zusatzeinkommen-design.md` after owner asked to stop further upfront clarification and proceed with the agreed `Zusatzeinkommen` scope.
- 2026-05-18 17:36:00 +02:00 - Wrote `docs/superpowers/plans/2026-05-18-zusatzeinkommen.md` with backend, API, frontend, CSS, verification, deploy, and Sub-Agent split tasks.
- 2026-05-18 17:31:24 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:31:40 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:36:34 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:38:18 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:45:26 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:45:49 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:47:40 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:49:49 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:53:51 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:53:55 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:53:58 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:55:09 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:55:11 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:55:14 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 17:56:08 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 17:57:42 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 18:01:41 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 18:04:14 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 18:18:00 +02:00 - Implemented, reviewed, deployed, and server-migrated the `Zusatzeinkommen` tab with defensive schema reads, explicit write-route schema checks, dashboard overview integration, source/render/PHP calculation tests, and updated runtime deploy helper.
- 2026-05-18 18:19:03 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 23:38:47 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 23:50:00 +02:00 - Moved `Zusatzeinkommen` to the far-right nav position after `Einstellungen` with a separator, deployed the UI change, and captured the future extension-control channel idea for Telegram pause and dashboard-triggered sync.
- 2026-05-18 23:44:29 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 23:51:57 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-18 23:52:56 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 23:52:56 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 23:54:19 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-18 23:54:26 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 00:09:16 +02:00 - Polished dashboard review items: centered Requester-Analyse metric columns, fixed exact EUR goal display by passing saved EUR target values through overview API/UI, modernized `Zusatzeinkommen` manual session form layout, added regression/source tests, deployed runtime files, and verified production with PHP 8.4 lint and HTTP 200.
- 2026-05-19 00:12:33 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 08:09:53 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 08:15:24 +02:00 - Corrected the `Zusatzeinkommen > Session nachtragen` form after owner screenshot review: replaced the overflowing three-column grid with a bounded two-column layout, raised toggle selector specificity so the checkbox aligns horizontally, added regression coverage, deployed runtime files, and verified live CSS plus HTTP 200.
- 2026-05-19 08:20:03 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 08:32:50 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 08:34:05 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 08:34:09 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 08:34:11 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 08:35:55 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 08:58:00 +02:00 - Fixed `Zusatzeinkommen` manual-session submit by using the actual submitted form for `FormData`, replaced inline Start/Ende inputs with a single Zeitraum button plus compact Start/Ende modal, made the calendar icon white, added render/source regression coverage, deployed runtime files, and verified Node checks, server PHP 8.4 lint, live HTTP 200, and deployed asset markers.
- 2026-05-19 08:47:53 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 09:53:13 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 09:55:00 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 10:00:25 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 10:12:00 +02:00 - Added `Zusatzeinkommen` Free Messages: separate `free_message_count` input for manual sessions and timer stop, fixed 10-cent calculation in `api/_extra_income.php`, separate weekly/session summary fields, install schema update, backend/render tests, production deploy, deliberate `extra_income_sessions.free_message_count` migration, server PHP 8.4 lint, schema check, and live HTTP 200 verification.
- 2026-05-19 10:14:33 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 10:30:03 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 10:31:05 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 10:32:59 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 10:34:36 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 10:50:00 +02:00 - Updated `Zusatzeinkommen` backend contracts and implementation for explicit `extra_income_sessions.night_bonus_message_count`: source contract was made red first, the schema/install/payload/persistence/split/calculation/response paths were updated, and local verification passed with `node tests/extra-income-backend-source.test.js`; local PHP CLI was unavailable.
- 2026-05-19 10:58:00 +02:00 - Completed explicit `Zusatzeinkommen` night-bonus message count end to end: replaced the UI checkbox with `Nachtbonus-Nachrichten`, added `night_bonus_message_count` to payloads and session display, deployed runtime files, migrated production schema, verified server PHP 8.4 lint, calculation contract, schema readiness, example calculation `113:3:39:1425`, and live HTTP 200.
- 2026-05-19 10:40:49 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 10:48:52 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 11:34:44 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 11:36:14 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 12:23:04 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 12:28:00 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 12:28:24 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 12:34:20 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 12:36:46 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 12:50:00 +02:00 - Renamed the existing chatmoderator `Zusatzeinkommen` UI to `Arbeit-Zuhause`, added a separate generic `Zusatzeinkommen` tab for Tech-Support and User Testing, created/deployed `api/_misc_income.php`, migrated production schema `misc_income_entries`, widened the Arbeit-Zuhause range picker into a calendar-style modal, and verified local Node tests plus server PHP 8.4 lint/schema smoke checks.
- 2026-05-19 12:58:34 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 13:12:02 +02:00 - Captured owner feedback on UserPromptSubmit.

- 2026-05-19 13:17:00 +02:00 - Moved the dashboard tab separator left of generic Zusatzeinkommen, updated render contract tests for the new order, deployed runtime files, and verified Node render tests, server PHP 8.4 lint, live HTTP 200, and config.php ignore status.
- 2026-05-19 13:18:47 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 13:20:17 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 13:27:04 +02:00 - Captured owner feedback on UserPromptSubmit.

- 2026-05-19 13:30:58 +02:00 - Updated overview additional-income tile: comparison now appears first, the tile is labeled Zusatzeinkommen, shows current-month total across Arbeit-Zuhause plus generic Tech-Support/User Testing entries, uses a distinct teal visual style, and was deployed with Node/source tests plus server PHP 8.4 lint and live HTTP 200 verification.
- 2026-05-19 13:33:17 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 13:38:11 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 13:41:30 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 14:05:00 +02:00 - Fixed the Arbeit-Zuhause range picker calendar click sequence: first calendar click now sets only the start date, second click sets the end date, earlier second dates swap start/end, and clicks after a complete range begin a new range. Widened/rebalanced the modal to a 1080px date-range layout and added focused Node regression coverage plus updated render contract.
- 2026-05-19 13:44:58 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 13:47:30 +02:00 - Deployed the Arbeit-Zuhause date-range picker fix to production. Verification passed: node syntax check, focused range-picker regression test, extra-income render contract, overview/misc render contracts, git diff check, config.php ignore check, server PHP 8.4 lint for dashboard/app.php and api/data.php, live root HTTP 200, and live app.js HTTP 200.
- 2026-05-19 13:52:49 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 16:07:30 +02:00 - Fixed implausible overview worktime: production diagnosis showed one multi-day approved submission with 158,676 raw seconds was assigned entirely to the completion day. Worktime buckets now anchor to started_at, cap contributions by the period window, and production now reports today as 6,720 paid seconds plus 120 unpaid seconds instead of 165,398 paid seconds. Deployed and verified with Node source/render tests, server PHP 8.4 lint, live HTTP 200, and a server-side aggregate smoke check.
- 2026-05-19 15:57:40 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 15:59:07 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 16:01:12 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 16:11:29 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 16:14:19 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 16:15:32 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 16:15:32 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 16:15:34 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 16:15:36 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 16:15:37 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-19 16:15:43 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 16:17:21 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 16:17:51 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-19 16:35:00 +02:00 - Completed the dashboard-wide worktime audit/fix. Backend hourly aggregations now use the shared started-at worktime helper instead of direct SQL seconds sums, requester stats and monthly report use the same corrected path, CSV and Telegram top/effective paths get study estimates, and implausible stale timers are capped against study estimates. Deployed to production and verified with Node tests, server PHP 8.4 lint, live root HTTP 200, expected unauthenticated API 401, and server-side worktime smoke checks.
- 2026-05-19 16:50:00 +02:00 - Polished the overview monthly forecast verdict: the forecast outcome is now a large bottom-aligned green/red callout with subtle glow, mobile sizing, and render/CSS regression coverage. Deployed to production and verified live assets plus root/API responses.
- 2026-05-19 16:54:27 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-21 21:09:08 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-21 21:10:10 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-21 21:10:13 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-21 21:10:19 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-21 21:10:23 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-21 21:10:27 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-21 21:10:30 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-21 21:12:06 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-21 21:12:37 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-21 21:25:00 +02:00 - Fixed Pending exclusion in effective hourly calculations. Dashboard overview now uses paid reward statuses for today/month stats, efficiency cards, top studies, and monthly report requester/hourly/top calculations; the effective hourly KPI cards include pending reward in their numerator; Telegram `/effective` uses the same paid status set. Deployed to production and verified with all Node tests, remote PHP 8.4 lint, live root HTTP 200, and unauthenticated overview API 401.
- 2026-05-21 21:26:53 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-22 13:16:52 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-22 13:27:06 +02:00 - Removed the duplicate two-card effective-hourly row from the overview and moved the four-card `Effizienz / Stundenlohn` row into its former position after the worktime cards. Added render contract coverage, deployed runtime files, and verified Node tests, browser DOM on production, server PHP 8.4 lint, live HTTP 200, and unauthenticated API 401.
- 2026-05-22 13:31:32 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-05-22 13:39:56 +02:00 - Linked the overview `Auszahlbar` tile to the Prolific Balance Hub in a new browser tab, preserved the tile styling, added render contract coverage, deployed runtime files, and verified production DOM link attributes.
- 2026-05-22 13:31:35 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-05-22 13:44:18 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-06-04 12:38:35 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-04 12:39:16 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-04 12:48:28 +02:00 - Fixed overview monthly comparison semantics: current and previous month are converted to EUR via Frankfurter `fxRates`, percentage now shows actual revenue delta relative to previous month, previous-month subline renders as EUR, and negative/zero/positive deltas map to red/yellow/green. Deployed runtime files and verified focused/full JS tests plus live asset/server checks.
- 2026-06-04 12:53:42 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-06-04 22:27:06 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-04 22:45:00 +02:00 - Added Testable Minds to the generic `Zusatzeinkommen` tab as a USD date/amount source, added local Testable Minds and UserTesting logo assets, kept EUR display on the existing Frankfurter `fxRates` path, deployed runtime files, and verified focused/full JS tests plus live asset/server checks.
- 2026-06-04 22:39:55 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-06-04 22:45:19 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-04 22:45:50 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-06-04 23:19:05 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-04 23:24:54 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-04 23:38:00 +02:00 - Consolidated User Testing and Testable Minds
  in the generic `Zusatzeinkommen` tab into one portal form with provider
  dropdown, type dropdown (`Umfrage`/`Aufgabe`), date, USD amount, and dynamic
  logo switching. Kept provider storage in the existing category column, kept
  legacy `test` types readable, deployed runtime files, and verified full Node
  tests plus server PHP 8.4 lint and live asset delivery. Authenticated browser
  DOM verification was blocked by the in-app browser being on the login page.
- 2026-06-04 23:38:27 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-06-05 00:51:15 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-05 01:05:00 +02:00 - Moved the generic `Zusatzeinkommen` portal
  logo into the top-right corner of the portal card with a dedicated
  `misc-income-brand--corner` class and responsive padding. Added render
  contract coverage, deployed runtime files, verified the full Node test suite,
  JS syntax, server PHP 8.4 lint, and live JS/CSS asset delivery. Authenticated
  browser DOM verification was blocked by the in-app browser being on the login
  page.
- 2026-06-05 00:59:15 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-06-05 01:43:57 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-05 02:05:00 +02:00 - Centered the dashboard top tab navigation on
  desktop with a responsive CSS rule while preserving mobile horizontal scroll.
  Added `tests/nav-layout-render.test.js`, deployed runtime files, and verified
  focused/full Node tests, JS syntax, server PHP 8.4 lint, and live CSS delivery.
- 2026-06-05 01:52:18 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-06-05 16:03:27 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-05 16:20:00 +02:00 - Added `Testbirds` and `Respondent` to the
  generic `Zusatzeinkommen` portal provider dropdown and backend allow-list.
  Providers use the existing USD date/type/amount flow, no schema migration was
  required, and providers without local logo assets hide the corner logo cleanly.
  Deployed runtime files and verified focused/full Node tests, JS syntax, server
  PHP 8.4 lint, and live JS delivery.
- 2026-06-05 16:09:52 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-06-05 17:02:27 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-05 17:03:35 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-05 17:04:15 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-05 17:04:57 +02:00 - Stop hook ran and refreshed central memory snapshot.
- 2026-06-05 17:05:56 +02:00 - Captured owner feedback on UserPromptSubmit.
- 2026-06-05 17:20:12 +02:00 - Switched `Statistiken` money rendering to
  EUR-first format with original currencies in parentheses across heatmap,
  income history, monthly comparison, requester analysis, monthly report/top
  studies, and the embedded studies list. Added render regression coverage,
  deployed runtime files, and verified focused/full Node tests, JS syntax,
  server PHP 8.4 lint, and live JS delivery markers.
