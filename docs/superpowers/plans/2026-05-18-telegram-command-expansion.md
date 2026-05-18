# Telegram Command Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Telegram bot with the approved command backlog and make commands clickable from the System tab.

**Architecture:** Split command parsing/dispatch from the webhook into a shared command library so both Telegram webhook requests and authenticated dashboard clicks execute the same logic. Keep the webhook as the public Telegram entrypoint, expose a session-protected dashboard command endpoint through `api/data.php`, and render command buttons/modals in the existing System tab.

**Tech Stack:** PHP 8.4, MariaDB, Telegram Bot API `sendMessage`, existing dashboard JavaScript/CSS, Node source-contract tests, PowerShell webspace deploy script.

---

## Scope

Implement these commands:

- Read-only: `/pending`, `/month`, `/goals`, `/top`, `/stats`, `/sync`, `/export`, `/active`, `/last`, `/compare`, `/heatmap`, `/week`
- Setting/control: `/setgoal day <amount>`, `/setgoal month <amount>`, `/sethourly good <amount>`, `/sethourly ok <amount>`, `/report on <HH:MM>`, `/report off`, `/mute <duration>`, `/unmute`, `/delete_logs`
- Keep existing: `/start`, `/help`, `/status`, `/balance`, `/studies`, `/earnings`, `/quote`, `/today`
- Do not implement `/requester` or `/study`.

Dashboard behavior:

- Render all configured commands in the Telegram-Bot card below Systemstatus.
- Commands without variables are buttons. Click sends the command to Telegram immediately.
- Commands with variables open a small modal containing the command name, field controls, and a Send button.
- `/delete_logs` opens a confirmation modal.
- Dashboard-triggered sends must use session auth and `require_dashboard_write_request()`.

Security and deployment:

- Do not expose bot token, chat ID, webhook secret, or config values in responses or logs.
- Do not deploy `install.php`, `hash-generator.php`, or `config.example.php`.
- Add any new runtime PHP file to `scripts/deploy-webspace.ps1`.

---

## File Structure

- Create `api/_telegram_commands.php`: shared Telegram parser, command registry, dispatcher, read-only command builders, setting command handlers, dashboard execution helper.
- Modify `api/telegram-webhook.php`: load `_telegram_commands.php`, keep request validation/logging, pass parsed command text to shared dispatcher.
- Modify `api/data.php`: load `_telegram_commands.php`, add POST `?type=telegramCommand`, and return command metadata from `build_telegram_system_status()`.
- Modify `scripts/deploy-webspace.ps1`: upload `api/_telegram_commands.php`.
- Modify `dashboard/assets/app.js`: render clickable command buttons, open command modal, POST dashboard command sends, show success/error state.
- Modify `dashboard/assets/style.css`: style command buttons and modal.
- Add/modify tests under `tests/`: assert command library extraction, command registry, dashboard endpoint, frontend buttons/modal, deploy inclusion.
- Modify `TELEGRAM-BACKEND-SPEC.md`: mark the expanded command scope and dashboard click behavior.

---

### Task 1: Documentation And Source Contracts

**Files:**
- Modify: `TELEGRAM-BACKEND-SPEC.md`
- Create: `tests/telegram-command-expansion-source.test.js`

- [ ] Update the backlog in `TELEGRAM-BACKEND-SPEC.md` with the command list above and explicitly note that `/requester` and `/study` are excluded.
- [ ] Add a source-contract test that checks:
  - `api/_telegram_commands.php` exists and defines `telegram_parse_command_text`, `telegram_command_definitions`, `telegram_dispatch_command`, `telegram_execute_dashboard_command`, and `telegram_delete_logs_message`.
  - `api/telegram-webhook.php` loads `_telegram_commands.php` and no longer owns the full command implementation.
  - `api/data.php` loads `_telegram_commands.php`, accepts `type=telegramCommand`, calls `require_dashboard_write_request()`, sends via `send_telegram_message`, and exposes command definitions in `build_telegram_system_status()`.
  - `scripts/deploy-webspace.ps1` uploads `api/_telegram_commands.php`.
  - `dashboard/assets/app.js` renders `data-telegram-command`, opens a command modal for required fields, and posts to `telegramCommand`.
  - The command list includes the approved commands and does not include `/requester` or `/study`.
