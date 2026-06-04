# Handoff

Last updated: 2026-06-04 12:48:28 +02:00
Update mode: Stop

## Latest Notes

The overview `Entwicklung zum Vormonat` tile now converts current and previous
month to EUR through the existing Frankfurter `fxRates` before calculating the
percentage. The displayed percentage is the actual revenue delta relative to
previous month, and the previous-month subline is shown as EUR when FX rates are
available. Runtime files were deployed.

## Git Snapshot

- Branch: main
- Last commit: 11b33b8 Update memory for balance tile link

## Working Tree

~~~text
 M .agent-memory/current-state.md
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M dashboard/assets/app.js
 M tests/overview-render.test.js
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
- Do not write secrets, DB credentials, tokens, passwords, raw bearer tokens, session secrets, or personal Prolific data into memory files.
- Keep config.php local and ignored.
- Preserve root routing through / and absolute frontend paths.
