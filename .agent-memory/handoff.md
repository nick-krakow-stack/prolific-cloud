# Handoff

Last updated: 2026-06-05 01:05:00 +02:00
Update mode: Manual

## Latest Notes

The generic `Zusatzeinkommen` portal logo was moved out of the form flow and
into the top-right corner of the portal card via `misc-income-form--portal` and
`misc-income-brand--corner`. Runtime files were deployed to production. Full
Node tests, JS syntax, server PHP 8.4 lint, and live JS/CSS asset checks passed.
Authenticated browser DOM verification was blocked because the in-app browser
was on the login page.

## Git Snapshot

- Branch: main
- Last commit: 10660cf Consolidate additional income portals

## Working Tree

~~~text
 M .agent-memory/current-state.md
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M dashboard/assets/app.js
 M dashboard/assets/style.css
 M tests/misc-income-render.test.js
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
