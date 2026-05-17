# Current Task Checklist

Last updated: 2026-05-18

## Active Task Checklist

- [x] Add previous/next/today controls to the stats calendar heatmap.
- [x] Disable the next-month button while the selected month is the current server month.
- [x] Render selected previous months as complete month grids.
- [x] Extend the stats API heatmap data from current-month-only to historical day buckets.
- [x] Deploy and verify the live heatmap month navigation.

## Previous Active Task Checklist

- [x] Remove the dedicated `Studien` navigation item and `panel-studies`.
- [x] Add a `Studien` section at the bottom of the `Statistiken` tab.
- [x] Show only currently active and not-expired studies in that section by default.
- [x] Add `Alle Studien anzeigen` to expand the full study list inside `Statistiken`.
- [x] Keep the expand button in place after opening and change its label to `Studien ausblenden`.
- [x] Reuse the existing study filter, date range, pagination, and lazy-load controls for the expanded list.
- [x] Make the stats tab fetch fresh study data so active studies update with normal refresh/auto-refresh.
- [x] Deploy and verify the live navigation and stats-study behavior.

- [x] Add `monthStats` to the overview API for monthly participation details.
- [x] Convert `Heute` and `Monatsziel` into side-by-side goal cards.
- [x] Replace goal progress bars with circular progress rings.
- [x] Color goal rings red below 50%, yellow below 95%, and green from 95%.
- [x] Add blue outer overflow ring support above 100%.
- [x] Rename `Monatsziel` to `Aktueller Monat`.
- [x] Add `Teilnahmen`, `Ø pro Teilnahme`, and `Effektiver Stundenlohn` to the monthly goal card.
- [x] Convert `Heute` and `Aktueller Monat` goal-card amounts to Euro.
- [x] Convert settings money controls to Euro while saving stored GBP values.
- [x] Convert `Monatsprognose` values to Euro.
- [x] Convert `Effizienz / Stundenlohn` and `Top-Studien` values to Euro.
- [x] Keep top earnings tiles and `Pending-Übersicht` in original currencies.
- [x] Deploy Euro analytics conversion and verify production overview.
- [x] Deploy and verify the new goal cards on production.
- [x] Rename the top comparison tile label from `Vergleich` to `Vormonat`.
- [x] Remove the duplicate `Vormonat:` prefix from the comparison tile subline.
- [x] Color-code the comparison percentage: `<95` red, `95-105` yellow, `>105` green.
- [x] Deploy and verify the updated comparison tile on production.
- [x] Remove `System-Health` from the overview dashboard.
- [x] Add `System-Health` to the bottom of the settings tab.
- [x] Include system health data in the settings API response.
- [x] Deploy the System-Health relocation and verify production files.
- [x] Replace `Samples` wording with `Studie`/`Studien` in dashboard UI.
- [x] Add render tests for pluralized study wording.
- [x] Deploy terminology fix and verify live efficiency card.
- [x] Merge daily goal and today stats into one `Heute` overview card.
- [x] Keep `Fortschritt`, `Erreicht`, and `Noch offen` in the merged card.
- [x] Move `Teilnahmen`, `Ø pro Teilnahme`, and `Effektiver Stundenlohn` into the merged card.
- [x] Remove `Verdient` and `Ausstehend` rows from the old today detail card.
- [x] Deploy merged today card and verify live overview.
- [x] Diagnose goal progress data flow for earned, pending, and screened-out rewards.
- [x] Add failing frontend and backend-source tests for goal progress including pending rewards.
- [x] Update backend goal and forecast basis to `earned + pending`.
- [x] Update overview goal cards to calculate GBP progress from `earned + pending`.
- [x] Keep the visible goal label as `Erreicht`.
- [x] Deploy goal progress fix and verify live goal cards.
- [x] Move monthly comparison into the top overview tile grid.
- [x] Show comparison as current month versus previous month percentage.
- [x] Keep previous month amounts as the comparison tile subline.
- [x] Remove the old wide `Vergleich` status box.
- [x] Deploy comparison tile fix and verify live overview.
- [x] Fix overview goals to use saved dashboard settings.
- [x] Add regression check for overview/settings goal source.
- [x] Deploy settings-goals fix and verify live goal cards.
- [x] Animate refresh button while manual refresh requests are running.
- [x] Add page-level loading overlay for manual refresh.
- [x] Deploy refresh loading animation and verify live assets.
- [x] Diagnose Reward/Adjustment-Berechnung mit echten Server-Aggregaten.
- [x] Add regression tests for effective reward totals and submission rendering.
- [x] Implement central effective reward helper for backend reads and sync writes.
- [x] Apply effective reward totals to dashboard aggregations, CSV export, and UI.
- [x] Deploy reward calculation fix to production and verify live aggregates.
- [x] Replace compact study meta line with responsive detail tiles.
- [x] Deploy study detail tile review fix to production and verify runtime files.
- [x] Remove study note fields and save buttons from study cards.
- [x] Remove notes API from runtime deploy and production webspace.
- [x] Deploy study-notes removal and verify runtime files.
- [x] Format monthly report month labels in German, e.g. `Mai 2026`.
- [x] Deploy monthly report month-label review fix to production and verify runtime files.
- [x] Convert requester analysis to a column table.
- [x] Label requester columns: Anzahl, Verdienst, Stundenlohn, Approval-Rate.
- [x] Deploy requester analysis review fix to production and verify runtime files.
- [x] Change calendar heatmap to a 7-column current-month grid.
- [x] Fill future days in the current month and show them dimmed.
- [x] Deploy heatmap review fix to production and verify runtime files.
- [x] Change global page link color from blue to warm near-white yellow.
- [x] Deploy link color review fix to production and verify runtime files.
- [x] Modernize settings UI with sliders, polished number fields, and autosave.
- [x] Deploy settings autosave review fix to production and verify runtime files.
- [x] Implement browser review: summarize the Log tab as `Sync-Status`.
- [x] Keep the detailed event log available in a collapsed `Log` disclosure.
- [x] Deploy Sync-Status review fix to production and verify runtime files.
- [x] Add failing render contract for remaining roadmap UI.
- [x] Add backend stats, account, system, and settings endpoints.
- [x] Add CSV export.
- [x] Remove study notes again after owner review.
- [x] Add stats/account/system/settings tabs and renderers.
- [x] Add heatmap/monthly report/requester/settings styling.
- [x] Deploy completed roadmap block to production.
- [x] Verify production after completed roadmap deployment.
- [ ] Ask owner to visually verify full roadmap implementation after login.

