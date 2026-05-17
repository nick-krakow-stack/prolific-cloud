# Handoff

Last updated: 2026-05-17 18:16:58 +02:00
Update mode: Manual

## Latest Notes

The overview `Vergleich` block has been moved into the top earnings tile grid.
It now renders as `comparison-tile`, shows current month versus previous month
as a percentage using the existing FX-aware EUR conversion when rates are
available, and keeps the previous month amounts in the subline. The old wide
`Vergleich` status box is no longer rendered.

## Git Snapshot

- Branch: main
- Last product commit: bb81620 Move monthly comparison into overview tiles
- Last memory commit: pending this task

## Working Tree

~~~text
 M .agent-memory/current-state.md
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M dashboard/assets/app.js
 M tests/overview-render.test.js
~~~

## Verification Snapshot

- `node --check dashboard/assets/app.js` passed.
- `node tests\overview-render.test.js` passed.
- `node tests\roadmap-rest-render.test.js` passed.
- `git check-ignore -v config.php` confirmed `config.php` is ignored.
- Deploy helper uploaded runtime files to production.
- Production root returned `200`; unauthenticated overview API returned `401`.
- In-app browser verification showed 7 overview tiles, a live `comparison-tile`
  with `VERGLEICH`, `1.003,9 %`, and `Vormonat: £13,92 + $0,15`; no old
  comparison status box was present.

## Current State Summary

See .agent-memory/current-state.md.

## Next Planned Work

Owner can continue browser review; next work item is the next review note.

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
