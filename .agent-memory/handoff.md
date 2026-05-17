# Handoff

Last updated: 2026-05-17 20:07:24 +02:00
Update mode: Manual

## Latest Notes

Euro analytics pass is implemented and deployed. `Heute`, `Aktueller Monat`,
settings money controls, `Monatsprognose`, `Effizienz / Stundenlohn`, and
`Top-Studien` use Euro values based on stored Frankfurter/fxRates data. The top
earnings tiles and `Pending-Übersicht` intentionally remain in original
currencies.

## Git Snapshot

- Branch: main
- Product commit for this pass: e8fbb04 Show goal analytics in euros

## Working Tree

~~~text
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M .agent-memory/current-state.md
Product files are committed. Only memory files should remain modified before
the memory commit.
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
