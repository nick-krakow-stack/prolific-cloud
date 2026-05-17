# Handoff

Last updated: 2026-05-17 18:24:22 +02:00
Update mode: Manual

## Latest Notes

Tagesziel and Monatsziel now calculate progress from GBP `earned + pending`.
`earned` already includes `APPROVED`, `SCREENED OUT`, and `SCREENED-OUT` through
the effective reward helper; `pending` adds `AWAITING REVIEW`. The visible label
stays `Erreicht`. Earnings tiles still display earned and pending separately.

## Git Snapshot

- Branch: main
- Last product commit: 64f21d4 Include pending rewards in goal progress
- Last memory commit: pending this task

## Working Tree

~~~text
 M .agent-memory/current-state.md
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M api/data.php
 M dashboard/assets/app.js
 M tests/overview-render.test.js
?? tests/goals-progress-source.test.js
~~~

## Verification Snapshot

- Red tests failed before implementation:
  - `node tests\overview-render.test.js`
  - `node tests\goals-progress-source.test.js`
- Green checks passed:
  - `node --check dashboard/assets/app.js`
  - `node tests\overview-render.test.js`
  - `node tests\goals-progress-source.test.js`
  - `node tests\settings-goals-source.test.js`
  - `node tests\roadmap-rest-render.test.js`
- Local `php` is not in PATH.
- Server temp lint before deploy passed with `php74` and `php84`.
- Deploy helper uploaded runtime files to production.
- Production `api/data.php` lint passed with `php74` and `php84`.
- Production root returned `200`; unauthenticated overview API returned `401`.
- In-app browser verification showed `TAGESZIEL` as `£7,16 von £30,00`,
  `Erreicht 23,9 %`, and `MONATSZIEL` as `£157,13 von £600,00`,
  `Erreicht 26,2 %`.

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
