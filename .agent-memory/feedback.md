# Feedback

Last updated: 2026-05-17

- 2026-05-17 - Browser feedback: Convert `Heute`, `Aktueller Monat`, settings
  money controls, `Monatsprognose`, `Effizienz / Stundenlohn`, and
  `Top-Studien` to Euro using the existing Frankfurter/fxRates data. Keep the
  top earnings tiles and `Pending-Übersicht` in their original currencies.
- 2026-05-17 - Browser feedback: Convert `Heute` and `Monatsziel` into two
  side-by-side goal tiles, including on mobile. Use circular progress instead
  of bars: below 50% red, 50% through 94.9% yellow, from 95% green. Above 100%,
  show a second blue outer ring for overflow. Rename `Monatsziel` to
  `Aktueller Monat`, and include the same detail rows as `Heute`.
- 2026-05-17 - Browser feedback: The top comparison tile should be labelled
  `Vormonat`, show only the previous month sums in the subline, and color the
  percentage red below 95%, yellow from 95% through 105%, and green above 105%.
- 2026-05-17 - Browser feedback: Move the `System-Health` box out of the
  overview dashboard and place it at the bottom of the settings tab.
- 2026-05-17 - Browser feedback: `Samples` in the efficiency basis is unclear;
  use `Studie`/`Studien` instead.
- 2026-05-17 - Browser feedback: Combine the daily goal card with the separate
  `Heute` detail card. Rename `Tagesziel` to `Heute`, keep `Fortschritt`,
  `Erreicht`, and `Noch offen`, then add `Teilnahmen`, `Ø pro Teilnahme`, and
  `Effektiver Stundenlohn`; remove separate `Verdient` and `Ausstehend` rows.
- 2026-05-17 - Browser feedback: Tagesziel and Monatsziel should count not only
  approved rewards, but also in-review and screened-out payments plus existing
  adjustment logic. The label should remain `Erreicht`.
- 2026-05-17 - Browser feedback: Move the overview `Vergleich` block into the
  top tile grid as a percentage with previous month amounts as subline.
- 2026-05-17 - Browser feedback: Tagesziel and Monatsziel in the overview must
  reflect values saved in the settings tab, not config defaults.
- 2026-05-17 - Browser feedback: The refresh button should visibly animate
  while manual refresh is running, and the page should show a loading animation.
- 2026-05-17 - Owner reported that Prolific adjustments are Zusatzverdienst:
  an approved submission with base reward and adjustment must count both.
- 2026-05-17 - Browser feedback: Study list rows should use small detail
  tiles/cards instead of one compact text line for reward, duration, places,
  hourly rate, and seen time.
- 2026-05-17 - Browser feedback: Study notes are not needed; remove note
  fields/buttons from study cards and remove the notes runtime path.
- 2026-05-17 - Browser feedback: Month values in the monthly report should be
  displayed in German label format, e.g. `Mai 2026` instead of `2026-05`.
- 2026-05-17 - Browser feedback: Requester analysis should have column
  headings and separate columns for count, earnings, hourly rate, and approval
  percentage.
- 2026-05-17 - Browser feedback: Calendar heatmap idea is good, but tiles are
  too wide. Render seven days per row, show every day of the current month, and
  dim future days.
- 2026-05-17 - Browser feedback: Text links across all pages should no longer
  be blue; use a very light warm yellow, almost white, for links.
- 2026-05-17 - Browser feedback: Modernize the settings form with sliders,
  nicer input fields, and automatic saving instead of a manual save row.
- 2026-05-17 - Browser feedback: Rename `Log` to `Sync-Status`, replace the
  long immediate event list with a summary for last sync, last successful sync,
  and last failure, and keep the detailed log collapsed by default.
- 2026-05-17 - Browser feedback: In the overview, remove the `Prolific-Konto`
  status box details except `Auszahlbar` and `In Prüfung`; render those two
  values as the same tile style as the first four overview tiles, one row below.
- 2026-05-17 - Owner wants Codex to act as Orchestrator.
- 2026-05-17 - Owner wants as many parallel Sub-Agents as practical whenever
  tasks can be split without conflicts.
- 2026-05-17 - Owner asked to inspect and fully adapt the hooks and workflow
  instructions from `prolific-watcher` before starting dashboard work.
