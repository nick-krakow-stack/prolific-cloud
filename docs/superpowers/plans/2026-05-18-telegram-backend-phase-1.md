# Telegram Backend Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first production-safe Telegram webhook backend with setup/config support and `/start`, `/help`, `/status`.

**Architecture:** Keep Telegram-specific concerns in `api/_telegram.php`, expose a thin `api/telegram-webhook.php`, and reuse existing `_common.php` DB/settings helpers. Keep install/setup helpers in Git but exclude them from normal deploys.

**Tech Stack:** PHP 8.4, MariaDB 10.6, Telegram Bot API webhook, existing PowerShell deploy script, Node source-contract tests.

---

### Task 1: Phase 1 Contracts

**Files:**
- Create: `tests/telegram-phase1-source.test.js`

- [ ] Write a failing source-contract test that asserts:
  - `config.example.php` contains `telegram.bot_token`, `telegram.allowed_chat_id`, `telegram.webhook_secret`
  - `hash-generator.php` renders `(D) Webhook-Secret`
  - `install.php` creates and lists `telegram_messages`
  - `api/_telegram.php` exists with secret, chat, replay, MarkdownV2, send helper functions
  - `api/telegram-webhook.php` loads `_telegram.php`, checks `?s=`, handles `message.text`, and dispatches `/start`, `/help`, `/status`
  - `scripts/deploy-webspace.ps1` deploys the two new runtime files

- [ ] Run `node tests/telegram-phase1-source.test.js` and confirm it fails for missing files/functions.

### Task 2: Config And Schema Support

**Files:**
- Modify: `config.example.php`
- Modify: `hash-generator.php`
- Modify: `install.php`

- [ ] Add the `telegram` config block with placeholders only.
- [ ] Add a generated 32-byte hex webhook secret display to `hash-generator.php`.
- [ ] Add `telegram_messages` to the idempotent install statements and table overview.
- [ ] Run the contract test and confirm these assertions pass while runtime assertions still fail.

### Task 3: Telegram Runtime

**Files:**
- Create: `api/_telegram.php`
- Create: `api/telegram-webhook.php`
- Modify: `scripts/deploy-webspace.ps1`

- [ ] Implement helpers for config validation, URL secret check, Telegram `X-Telegram-Bot-Api-Secret-Token` check when present, chat whitelist, replay detection/logging, MarkdownV2 escaping, and `sendMessage`.
- [ ] Implement webhook request flow with POST-only JSON processing and 200 responses for ignored non-message/non-command updates.
- [ ] Implement `/start`, `/help`, `/status`, and unknown command responses.
- [ ] Add runtime files to deploy script.
- [ ] Run the contract test and full Node source tests.

### Task 4: Production Verification

**Files:**
- No setup files deployed.
- Remote DB schema receives `telegram_messages` via SSH PHP snippet.

- [ ] Run `php84 -l` locally/remotely for changed PHP runtime and setup files.
- [ ] Apply the `telegram_messages` table on production without printing config secrets.
- [ ] Deploy runtime files.
- [ ] Verify bad/missing webhook secret returns `403`.
- [ ] Verify non-POST returns `405`.
- [ ] Verify live root/API smoke checks still pass.
- [ ] Register webhook with Telegram using server-side config and secret token, without printing token.
