# Handoff

Last updated: 2026-05-17 18:36:02 +02:00
Update mode: Manual

## Latest Notes

The overview no longer renders a separate `Tagesziel` card and separate `Heute`
detail card. The daily goal card is now titled `Heute`; it keeps `Fortschritt`,
`Erreicht`, and `Noch offen`, then appends `Teilnahmen`, `Ø pro Teilnahme`, and
`Effektiver Stundenlohn`. The old `Verdient` and `Ausstehend` detail rows are
removed from that section.

## Git Snapshot

- Branch: main
- Last product commit: 073bfa2 Merge today goal and stats card
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

- Red test first: `node tests\overview-render.test.js` failed on the missing
  merge behavior before implementation.
- Green checks passed:
  - `node --check dashboard/assets/app.js`
  - `node tests\overview-render.test.js`
  - `node tests\roadmap-rest-render.test.js`
  - `node tests\goals-progress-source.test.js`
  - `node tests\settings-goals-source.test.js`
- Read-only Explorer review reported no findings.
- Deploy helper uploaded runtime files to production.
- Production root returned `200`; unauthenticated overview API returned `401`.
- Production `api/data.php` lint passed with `php74` and `php84`.
- In-app browser verification showed one `HEUTE` status card containing
  `Fortschritt`, `Erreicht`, `Noch offen`, `Teilnahmen`, `Ø pro Teilnahme`, and
  `Effektiver Stundenlohn`; `TAGESZIEL`, `Verdient`, and `Ausstehend` were not
  present in that card.

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
