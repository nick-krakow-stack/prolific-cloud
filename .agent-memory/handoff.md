# Handoff

Last updated: 2026-05-17 18:09:00 +02:00
Update mode: Manual

## Latest Notes

Overview goal cards now use saved dashboard settings. `build_overview()` reads
`load_dashboard_settings()['goals']` instead of `$config['goals']`, so the
Tagesziel and Monatsziel cards match the values saved in the settings tab.

## Git Snapshot

- Branch: main
- Last product commit: 466fa02 Use saved settings for overview goals
- Last memory commit: pending this task

## Working Tree

~~~text
 M .agent-memory/current-task.md
 M .agent-memory/feedback.md
 M .agent-memory/handoff.md
 M .agent-memory/progress.md
 M api/data.php
?? tests/settings-goals-source.test.js
~~~

## Verification Snapshot

- `node tests\settings-goals-source.test.js` passed.
- `node tests\overview-render.test.js` passed.
- `node tests\roadmap-rest-render.test.js` passed.
- Server `php74`/`php84 -l api/data.php` passed.
- Deploy helper uploaded runtime files to production.
- Production root returned `200`; unauthenticated overview API returned `401`.
- Production setup files remain absent.
- In-app browser verification showed `TAGESZIEL` as `£1,86 von £30,00` and
  `MONATSZIEL` as `£127,48 von £600,00`; old `£150,00` target no longer appeared.

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
