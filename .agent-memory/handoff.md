# Handoff

Last updated: 2026-06-05 19:33:28 +02:00
Update mode: Stop

## Latest Notes

The overview top period tiles and previous-month comparison were updated and
deployed.

- `Heute`, `Diese Woche`, `Dieser Monat`, and `Gesamt` still include pending
  rewards in the main amount.
- Their subline now shows only the EUR equivalent (`≈ €...`) instead of
  `Davon ... ausstehend`.
- `/api/data.php?type=overview` exposes `earnings.lastMonthComparable` for the
  previous month through the same elapsed month day count.
- The overview comparison tile compares current month-to-date against that
  comparable previous-month period on an earned-plus-pending EUR basis.
- Live browser verification showed `Mai: €20,44 in den ersten 5 Tagen` under
  `Entwicklung zum Vormonat`.

Current task status is tracked in `.agent-memory/current-task.md`.
Owner, browser, and review feedback are persisted in `.agent-memory/feedback.md`.

## Git Snapshot

- Branch: main
- Last commit before this task: `dcbe202 Provide FX rates to statistics endpoint`
- New product/memory changes are present in the working tree and should be
  committed after final verification.

## Working Tree

Expected modified files:

```text
 M .agent-memory/current-state.md
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M api/data.php
 M dashboard/assets/app.js
 M tests/month-stats-source.test.js
 M tests/overview-render.test.js
```

## Verification

- `node tests\overview-render.test.js`: passed.
- `node tests\month-stats-source.test.js`: passed.
- Full Node test suite under `tests/*.test.js`: passed.
- `node --check dashboard\assets\app.js`: passed.
- `git diff --check`: passed after trimming a hook-written trailing space in
  `.agent-memory/feedback.md`.
- Local `php` is not in PATH.
- Production deploy completed via `scripts/deploy-webspace.ps1`.
- Server `php84 -l` passed for `api/data.php`, `dashboard/app.php`, and
  `dashboard/index.php`.

## Required Startup For Next Agent

1. Read `AGENTS.md`.
2. Read `.agent-memory/current-state.md`.
3. Read this handoff.
4. Read `.agent-memory/next-steps.md`.
5. Read `CODEX_PROLIFIC_WATCHER_ROADMAP.md`.
6. Run `git status --short`.
