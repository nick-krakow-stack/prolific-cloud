# Handoff

Last updated: 2026-05-19 00:09:16 +02:00
Update mode: Manual

## Latest Notes

Latest completed work: dashboard review polish was implemented and deployed.
Requester-Analyse metric columns are centered while requester names remain left aligned.
Overview goal cards now receive exact saved EUR goal values from `api/data.php`
and render target/remaining values without EUR -> GBP -> EUR rounding drift.
`Zusatzeinkommen` manual session form now uses a scoped responsive field grid.
Tests added/updated: exact EUR goal display, requester alignment, extra-income
form CSS/markup contracts.

## Git Snapshot

- Branch: main
- Last commit before this task: c42a729 Update memory for tab order and watcher control

## Working Tree

~~~text
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M api/data.php
 M dashboard/assets/app.js
 M dashboard/assets/style.css
 M tests/extra-income-render.test.js
 M tests/overview-render.test.js
 M tests/roadmap-rest-render.test.js
 M tests/settings-goals-source.test.js
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
