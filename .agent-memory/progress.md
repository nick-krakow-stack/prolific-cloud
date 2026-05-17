# Progress

- 2026-05-17 - Browser review fix deployed: `Heute`, `Aktueller Monat`,
  settings money controls, `Monatsprognose`, `Effizienz / Stundenlohn`, and
  `Top-Studien` now render money values and effective hourly averages in Euro
  using the stored Frankfurter/fxRates data. The top earnings tiles and
  `Pending-Übersicht` remain in original currencies.
- 2026-05-17 - Browser review fix deployed: overview now shows `Heute` and
  `Aktueller Monat` as two side-by-side goal cards with circular progress
  rings instead of bars. Rings are red below 50%, yellow below 95%, green from
  95%, and support a blue outer overflow ring above 100%. The overview API now
  exposes `monthStats`, and the monthly card includes `Teilnahmen`,
  `Ø pro Teilnahme`, and `Effektiver Stundenlohn`.
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
  report hourly-rate basis. Live browser verification showed `1 Studie · 10 Min`
  and no `Samples` text.
- 2026-05-17 - Browser review fix deployed: overview now merges the former
  `Tagesziel` card and the separate `Heute` stats card. The card title is
  `Heute`, keeps `Fortschritt`, `Erreicht`, and `Noch offen`, then shows
  `Teilnahmen`, `Ø pro Teilnahme`, and `Effektiver Stundenlohn`. The old
  `Verdient` and `Ausstehend` rows in the separate today detail card are gone.
  Live browser verification showed one `HEUTE` status card and no `TAGESZIEL`.
- 2026-05-17 - Browser review fix deployed: overview Tagesziel and Monatsziel
  now calculate progress from `earned + pending` in GBP. `earned` already
  includes `APPROVED`, `SCREENED OUT`, and `SCREENED-OUT` with effective reward
  adjustments; pending adds `AWAITING REVIEW`. The goal label remains
  `Erreicht`. Live browser verification showed `TAGESZIEL` at `£7,16 von
  £30,00` and `MONATSZIEL` at `£157,13 von £600,00`.
- 2026-05-17 - Browser review fix deployed: overview `Vergleich` now renders as
  a top earnings tile. The main value compares current month to previous month
  as a percentage using FX-aware EUR conversion when rates are available, and
  the subline keeps the previous month amounts. The old wide comparison box was
  removed.
- 2026-05-17 - Browser review fix deployed: overview daily/monthly goal cards
  now read saved `dashboardGoals` via `load_dashboard_settings()` instead of
  using config defaults. Live browser verification showed `£30,00` daily and
  `£600,00` monthly targets.
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
