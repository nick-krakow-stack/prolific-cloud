# Handoff

Last updated: 2026-05-17 19:01:53 +02:00
Update mode: Manual

## Latest Notes

The overview comparison tile now matches owner feedback: label `Vormonat`,
percentage as the main value, previous month sums as the subline without a
duplicate prefix, and percentage color classes for red/yellow/green thresholds.

## Git Snapshot

- Branch: main
- Last product commit: f1ecd8b Refine previous month comparison tile
- Last memory commit: pending this task

## Working Tree

~~~text
 M .agent-memory/current-state.md
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M dashboard/assets/app.js
 M dashboard/assets/style.css
 M tests/overview-render.test.js
~~~

## Verification Snapshot

- Red test failed before implementation:
  - `node tests\overview-render.test.js`
- Green checks passed:
  - `node --check dashboard/assets/app.js`
  - `node tests\overview-render.test.js`
  - `node tests\roadmap-rest-render.test.js`
  - `node tests\settings-system-source.test.js`
  - `node tests\goals-progress-source.test.js`
  - `node tests\settings-goals-source.test.js`
  - `git check-ignore -v config.php`
- Deploy helper uploaded runtime files to production.
- Production checks passed: `php74`/`php84` lint on `api/data.php`, root `200`,
  unauthenticated overview API `401`, and deployed file grep for comparison
  value classes.
- In-app browser verification showed the live tile text as `VORMONAT`,
  `1.003,9 %`, `£13,92 + $0,15`; no `Vormonat:` prefix remained, and the value
  used `comparison-value is-good` with computed green color.

## Current State Summary

See .agent-memory/current-state.md.

## Next Planned Work

Owner can continue browser review; next work item is the next review note.

## Required Startup For Next Agent

1. Read AGENTS.md.
2. Read .agent-memory/current-state.md.
3. Read this handoff.
4. Read .agent-memory/next-steps.md.
5. Read CODEX_PROLIFIC_WATCHER_ROADMAP.md.
6. Run git status --short.

## Operating Constraints

- Codex acts as Orchestrator only.
- Delegate implementation to Sub-Agents whenever tooling supports it.
- Keep Sub-Agent write scopes separate for parallel work.
- No Cloudflare deployment workflow applies to this repository.
- Do not write secrets, DB credentials, tokens, passwords, raw bearer tokens,
  session secrets, or personal Prolific data into memory files.
- Keep config.php local and ignored.
- Preserve root routing through / and absolute frontend paths.
