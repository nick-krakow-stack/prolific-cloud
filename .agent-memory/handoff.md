# Handoff

Last updated: 2026-05-19 08:58:00 +02:00
Update mode: Manual

## Latest Notes

Latest task fixed the `Zusatzeinkommen` manual-session submit alert and date
range entry UI. The browser alert was caused by delegated submit handling using
`event.currentTarget` (`#extraIncomeContent`, a div) instead of the submitted
form when constructing `FormData`. `dashboard/assets/app.js` now resolves the
form through `event.target.closest('form')`. The manual session form keeps
hidden `started_at`/`ended_at` payload fields and opens a compact Start/Ende
date-time modal from a single Zeitraum button with a white calendar icon.

## Git Snapshot

- Branch: main
- Last commit before final staging: 75896bc Update memory for form layout fix

## Working Tree

~~~text
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M dashboard/assets/app.js
 M dashboard/assets/style.css
 M tests/extra-income-render.test.js
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
