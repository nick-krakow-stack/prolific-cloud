# Handoff

Last updated: 2026-05-19 13:49:30 +02:00
Update mode: Orchestrator

## Latest Notes

- Arbeit-Zuhause date-range picker behavior is fixed and deployed.
- Calendar selection now uses two clicks for a range: first click sets only start, second click sets end, earlier second dates swap start/end, and a new click after a complete range begins a new selection.
- The dark range-picker modal was widened to a 1080px layout with a stronger preset/calendar balance.
- Product changes were committed in `527af3c Improve work-home range picker`.
- Verification passed: Node syntax check, focused range-picker regression test, extra-income/overview/misc render contracts, git diff check, config.php ignore check, server PHP 8.4 lint, and live HTTP checks.

## Git Snapshot

- Branch: main
- Last commit: 527af3c Improve work-home range picker

## Working Tree

~~~text
 M .agent-memory/current-state.md
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
