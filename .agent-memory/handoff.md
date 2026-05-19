# Handoff

Last updated: 2026-05-19 13:17:00 +02:00
Update mode: Orchestrator

## Latest Notes

- The dashboard tab separator now sits left of Zusatzeinkommen.
- Final income navigation order: Einstellungen, |, Zusatzeinkommen, Arbeit-Zuhause.
- Runtime files were deployed to production with scripts/deploy-webspace.ps1.
- Verification passed: local render contract tests,
ode --check dashboard/assets/app.js, server php84 -l dashboard/app.php, live HTTP 200, and config.php ignore check.

## Git Snapshot

- Branch: main
- Last commit before current commits: f20a9eb

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
