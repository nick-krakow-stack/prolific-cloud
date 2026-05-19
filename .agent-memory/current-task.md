# Current Task Checklist

Last updated: 2026-05-19 08:15:24 +02:00

## Active Task: Overview Totals And Goal Progress

- [x] Read required repository startup files and current git status.
- [x] Confirm owner intent: period tiles and the two goal cards must count `earned + pending`.
- [x] Add failing regression coverage for period tiles including pending in the main number.
- [x] Implement period tile labels as `Davon ... ausstehend`.
- [x] Add cache-busting for `/assets/style.css` and `/assets/app.js` in `dashboard/app.php`.
- [x] Fix the two goal/progress cards so progress uses the same `earned + pending` basis as the period tiles.
- [x] Verify progress visualization itself shows the updated percentage, not only the text rows.
- [x] Verify monthly forecast uses the updated current-month basis.
- [x] Deploy runtime files to the live webspace.
- [x] Browser-check the live webspace tab after reload.
- [x] Commit and push product changes.

## Active Task: Goal Ring Continuous Color

- [x] Read required repository startup files and current git status.
- [x] Confirm owner thresholds: 0-5 red, 5-50 red-to-yellow, 50-98 yellow-to-green, 98-100 green, over 100 green plus blue outer ring.
- [x] Add failing render coverage for concrete SVG stroke colors at threshold examples.
- [x] Implement continuous goal-ring stroke color without changing the SVG progress mechanics.
- [x] Verify local tests and syntax checks.
- [x] Deploy runtime files to the live webspace.
- [x] Browser-check live ring stroke colors after reload.
- [x] Commit and push product changes.

## Active Task: Hourly Rate Time Fallback

- [x] Read required repository startup files and current git status.
- [x] Confirm owner rule: hourly-rate calculations use `time_taken_seconds`; if it is 0, use 60 seconds instead.
- [x] Read `WORKTIME-BACKEND-SPEC.md` and merge it into the active scope.
- [x] Map all backend and frontend places that calculate or display time-based hourly rates.
- [x] Add regression tests proving zero-second submissions are counted with a one-minute denominator and worktime appears in API/UI/Telegram.
- [x] Update backend overview/stats/export hourly calculations and add worktime aggregation.
- [x] Update frontend fallback calculations, worktime cards, and effective-hourly KPI display.
- [x] Update Telegram `/worktime` and `/effective` plus command metadata/help.
- [x] Run full JS/source tests and server PHP 8.4 lint.
- [x] Deploy runtime files to the live webspace.
- [x] Browser-check live dashboard for affected areas.
- [x] Commit and push product changes.

## Current Findings

- The top earnings tiles are frontend-rendered from `earnings.*.earned` plus
  `earnings.*.pending`.
- The goal cards now calculate progress from `earned + pending`, including
  foreign-currency pending values when FX rates are available.
- The owner confirmed the issue is not general FX conversion, but the goal
  progress source: it must include `AWAITING REVIEW`/pending.
- The live dashboard uses SVG rings for the two goal cards so progress renders
  reliably instead of depending on CSS `conic-gradient`.
- Sub-Agent tooling is available in this session and should be used. Keep write
  scopes separated and review/integrate results before deployment.
- Worktime implementation adds `api/_worktime.php` with shared effective time
  fallback: raw `time_taken_seconds <= 0` is treated as 60 seconds; screened-out
  submissions are also at least 60 seconds.
- `/api/data.php?type=overview` now exposes `worktime` buckets for today, week,
  month, lastMonth, and allTime. Dashboard overview renders worktime cards and
  effective hourly KPI cards; Telegram exposes `/worktime` and `/effective`.
- The live month worktime bucket after fixing incomplete negative rows is:
  paid `63699` seconds, unpaid `1370` seconds, total `65069` seconds.

## Active Task: Zusatzeinkommen

- [x] Capture initial owner intent for the chat moderator income tab.
- [x] Document clarified billing, bonus, dashboard, and payout rules in
  `.agent-memory/next-steps.md`.
- [x] Confirm hourly-rate basis: gross income before transfer fees.
- [x] Confirm automatic split rounding: whole messages only, original total
  preserved, remainder assigned to the longer time share.
- [x] Confirm money precision: store and calculate integer cents, format only
  for display.
- [x] Stop further upfront clarification per owner request and freeze remaining
  details conservatively.
- [x] Write `docs/superpowers/specs/2026-05-18-zusatzeinkommen-design.md`.
- [x] Self-review and write the implementation plan.
- [x] Commit and push the design spec and implementation plan.
- [x] Split implementation work across backend and frontend Sub-Agents.
- [x] Integrate backend/API, dashboard markup, JS, CSS, install schema, tests,
  and deployment helper updates.
- [x] Run spec and code-quality reviews; fix schema-read hardening findings.
- [x] Verify Node render/source tests and server PHP 8.4 lint/calculation test.
- [x] Deploy runtime files to the live webspace.
- [x] Run the extra-income schema migration deliberately on the server.
- [x] Verify production helper file, schema readiness, deployed tab markup, JS,
  root HTTP 200, and unauthenticated API 401.

## Active Task: Tab Order And Watcher Control Discussion

- [x] Move `Zusatzeinkommen` to the far right after `Einstellungen`.
- [x] Add a visible `|` separator before `Zusatzeinkommen`.
- [x] Update render coverage for the tab order.
- [x] Deploy the runtime UI change to production.
- [x] Review current Telegram mute and sync direction at code level.
- [x] Capture backend-to-extension control idea in next steps.

## Active Task: Dashboard Review Polish

- [x] Read required repository startup files and current git status.
- [x] Use read-only Sub-Agents for goal conversion diagnosis and UI/CSS review.
- [x] Center Requester-Analyse metric columns while keeping requester names left aligned.
- [x] Stop double-converting EUR dashboard goals by returning exact EUR goal settings from the overview API.
- [x] Render goal card target/remaining values from exact EUR settings when available.
- [x] Modernize the `Zusatzeinkommen` manual session form with scoped field-grid classes and responsive layout.
- [x] Add regression/source coverage for exact EUR goal display, requester alignment, and extra-income form classes.
- [x] Run JS render/source checks, PHP 8.4 lint on the server, deploy runtime files, and verify production HTTP 200.

## Active Task: Extra Income Form Layout Correction

- [x] Read required repository startup files and current git status.
- [x] Confirm from owner screenshot that the previous three-column manual session form overflows and the checkbox is misaligned.
- [x] Replace the manual session form grid with a bounded two-column layout and one-column breakpoint.
- [x] Increase CSS selector specificity so the night-bonus toggle overrides the global settings label layout.
- [x] Add regression coverage for the two-column grid and scoped toggle selector.
- [x] Run JS checks, deploy runtime files, and verify the deployed CSS on the webspace.

## Active Task Checklist

- [ ] Add an item.

## Completed Task Steps

- [x] Baseline step.