## Completed Task Steps

- [x] GitHub CLI installed and authorized.
- [x] Initial project backup pushed to `origin/main`.
- [x] Roadmap file received in the workspace.
- [x] Reference workflow in `C:\Users\email\prolific-watcher` inspected.
- [x] Prolific Cloud protocol files adapted from the reference project.
- [x] Imported Codex workflow files verified.
- [x] Hook script smoke check passed.
- [x] Workflow/protocol setup committed and pushed separately from product changes.
- [x] SSH key-based login to All-Inkl webspace verified.
- [x] Remote webroot identified.
- [x] Runtime-only deploy helper added.
- [x] Backend overview extended with Phase 1 + Phase 2 metrics.
- [x] Overview frontend rendering extended.
- [x] Overview CSS components added.
- [x] Runtime files deployed to production webspace.
- [x] Server PHP lint passed after deploy.
- [x] Live unauthenticated HTTP checks passed.
- [x] Sync lamp changed to green for fresh Watcher sync and red otherwise.
- [x] Sync lamp change deployed and verified.
- [x] `Log` tab renamed to `Sync-Status`; it now shows last sync status,
  last successful sync, last failure, and a collapsed detailed log.
- [x] Settings tab modernized with range sliders, exact GBP fields, debounced
  autosave, and inline save status.
- [x] Global text links now use a warm near-white/yellow link color instead of
  blue; tabs, controls, and focus rings keep their existing interaction colors.
- [x] Calendar heatmap now renders all days of the current server month in a
  7-column grid, with future days dimmed.
- [x] Requester analysis now renders as a responsive table with columns for
  requester, count, earnings, hourly rate, and approval rate.
- [x] Prolific account status box removed from overview.
- [x] `Auszahlbar` and `In Prüfung` rendered as overview tiles below the first four earnings tiles.

