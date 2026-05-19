# Handoff

Last updated: 2026-05-19 16:17:51 +02:00
Update mode: Stop

## Latest Notes

Automatic handoff snapshot written by .codex/hooks/agent-protocol.ps1.
Current task status is tracked in .agent-memory/current-task.md.
Owner, browser, and review feedback are persisted in .agent-memory/feedback.md.

## Git Snapshot

- Branch: main
- Last commit: 5cc73ee Update memory for worktime fix

## Working Tree

~~~text
 M .agent-memory/current-task.md
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
