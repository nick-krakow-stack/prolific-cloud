# Handoff

Last updated: 2026-06-05 17:47:04 +02:00
Update mode: Manual

## Latest Notes

Fixed the live `Statistiken` EUR-first rendering issue. The frontend JS was
already deployed correctly, but `/api/data.php?type=stats` lacked `fxRates`.
`build_stats_response()` now returns the stored Frankfurter rates, and browser
verification on production shows EUR-first values in the stats heatmap,
monthly comparison, requester analysis, monthly report, and top studies.

Runtime files were deployed to production. Focused/full Node tests, JS syntax,
server PHP 8.4 lint for `api/data.php`, live browser verification, and
`config.php` ignore check passed.

Current task status is tracked in .agent-memory/current-task.md. Owner, browser,
and review feedback are persisted in .agent-memory/feedback.md.

## Git Snapshot

- Branch: main
- Last commit: 0962aeb Render statistics amounts in EUR

## Working Tree

~~~text
 M .agent-memory/current-state.md
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M api/data.php
 M tests/roadmap-rest-render.test.js
~~~

## Current State Summary

See .agent-memory/current-state.md.

## Next Planned Work

See .agent-memory/next-steps.md.

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
