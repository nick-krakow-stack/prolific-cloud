# Handoff

Last updated: 2026-05-22 13:27:06 +02:00
Update mode: Stop

## Latest Notes

The duplicate two-card effective-hourly row was removed from the overview.
The four-card `Effizienz / Stundenlohn` row now renders directly after the
worktime cards and before the goal cards. Runtime files were deployed to
production and verified.

## Git Snapshot

- Branch: main
- Last commit: 5df57cf Update memory for pending hourly fix

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
- Do not write secrets, DB credentials, tokens, passwords, raw bearer tokens, session secrets, or personal Prolific data into memory files.
- Keep config.php local and ignored.
- Preserve root routing through / and absolute frontend paths.
