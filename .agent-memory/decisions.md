# Decisions

Last updated: 2026-05-17

## Workflow

- Codex acts as Orchestrator in `prolific-cloud`.
- Sub-Agents should be used aggressively for independent tasks, with concrete
  ownership scopes and Orchestrator review before integration.
- Parallel implementation is allowed only when write scopes do not overlap.
- Workflow/protocol changes should be committed separately from product behavior
  changes when practical.

## Repository Safety

- `config.php` remains local and ignored.
- Secrets, tokens, DB credentials, session secrets, raw bearer tokens, personal
  Prolific data, SQL dumps, and raw exports must not be written to memory files
  or committed.

## Architecture

- Keep the project framework-free: plain PHP, MySQL, vanilla JavaScript, CSS.
- Preserve root routing through `/`.
- Keep frontend paths absolute.
- Use existing JSON helper functions for API responses.
- Use prepared statements for SQL.

## Deployment

- No Cloudflare workflow applies.
- No extension packaging workflow applies.
- Do not create deployment artifacts unless the owner explicitly asks.
