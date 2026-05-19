# Handoff

Last updated: 2026-05-19 10:58:00 +02:00
Update mode: Manual

## Latest Notes

Zusatzeinkommen night bonus is now an explicit entered count instead of an
automatic time-window checkbox. UI uses `Nachtbonus-Nachrichten`; backend stores
`extra_income_sessions.night_bonus_message_count`, validates it against normal
paid `message_count`, and calculates 1 cent per entered night-bonus message.
Production DB was migrated and runtime files were deployed.

## Git Snapshot

- Branch: main
- Last commit: 235e96e Update memory for free messages

## Working Tree

~~~text
 M .agent-memory/current-state.md
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/next-steps.md
 M .agent-memory/progress.md
 M api/_extra_income.php
 M dashboard/assets/app.js
 M install.php
 M tests/extra-income-backend-source.test.js
 M tests/extra-income-calculation.test.php
 M tests/extra-income-render.test.js
~~~

## Current State Summary

See .agent-memory/current-state.md.

## Next Planned Work

Run final checks, commit product changes separately from memory changes, and
push `main`.

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
