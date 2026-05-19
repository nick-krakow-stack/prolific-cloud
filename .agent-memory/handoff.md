# Handoff

Last updated: 2026-05-19 13:30:58 +02:00
Update mode: Orchestrator

## Latest Notes

- Overview API now includes miscIncome for generic income summary data.
- Overview top grid order is now comparison tile first, then Zusatzeinkommen tile.
- Zusatzeinkommen tile shows current-month EUR total across Arbeit-Zuhause, User Testing, and Tech-Support.
- Tile styling is subtly different from the Prolific income tiles to show it is not included in Prolific totals.
- Runtime files were deployed to production with scripts/deploy-webspace.ps1.
- Verification passed: overview render contract, misc income backend source contract, extra/misc render contracts,
ode --check dashboard/assets/app.js, server PHP 8.4 lint, live HTTP 200, and git diff --check.

## Git Snapshot

- Branch: main
- Last commit before current commits: 879fcd4

## Working Tree

~~~text
Run git status --short for the exact current tree.
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