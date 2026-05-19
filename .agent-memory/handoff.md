# Handoff

Last updated: 2026-05-19 10:12:00 +02:00
Update mode: Manual

## Latest Notes

Latest task added `Zusatzeinkommen` Free Messages. Each session now has
`free_message_count`, worth 10 cents per message. Free Messages count toward
gross/net payout and hourly rate, but do not affect the normal weekly message
tier, night bonus, or special bonus thresholds. Production was deployed and the
server DB was migrated with `extra_income_sessions.free_message_count INT NOT
NULL DEFAULT 0`.

## Git Snapshot

- Branch: main
- Last commit before final staging: f359799 Update memory for extra income picker fix

## Working Tree

~~~text
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
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
