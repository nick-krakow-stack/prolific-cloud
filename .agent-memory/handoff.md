# Handoff

Last updated: 2026-05-19 16:08:00 +02:00
Update mode: Orchestrator

## Latest Notes

- Implausible `Arbeitszeit heute` value was diagnosed and fixed.
- Root cause: worktime period filtering used completion date semantics, so a multi-day approved submission with 158,676 raw seconds was counted fully on its completion day.
- Worktime periods now anchor to `started_at` and cap each row by the available period window.
- Production smoke check after deploy: today worktime is `paid_seconds = 6720`, `unpaid_seconds = 120`.
- Product changes were committed in `b81a65a Fix worktime period aggregation`; memory commit/push is pending.

## Git Snapshot

- Branch: main
- Last commit: b81a65a Fix worktime period aggregation

## Working Tree

~~~text
 M .agent-memory/current-task.md
 M .agent-memory/current-state.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
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
