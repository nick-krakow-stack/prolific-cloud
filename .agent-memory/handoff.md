# Handoff

Last updated: 2026-05-17 18:41:12 +02:00
Update mode: Manual

## Latest Notes

Dashboard UI terminology now uses `Studie`/`Studien` instead of `Samples` for
efficiency and monthly-report hourly-rate basis counts. Singular and plural are
handled by `fmtStudyCount()`.

## Git Snapshot

- Branch: main
- Last product commit: 66d25dd Use study wording for sample counts
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
 M tests/roadmap-rest-render.test.js
~~~

## Verification Snapshot

- Red tests failed before implementation:
  - `node tests\overview-render.test.js`
  - `node tests\roadmap-rest-render.test.js`
- Green checks passed:
  - `node --check dashboard/assets/app.js`
  - `node tests\overview-render.test.js`
  - `node tests\roadmap-rest-render.test.js`
  - `node tests\goals-progress-source.test.js`
  - `node tests\settings-goals-source.test.js`
- Deploy helper uploaded runtime files to production.
- Production root returned `200`; unauthenticated overview API returned `401`.
- In-app browser verification showed efficiency basis rows such as
  `1 Studie · 10 Min` and `26 Studien · 7 Std`; no `Samples` text remained.

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
