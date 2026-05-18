# Handoff

Last updated: 2026-05-18 23:50:00 +02:00
Update mode: Manual

## Latest Notes

`Zusatzeinkommen` tab order was adjusted and deployed. It now appears after
`Einstellungen`, separated with a visible `|`. The owner also asked about
Telegram pause and dashboard-triggered plugin sync; current code confirms the
cloud only receives plugin pushes today, so a future extension-control polling
endpoint is needed for two-way control.

## Git Snapshot

- Branch: main
- Last product commit: 4489ed7 Move additional income tab to end

## Working Tree

~~~text
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
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
