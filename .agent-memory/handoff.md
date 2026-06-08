# Handoff

Last updated: 2026-06-08 02:38:00 +02:00
Update mode: Manual

## Latest Notes

The statistics heatmap and income history were fixed and deployed.

- Backend already exposes daily `earned` and `pending` buckets for heatmap data.
- Root cause was frontend-only: `renderHeatmap()` and `renderDailyStatsCard()` used only `earned`.
- `dashboard/assets/app.js` now combines `earned + pending` for visible daily values, heatmap intensity, and tooltips.
- Regression coverage was added in `tests/roadmap-rest-render.test.js`.
- Runtime files were deployed to production and the live asset contains the combined day-total renderer.
- Live browser check confirmed the `Statistiken` heatmap is visible and renders EUR-first combined day values.

Current task status is tracked in `.agent-memory/current-task.md`.
Owner, browser, and review feedback are persisted in `.agent-memory/feedback.md`.

## Git Snapshot

- Branch: main
- Last product commit: `86ef09b Include pending rewards in heatmap days`

## Working Tree

Expected after handoff commit: clean.

## Verification

- Red tests failed first in `tests/roadmap-rest-render.test.js` for heatmap and income-history earned+pending expectations.
- `node tests\roadmap-rest-render.test.js`: passed.
- Full Node test suite under `tests/*.js`: passed.
- `node --check dashboard\assets\app.js`: passed.
- `git diff --check`: passed.
- Production deploy completed through `scripts/deploy-webspace.ps1`.
- Live asset check passed for `https://prolific.nickkrakow.de/assets/app.js`.
- Live browser DOM check showed the `Statistiken` tab active with visible heatmap values such as EUR-first original-currency combined amounts.

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
