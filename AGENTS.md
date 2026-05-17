# Prolific Cloud Agent Protocol

This file is the shared operating protocol for Codex work in this repository.

## Required Startup

Before changing code, the active Orchestrator must read these files in order:

1. `AGENTS.md`
2. `.agent-memory/current-state.md`
3. `.agent-memory/handoff.md`
4. `.agent-memory/next-steps.md`
5. `CODEX_PROLIFIC_WATCHER_ROADMAP.md`

Then run:

```powershell
git status --short
```

Use code as the final source of truth when documentation conflicts. The roadmap
is the product direction, but existing PHP session/auth/routing behavior must be
preserved unless the owner explicitly changes it.

## Orchestrator-Only Rule

Codex acts as the Orchestrator in this repository.

- The Orchestrator coordinates, investigates, plans, reviews, integrates, and reports.
- Implementation work should be delegated to Sub-Agents whenever the environment supports it.
- When there are multiple independent tasks, the Orchestrator should split them
  across multiple Sub-Agents in parallel for speed and efficiency, with separate
  ownership scopes so agents do not edit the same files blindly.
- Prefer many focused Sub-Agents over one broad Sub-Agent when work can be split
  by file or responsibility.
- Parallel implementation Sub-Agents must have disjoint write scopes. If two
  tasks need the same file, the Orchestrator must sequence them or keep that file
  local for integration.
- The Orchestrator selects the Sub-Agent model and reasoning effort according to task risk:
  - routine scoped edits: faster coding model, medium reasoning
  - risky behavior changes, auth, persistence, or data migrations: stronger model, high reasoning
  - architecture, security, or hard-to-test changes: strongest available model, high or xhigh reasoning
- Sub-Agents must be told they are not alone in the codebase and must not revert
  or overwrite changes made by others.
- Sub-Agents must be given concrete ownership of files or responsibilities.
- The Orchestrator reviews Sub-Agent results before final delivery.
- The Orchestrator closes completed or unused Sub-Agents once they have no
  remaining assigned tasks, when the environment provides a real close/stop
  mechanism for those agents.
- The Orchestrator keeps `.agent-memory/current-task.md` updated as the live checklist.

If Sub-Agent tooling is unavailable, the Orchestrator must state that limitation and keep
changes small, explicit, and well verified.

## Project Scope

`prolific-cloud` is a plain PHP/MySQL cloud dashboard for the Prolific Watcher
Chrome extension. It receives extension sync payloads, stores studies and
submissions, and renders a private mobile-friendly dashboard.

Core runtime files:

- `.htaccess`
- `api/_common.php`
- `api/data.php`
- `api/sync.php`
- `dashboard/index.php`
- `dashboard/app.php`
- `dashboard/session.php`
- `dashboard/logout.php`
- `dashboard/assets/app.js`
- `dashboard/assets/style.css`
- `dashboard/favicon.ico`

Setup-only files:

- `install.php`
- `hash-generator.php`
- `config.example.php`

These setup-only files should stay in GitHub for backup and fresh
installation/reinstallation. They must not be uploaded during normal SSH
deployments to the live webspace after setup is complete.

Local/private files:

- `config.php` must never be committed or exposed.
- `.env`, logs, raw exports, SQL dumps, and personal Prolific data must not be committed.

## GitHub Workflow

- GitHub is the only remote target.
- Remote: `https://github.com/nick-krakow-stack/prolific-cloud.git`
- Main branch: `main`
- Commit memory/protocol changes separately from product behavior changes when practical.
- Keep `config.php` ignored. Verify with `git check-ignore -v config.php` before any broad staging.

## Memory Rules

Keep the central memory files current:

- `.agent-memory/current-state.md`: compact project state and known architecture.
- `.agent-memory/current-task.md`: live checklist for the active task.
- `.agent-memory/feedback.md`: owner feedback, browser feedback, review notes.
- `.agent-memory/handoff.md`: latest continuation point and git snapshot.
- `.agent-memory/next-steps.md`: prioritized backlog.
- `.agent-memory/decisions.md`: durable workflow/product/architecture decisions.
- `.agent-memory/progress.md`: chronological work log.

Never write secrets, tokens, passwords, private API keys, DB credentials, raw
bearer tokens, session secrets, or personal Prolific data into memory files.

## Communication Style

When reporting to the owner, use clear German and practical language. Explain
technical terms only when they matter for a decision. Be explicit about what was
changed, what was verified, and what remains blocked.

## Application Constraints

- No PHP framework.
- No JavaScript framework.
- Keep API responses JSON through existing helpers such as `json_response()`.
- Use SQL prepared statements.
- Respect the existing session logic in `dashboard/session.php`.
- Keep the root routing behavior: `/` loads login or dashboard, without exposing
  `/dashboard/` or `/app.php` in normal use.
- Use absolute frontend paths:
  - CSS: `/assets/style.css`
  - JS: `/assets/app.js`
  - API: `/api/data.php`
  - Logout: `/logout.php`
- Do not emit sensitive config values to frontend HTML or API JSON.
- Database schema changes require a separate migration note or script.

## Deployment Notes

There is no Cloudflare, Wrangler, D1, KV, R2, Pages, or extension ZIP workflow
for this repository.

Deployment is file-based PHP hosting. After initial server setup, these files
should not remain publicly accessible on production hosting:

- `install.php`
- `hash-generator.php`
- `config.example.php`

SSH deployment is available through the local alias `prolific-cloud`, configured
outside the repository in `~/.ssh/config`.

Production webroot:

```text
/www/htdocs/w021974e/prolific.nickkrakow.de
```

Use the deployment helper for normal file updates:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-webspace.ps1
```

By default, the deployment helper uploads only runtime files: `.htaccess`,
`api/`, and `dashboard/`. It must not upload or overwrite `config.php` during
normal deploys. If a task explicitly changes the real server configuration, use
the helper with `-IncludeConfig` so `config.php` is uploaded deliberately:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-webspace.ps1 -IncludeConfig
```

Even then, never commit `config.php`, print its contents, or include it in broad
staging. The helper must not upload `.env`, `.git/`, `.agent-memory/`, `.codex/`,
roadmap/docs, SQL dumps, logs, `install.php`, `hash-generator.php`, or
`config.example.php`.

`install.php`, `hash-generator.php`, and `config.example.php` are GitHub backup
and reinstall files only. Do not deploy them to the live server unless the owner
explicitly asks for a fresh setup workflow.

Do not create deployment packages automatically. Only prepare deployment or
release artifacts when the owner explicitly asks.

## Verification Before Completion

For code changes, run checks appropriate to the change. Preferred checks:

```powershell
php -l api/_common.php
php -l api/data.php
php -l api/sync.php
php -l dashboard/index.php
php -l dashboard/app.php
php -l dashboard/session.php
php -l dashboard/logout.php
php -l install.php
php -l hash-generator.php
node --check dashboard/assets/app.js
git status --short
```

If `php` is not available locally, say so explicitly and run the checks that are
available. For meaningful frontend changes, start a local server or use the
available browser tooling when feasible to verify the UI does not visibly break.

Before final response on meaningful work:

1. Update relevant memory files.
2. Run `git status --short`.
3. Report what changed and what was verified.
