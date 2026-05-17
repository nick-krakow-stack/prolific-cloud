# Handoff

Last updated: 2026-05-17
Update mode: Manual

## Latest Notes

Roadmap Phase 1 + Phase 2 has been implemented and deployed to the All-Inkl
webspace. The topbar sync lamp now shows green only for a fresh Watcher sync and
red when the Watcher appears inactive. The overview no longer shows the old
`Prolific-Konto` status box; `Auszahlbar` and `In Prüfung` now render as tiles
below the first four earnings tiles. The remaining overview roadmap block is
implemented and deployed: efficiency, top studies, daily chart, system health,
and EUR equivalents from the `prolific-watcher` Frankfurter.app `fxRates`
structure. The rest of the roadmap is also implemented and deployed: stats,
account, system, settings, heatmap, monthly comparison, CSV export, monthly
report, study notes, requester analysis, and quality tags. Browser review fix
for the former `Log` tab is implemented and deployed: the tab now reads
`Sync-Status`, shows last sync status, last successful sync, and last failure,
and keeps the detailed event log collapsed behind `Log`. Browser review fix for
settings is implemented and deployed: sliders, exact GBP fields, and debounced
autosave through the existing protected settings endpoint. Browser review fix
for links is implemented and deployed: normal page links are warm near-white /
yellow instead of blue, while tabs and controls keep their interaction colors.
Browser review fix for the stats heatmap is implemented and deployed: the
frontend renders all days of the current server month in seven columns and dims
future days. The production webroot is
`/www/htdocs/w021974e/prolific.nickkrakow.de`.

Current task status is tracked in .agent-memory/current-task.md. Owner,
browser, and review feedback are persisted in .agent-memory/feedback.md.

## Git Snapshot

- Branch: main
- Last product commit before this snapshot: 4cb1f00 Render heatmap as full month grid

## Working Tree

~~~text
clean after commit/push except this handoff refresh
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
- Deploy only runtime files through scripts/deploy-webspace.ps1 by default.
- Use scripts/deploy-webspace.ps1 -IncludeConfig only when a task explicitly changes config.php.
- Keep setup files in GitHub for backup/reinstall, but do not upload them to the live server during normal operation.
