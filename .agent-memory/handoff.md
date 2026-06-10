# Handoff

Last updated: 2026-06-10 17:40:00 +02:00
Update mode: Manual

## Latest Notes

`User Interviews` was added to the generic `Zusatzeinkommen` survey/task portal provider list.

- Backend `api/_misc_income.php` now accepts `user_interviews` as a category and treats it as a USD amount provider.
- Frontend `dashboard/assets/app.js` maps and renders `User Interviews` in the provider dropdown and labels.
- Existing `misc_income_entries.category` storage is reused; no schema migration was needed.
- Runtime files were deployed to production.

Current task status is tracked in `.agent-memory/current-task.md`.
Owner, browser, and review feedback are persisted in `.agent-memory/feedback.md`.

## Git Snapshot

- Branch: main
- Last product commit before final commit: `1e26ed4 Update handoff after heatmap fix`

## Working Tree

Expected after final commit: clean.

## Verification

- Red tests failed first in `tests/misc-income-render.test.js` and `tests/misc-income-backend-source.test.js` for missing `User Interviews`.
- `node tests\misc-income-render.test.js`: passed.
- `node tests\misc-income-backend-source.test.js`: passed.
- Full Node test suite under `tests/*.js`: passed.
- `node --check dashboard\assets\app.js`: passed.
- Local `php` is not available in PATH.
- Production deploy completed through `scripts/deploy-webspace.ps1`.
- Server `php84 -l api/_misc_income.php`: passed.
- Live asset check confirmed `https://prolific.nickkrakow.de/assets/app.js` contains `User Interviews` / `user_interviews`.
- `git diff --check`: passed.

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
