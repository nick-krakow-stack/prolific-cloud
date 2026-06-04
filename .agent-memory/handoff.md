# Handoff

Last updated: 2026-06-04 22:45:00 +02:00
Update mode: Stop

## Latest Notes

`Testable Minds` is implemented in the generic `Zusatzeinkommen` tab as a USD
date/amount entry source. The tab now also uses local Testable Minds and
UserTesting logos. Existing Frankfurter `fxRates` conversion remains the path
for EUR display and monthly overview aggregation. Runtime files were deployed
to production.

## Git Snapshot

- Branch: main
- Last commit: 9b2cb90 Update memory for monthly comparison fix

## Working Tree

~~~text
 M .agent-memory/current-state.md
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M api/_misc_income.php
 M dashboard/assets/app.js
 M dashboard/assets/style.css
 M scripts/deploy-webspace.ps1
 M tests/misc-income-backend-source.test.js
 M tests/misc-income-render.test.js
?? dashboard/assets/testable-minds-logo.svg
?? dashboard/assets/user-testing-logo.svg
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