- [ ] Run `node tests/telegram-command-expansion-source.test.js`.
  Expected: fail until the implementation is present.

### Task 2: Backend Command Library

**Files:**
- Create: `api/_telegram_commands.php`
- Modify: `api/telegram-webhook.php`
- Modify: `api/data.php`
- Modify: `scripts/deploy-webspace.ps1`
- Test: `tests/telegram-command-expansion-source.test.js`

- [ ] Extract existing command helpers from `api/telegram-webhook.php` into `api/_telegram_commands.php`.
- [ ] Keep `api/telegram-webhook.php` responsible only for HTTP method, secret validation, JSON extraction, chat whitelist, replay claim, dispatch, send, and message log update.
- [ ] Implement `telegram_parse_command_text(string $text): array` returning at least `command`, `args`, and `raw`.
- [ ] Implement `telegram_command_definitions(): array` with metadata:
  - `command`
  - `description`
  - `input` set to `none`, `fields`, or `confirm`
  - `fields` for `/setgoal`, `/sethourly`, `/report`, `/mute`
- [ ] Implement the read-only commands using existing `studies`, `submissions`, `sync_log`, `events`, `settings`, and FX helper patterns.
- [ ] Implement settings commands by updating the same `dashboardSettings` keys the dashboard settings form uses. Amounts are EUR values and must persist exactly as entered to two decimals.
- [ ] Implement `/report` and `/mute` as stored Telegram preferences. They should persist settings, but no automatic scheduled delivery is required in this task.
- [ ] Implement `/delete_logs` so webhook execution keeps the current update row when an update id is available, while dashboard execution may clear all Telegram message rows.
- [ ] Add `telegram_execute_dashboard_command(PDO $pdo, array $payload): array` that validates metadata, composes the command text, dispatches it, sends the response to `telegram.allowed_chat_id`, and returns `{ok, command, sent, response}` without secrets.
- [ ] Add `case 'telegramCommand'` to `api/data.php` for POST only, guarded by `require_dashboard_write_request()`.
- [ ] Run `node tests/telegram-command-expansion-source.test.js`.
  Expected: pass backend assertions.

### Task 3: Dashboard Command UI

**Files:**
- Modify: `dashboard/assets/app.js`
- Modify: `dashboard/assets/style.css`
- Test: `tests/telegram-command-expansion-source.test.js`

- [ ] Render Telegram commands as buttons using command metadata from `data.telegram.commands`.
- [ ] Direct commands call `POST /api/data.php?type=telegramCommand` with JSON payload `{command: "/pending", values: {}}`.
- [ ] Commands with fields open a modal with:
  - command label
  - dropdown/numeric/time controls according to metadata
  - Send and Cancel buttons
- [ ] `/delete_logs` opens a confirmation modal.
- [ ] Display a compact success/error status in the Telegram-Bot card after sending.
- [ ] Keep the UI usable on mobile; modal and command grid must not overflow.
- [ ] Run `node tests/telegram-command-expansion-source.test.js`.
  Expected: pass frontend assertions.

### Task 4: Verification And Deployment

**Files:**
- Runtime files only; no config or install helper deploy.

- [ ] Run the full Node source/render test set used for this project.
- [ ] Run remote PHP 8.4 lint for:
  - `api/_telegram.php`
  - `api/_telegram_commands.php`
  - `api/telegram-webhook.php`
  - `api/data.php`
- [ ] Deploy with `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-webspace.ps1`.
- [ ] Verify live:
  - `/` returns 200
  - `/api/data.php?type=overview` without auth returns 401
  - `/dashboard/assets/app.js` returns 200
  - `/api/data.php?type=system` in authenticated browser shows the expanded command list
- [ ] Use one harmless dashboard command, preferably `/status`, to confirm the click-to-send path works.
- [ ] Commit implementation and test changes after verification.

---

## Self-Review Notes

- Spec coverage: includes all approved commands, excludes `/requester` and `/study`, covers dashboard clickable sends and modal-based variable commands.
- Security coverage: dashboard command endpoint is session/write-protected; Telegram secrets are never returned.
- Deployment coverage: new runtime command file is added to deploy script; setup/helper files stay excluded.
