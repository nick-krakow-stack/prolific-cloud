# Handoff

Last updated: 2026-05-19 08:15:24 +02:00
Update mode: Manual

## Latest Notes

Latest work: fixed the live `Zusatzeinkommen > Session nachtragen` form layout
after owner screenshot review. The CSS now uses a bounded two-column
`.extra-income-field-grid`, falls back to one column at `760px`, and scopes
`.extra-income-form .extra-income-toggle` strongly enough to override global
settings label rules. Runtime files were deployed and live CSS was verified.

## Git Snapshot

- Branch: main
- Last commit before this task: b1b152f Update memory for dashboard polish

## Working Tree

~~~text
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M dashboard/assets/style.css
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
