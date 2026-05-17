# Handoff

Last updated: 2026-05-17 17:45:00 +02:00
Update mode: Manual

## Latest Notes

Reward/adjustment bug fixed and deployed. Effective rewards are now calculated
centrally in `api/_rewards.php` from base reward + adjustment + bonus, with
screened-out and raw-reward fallbacks. Dashboard aggregations, stats, requester
analysis, top studies, CSV export, submission cards, and sync writes now use the
effective reward path.

## Git Snapshot

- Branch: main
- Last product commit: 1e0dbf1 Fix adjusted reward totals
- Last memory commit: current HEAD memory commit for reward fix

## Working Tree

~~~text
 clean after memory commit
~~~

## Verification Snapshot

- `node --check dashboard/assets/app.js` passed.
- `node tests\overview-render.test.js` passed.
- `node tests\roadmap-rest-render.test.js` passed.
- `php74` and `php84` lint passed for `api/_rewards.php`, `api/data.php`,
  `api/export.php`, and `api/sync.php` on production.
- Production root returned `200`; unauthenticated overview API returned `401`.
- Production setup files remain absent.
- In-app browser showed `HEUTE` as `Â£1,86` plus pending amounts after reload.

## Current State Summary

See .agent-memory/current-state.md.

## Next Planned Work

Owner can continue the full browser review; the next item is the next review
note or backlog item from `.agent-memory/next-steps.md`.

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
