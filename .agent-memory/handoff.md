# Handoff

Last updated: 2026-05-19 12:50:00 +02:00
Update mode: Orchestrator

## Latest Notes

- Existing chatmoderator `Zusatzeinkommen` is now labeled `Arbeit-Zuhause`.
- New generic `Zusatzeinkommen` tab is implemented separately for
  `Tech-Support` and `User Testing`.
- Production schema `misc_income_entries` was created deliberately before
  deployment.
- Runtime files were deployed to
  `/www/htdocs/w021974e/prolific.nickkrakow.de` using
  `scripts/deploy-webspace.ps1`; setup files and `config.php` were not uploaded.
- Server PHP 8.4 lint passed for the changed PHP files, the new schema smoke
  check returned ready, and the live root returned HTTP 200.

## Git Snapshot

- Branch: main
- Last commit before current product/memory commits: 04e95e4

## Working Tree

~~~text
Run git status --short for the exact current tree.
~~~

## Current State Summary

See `.agent-memory/current-state.md`.

## Next Planned Work

See `.agent-memory/next-steps.md`.

## Required Startup For Next Agent

1. Read `AGENTS.md`.
2. Read `.agent-memory/current-state.md`.
3. Read this handoff.
4. Read `.agent-memory/next-steps.md`.
5. Read `CODEX_PROLIFIC_WATCHER_ROADMAP.md`.
6. Run `git status --short`.

## Operating Constraints

- Codex acts as Orchestrator only.
- Delegate implementation to Sub-Agents whenever tooling supports it.
- Keep Sub-Agent write scopes separate for parallel work.
- No Cloudflare deployment workflow applies to this repository.
- Do not write secrets, DB credentials, tokens, passwords, raw bearer tokens,
  session secrets, or personal Prolific data into memory files.
- Keep `config.php` local and ignored.
- Preserve root routing through `/` and absolute frontend paths.
