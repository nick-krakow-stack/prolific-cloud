# Handoff

Last updated: 2026-06-05 17:25:00 +02:00
Update mode: Manual

## Latest Notes

`Statistiken` money rendering was switched to EUR-first display with original
currencies in parentheses. Runtime files were deployed to production. Focused
statistics render tests, the full Node test suite, JS syntax, server PHP 8.4
lint, `git diff --check`, `config.php` ignore check, and live JS delivery
markers passed.

Current task status is tracked in .agent-memory/current-task.md. Owner, browser,
and review feedback are persisted in .agent-memory/feedback.md.

## Git Snapshot

- Branch: main
- Last commit: current `Render statistics amounts in EUR` commit

## Working Tree

~~~text
clean after commit
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
- Do not write secrets, DB credentials, tokens, passwords, raw bearer tokens,
  session secrets, or personal Prolific data into memory files.
- Keep config.php local and ignored.
- Preserve root routing through / and absolute frontend paths.
