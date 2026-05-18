# Handoff

Last updated: 2026-05-18 18:22:00 +02:00
Update mode: Manual

## Latest Notes

`Zusatzeinkommen` is implemented, reviewed, deployed, and server-migrated.
The runtime deploy helper now includes `api/_extra_income.php`. Production
schema checks showed `extra_income_sessions`, `extra_income_timer`, and
`extra_income_payouts` present. Unauthenticated API access still returns `401`.

## Git Snapshot

- Branch: main
- Product commit: 8e5d377 Add additional income tracking

## Working Tree

~~~text
 M .agent-memory/current-state.md
 M .agent-memory/current-task.md
 M .agent-memory/handoff.md
 M .agent-memory/next-steps.md
 M .agent-memory/progress.md
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
