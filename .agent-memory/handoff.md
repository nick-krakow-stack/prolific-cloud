# Handoff

Last updated: 2026-06-04 23:38:00 +02:00
Update mode: Manual

## Latest Notes

Generic `Zusatzeinkommen` portal entries are now handled by one form with
provider dropdown, type dropdown (`Umfrage`/`Aufgabe`), date, USD amount, and
dynamic logo switching. Provider identity remains stored in `category`, so no
DB migration was required. Existing legacy `test` entry types remain readable.
Runtime files were deployed to production and checked with Node tests, server
PHP 8.4 lint, and live asset inspection. Authenticated browser DOM verification
was blocked because the in-app browser was on the login page.

## Git Snapshot

- Branch: main
- Last commit: 6ca43fd Update memory for Testable Minds income

## Working Tree

~~~text
 M .agent-memory/current-state.md
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M api/_misc_income.php
 M dashboard/assets/app.js
 M tests/misc-income-backend-source.test.js
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
