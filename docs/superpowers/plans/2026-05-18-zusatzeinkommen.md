# Zusatzeinkommen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent `Zusatzeinkommen` tab for chat moderator work, including session tracking, weekly message-tier income, night bonus, optional bonuses, payout fees, and dashboard summary integration.

**Architecture:** Add a focused backend module `api/_extra_income.php` that owns schema creation, validation, session storage, calculations, payouts, and response shaping. Keep `/api/data.php` as the existing route entrypoint and let the dashboard consume one JSON contract. Add a new dashboard tab and render/actions in vanilla JS, with CSS using the existing dark card system.

**Tech Stack:** Plain PHP 8.4, MySQL/MariaDB through PDO prepared statements, vanilla JavaScript, existing dashboard CSS, existing Node/PHP source tests.

---

## File Structure

- Create `api/_extra_income.php`: all extra-income schema helpers, calculation helpers, validation, CRUD, timer, payout marking, overview response.
- Modify `api/data.php`: require the helper, add `extraIncome*` route cases, include extra-income summary in `build_overview()`.
- Modify `install.php`: include the new tables for fresh installs.
- Modify `dashboard/app.php`: add `Zusatzeinkommen` tab and panel.
- Modify `dashboard/assets/app.js`: add state, fetch/render/actions for the tab, dashboard summary tile, goal-card extra rows.
- Modify `dashboard/assets/style.css`: add cards, forms, modal, timer and responsive layout styles.
- Create `tests/extra-income-backend-source.test.js`: source-level checks for route/schema/calculation contracts.
- Create `tests/extra-income-render.test.js`: frontend render contract checks for tab rendering and overview integration.

## Implementation Tasks

### Task 1: Backend calculation and storage module

**Owner:** Backend Sub-Agent

**Files:**
- Create: `api/_extra_income.php`
- Test: `tests/extra-income-backend-source.test.js`

- [ ] **Step 1: Add failing source contract test**

Create `tests/extra-income-backend-source.test.js` with checks that enforce:

```js
const fs = require('fs');
const assert = require('assert');

const helper = fs.readFileSync('api/_extra_income.php', 'utf8');

assert(helper.includes('function ensure_extra_income_schema('));
assert(helper.includes('CREATE TABLE IF NOT EXISTS extra_income_sessions'));
assert(helper.includes('CREATE TABLE IF NOT EXISTS extra_income_timer'));
assert(helper.includes('CREATE TABLE IF NOT EXISTS extra_income_payouts'));
assert(helper.includes('function extra_income_week_start('));
assert(helper.includes('function extra_income_split_session_by_week('));
assert(helper.includes('function extra_income_calculate_week_rate_cents('));
assert(helper.includes('function extra_income_calculate_session_bonus_cents('));
assert(helper.includes('function extra_income_calculate_payout_fee_cents('));
assert(helper.includes('function build_extra_income_response('));
assert(helper.includes('function start_extra_income_timer('));
assert(helper.includes('function stop_extra_income_timer('));
assert(helper.includes('function save_extra_income_session('));
assert(helper.includes('function delete_extra_income_session('));
assert(helper.includes('function mark_extra_income_paid('));

assert(helper.includes('1000') && helper.includes('12'));
assert(helper.includes('1250') && helper.includes('13'));
assert(helper.includes('1500') && helper.includes('14'));
assert(helper.includes('2000') && helper.includes('15'));
assert(helper.includes('17'));
assert(helper.includes('50') && helper.includes('500'));
assert(helper.includes('night_bonus_enabled'));
assert(helper.includes('bonus_threshold_messages'));

console.log('extra income backend source contract ok');
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
node tests/extra-income-backend-source.test.js
```

Expected: failure because `api/_extra_income.php` does not exist.

- [ ] **Step 3: Implement `api/_extra_income.php`**

Create the helper with:

```php
<?php
declare(strict_types=1);

function ensure_extra_income_schema(PDO $pdo): void {
    static $done = false;
    if ($done) {
        return;
    }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS extra_income_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            started_at DATETIME NOT NULL,
            ended_at DATETIME NOT NULL,
            message_count INT NOT NULL DEFAULT 0,
            night_bonus_enabled TINYINT(1) NOT NULL DEFAULT 1,
            bonus_mode VARCHAR(20) NOT NULL DEFAULT 'none',
            bonus_threshold_messages INT NOT NULL DEFAULT 0,
            bonus_amount_cents INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            INDEX idx_extra_income_sessions_started_at (started_at),
            INDEX idx_extra_income_sessions_ended_at (ended_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS extra_income_timer (
            id INT AUTO_INCREMENT PRIMARY KEY,
            started_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS extra_income_payouts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            gross_cents INT NOT NULL DEFAULT 0,
            fee_cents INT NOT NULL DEFAULT 0,
            net_cents INT NOT NULL DEFAULT 0,
            marked_paid_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL,
            INDEX idx_extra_income_payouts_period (period_start, period_end)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $done = true;
}
```

Then add helpers:

- `extra_income_now_string()`: `date('Y-m-d H:i:s')`
- `extra_income_parse_datetime(string $value): DateTimeImmutable`
- `extra_income_week_start(DateTimeImmutable $dt): DateTimeImmutable`
- `extra_income_week_end(DateTimeImmutable $dt): DateTimeImmutable`
- `extra_income_calculate_week_rate_cents(int $messages): int`
- `extra_income_calculate_payout_fee_cents(int $grossCents): int`
- `extra_income_calculate_session_bonus_cents(array $session): int`
- `extra_income_calculate_night_messages(array $session): int`
- `extra_income_split_session_by_week(array $session): array`
- `build_extra_income_response(PDO $pdo): array`
- `start_extra_income_timer(PDO $pdo): array`
- `stop_extra_income_timer(PDO $pdo): array`
- `save_extra_income_session(PDO $pdo): array`
- `delete_extra_income_session(PDO $pdo): array`
- `mark_extra_income_paid(PDO $pdo): array`

Implement validation with `json_error()` for invalid input, use `read_json_body()`, and use prepared statements for every insert/update/delete/select with request input.

- [ ] **Step 4: Run backend source contract**

Run:

```powershell
node tests/extra-income-backend-source.test.js
```

Expected: `extra income backend source contract ok`.

### Task 2: API routing and overview contract

**Owner:** Backend Integration Sub-Agent

**Files:**
- Modify: `api/data.php`
- Modify: `install.php`
- Test: `tests/extra-income-backend-source.test.js`

- [ ] **Step 1: Extend failing test for routes**

Append to `tests/extra-income-backend-source.test.js`:

```js
const data = fs.readFileSync('api/data.php', 'utf8');
const install = fs.readFileSync('install.php', 'utf8');

assert(data.includes("require_once __DIR__ . '/_extra_income.php';"));
for (const route of [
  "case 'extraIncome':",
  "case 'extraIncomeStart':",
  "case 'extraIncomeStop':",
  "case 'extraIncomeSave':",
  "case 'extraIncomeDelete':",
  "case 'extraIncomeMarkPaid':",
]) {
  assert(data.includes(route), `missing route ${route}`);
}
assert(data.includes("'extraIncome' => build_extra_income_overview_summary($pdo)"));
assert(data.includes('require_dashboard_write_request();'));
assert(install.includes('extra_income_sessions'));
assert(install.includes('extra_income_timer'));
assert(install.includes('extra_income_payouts'));
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
node tests/extra-income-backend-source.test.js
```

Expected: failure because routes are missing.

- [ ] **Step 3: Wire API routes**

In `api/data.php`, add:

```php
require_once __DIR__ . '/_extra_income.php';
```

Add read route:

```php
case 'extraIncome':
    ensure_extra_income_schema($pdo);
    json_response(build_extra_income_response($pdo));
```

Add write routes. Each must require POST and `require_dashboard_write_request()`:

```php
case 'extraIncomeStart':
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_error('Nur POST erlaubt.', 405);
    }
    require_dashboard_write_request();
    ensure_extra_income_schema($pdo);
    json_response(start_extra_income_timer($pdo));
```

Repeat the same pattern for stop/save/delete/mark paid, calling the matching helper.

In `build_overview()`, add:

```php
'extraIncome' => build_extra_income_overview_summary($pdo),
```

where the summary helper returns open net payout amount and today/month extra income display rows.

- [ ] **Step 4: Add install schema**

In `install.php`, add the same three `CREATE TABLE IF NOT EXISTS` statements used by `ensure_extra_income_schema()`.

- [ ] **Step 5: Run route contract and lint**

Run:

```powershell
node tests/extra-income-backend-source.test.js
php -l api/_extra_income.php
php -l api/data.php
php -l install.php
```

Expected: Node contract ok and PHP reports `No syntax errors detected`.

### Task 3: Dashboard shell and frontend render contract

**Owner:** Frontend Sub-Agent

**Files:**
- Modify: `dashboard/app.php`
- Modify: `dashboard/assets/app.js`
- Test: `tests/extra-income-render.test.js`

- [ ] **Step 1: Add failing render source test**

Create `tests/extra-income-render.test.js`:

```js
const fs = require('fs');
const assert = require('assert');

const shell = fs.readFileSync('dashboard/app.php', 'utf8');
const js = fs.readFileSync('dashboard/assets/app.js', 'utf8');

assert(shell.includes('data-tab="extra-income"'));
assert(shell.includes('id="panel-extra-income"'));
assert(shell.includes('id="extraIncomeContent"'));

for (const symbol of [
  'loadExtraIncome',
  'renderExtraIncome',
  'renderExtraIncomeTiles',
  'renderExtraIncomeTimer',
  'renderExtraIncomeForm',
  'renderExtraIncomeSessions',
  'openExtraIncomeStopModal',
  'submitExtraIncomeStop',
  'submitExtraIncomeSession',
  'deleteExtraIncomeSession',
  'markExtraIncomePaid',
  'renderExtraIncomeOverviewTile',
]) {
  assert(js.includes(symbol), `missing ${symbol}`);
}

assert(js.includes("type=extraIncome"));
assert(js.includes("type=extraIncomeStart"));
assert(js.includes("type=extraIncomeStop"));
assert(js.includes("type=extraIncomeSave"));
assert(js.includes("type=extraIncomeDelete"));
assert(js.includes("type=extraIncomeMarkPaid"));
assert(js.includes('Zusatzverdienste'));
assert(js.includes('Nachtbonus anwenden'));

console.log('extra income render contract ok');
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
node tests/extra-income-render.test.js
```

Expected: failure because the tab/rendering is missing.

- [ ] **Step 3: Add dashboard tab shell**

In `dashboard/app.php`, add a tab after `Übersicht`:

```php
<button class="tab" data-tab="extra-income">Zusatzeinkommen</button>
```

Add panel:

```php
<section class="tab-panel" id="panel-extra-income">
  <div id="extraIncomeContent" class="loading">Lade…</div>
</section>
```

- [ ] **Step 4: Add frontend API/load/render functions**

In `dashboard/assets/app.js`, follow existing tab loader patterns:

- load `extraIncome` on tab activation
- render four top tiles
- render timer start/stop area
- render manual session form
- render last sessions list
- render payout action
- use existing `apiFetch`/same-origin patterns
- refresh overview after extra-income writes

- [ ] **Step 5: Run frontend contract and syntax check**

Run:

```powershell
node tests/extra-income-render.test.js
node --check dashboard/assets/app.js
```

Expected: render contract ok and no JS syntax errors.

### Task 4: Frontend actions, modal, and overview integration

**Owner:** Frontend Integration Sub-Agent

**Files:**
- Modify: `dashboard/assets/app.js`
- Test: `tests/extra-income-render.test.js`

- [ ] **Step 1: Extend render test for overview integration**

Append:

```js
assert(js.includes('extraIncome'));
assert(js.includes('openNetCents'));
assert(js.includes('todayGrossCents'));
assert(js.includes('monthGrossCents'));
assert(js.includes('renderGoalCard'));
```

- [ ] **Step 2: Implement write actions**

Add handlers:

- start timer: POST `type=extraIncomeStart`
- stop timer: open modal, POST `type=extraIncomeStop`
- manual save: POST `type=extraIncomeSave`
- edit: prefill manual form and submit save with `id`
- delete: `confirm()`, POST `type=extraIncomeDelete`
- mark paid: `confirm()`, POST `type=extraIncomeMarkPaid`

After successful writes, reload `extraIncome` and `overview`.

- [ ] **Step 3: Add dashboard overview tile**

In overview rendering, add a tile in the existing top tile grid/second row:

```text
Zusatzverdienste
€X,XX
Offen zur Auszahlung
```

Use `extraIncome.openNetCents` from overview.

- [ ] **Step 4: Add goal-card extra rows**

In the `Heute` and `Aktueller Monat` goal cards, append a row:

```text
Zusatzverdienste    €X,XX
```

Do not alter ring percentage or Prolific totals.

- [ ] **Step 5: Run checks**

Run:

```powershell
node tests/extra-income-render.test.js
node --check dashboard/assets/app.js
```

Expected: pass.

### Task 5: CSS polish

**Owner:** CSS Sub-Agent

**Files:**
- Modify: `dashboard/assets/style.css`
- Test: `tests/extra-income-render.test.js`

- [ ] **Step 1: Add source checks for CSS classes**

Append to `tests/extra-income-render.test.js`:

```js
const css = fs.readFileSync('dashboard/assets/style.css', 'utf8');
for (const cls of [
  '.extra-income-grid',
  '.extra-income-timer',
  '.extra-income-form',
  '.extra-income-session-list',
  '.extra-income-modal',
  '.extra-income-payout',
]) {
  assert(css.includes(cls), `missing css ${cls}`);
}
```

- [ ] **Step 2: Add CSS**

Add responsive styling:

- four-card grid matching dashboard cards
- timer action row
- compact form grid
- modal overlay/content
- session list rows
- payout status pill
- mobile single-column fallback

- [ ] **Step 3: Run render source check**

Run:

```powershell
node tests/extra-income-render.test.js
```

Expected: pass.

### Task 6: Verification, deploy, and commit

**Owner:** Orchestrator

**Files:**
- Review all changed files.
- Update `.agent-memory/current-state.md`, `.agent-memory/current-task.md`, `.agent-memory/progress.md`, `.agent-memory/handoff.md`.

- [ ] **Step 1: Run local checks**

Run:

```powershell
node tests/extra-income-backend-source.test.js
node tests/extra-income-render.test.js
node --check dashboard/assets/app.js
php -l api/_extra_income.php
php -l api/data.php
php -l dashboard/app.php
php -l install.php
git status --short
```

If local `php` is unavailable, run Node checks locally and server-side PHP lint after deploy.

- [ ] **Step 2: Deploy runtime files**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-webspace.ps1
```

Do not deploy `config.php`, `install.php`, `hash-generator.php`, or `config.example.php`.

- [ ] **Step 3: Server lint**

Run remote PHP 8.4 lint for changed runtime files:

```powershell
ssh prolific-cloud "cd /www/htdocs/w021974e/prolific.nickkrakow.de && php84 -l api/_extra_income.php && php84 -l api/data.php && php84 -l dashboard/app.php"
```

- [ ] **Step 4: Browser verification**

Use the in-app browser or Playwright:

- reload `https://prolific.nickkrakow.de/`
- confirm `Zusatzeinkommen` tab exists
- start timer, stop timer with a small message count, verify session appears
- add manual session, edit it, delete it
- verify overview shows `Zusatzverdienste`
- verify Prolific goal rings do not change from additional income

- [ ] **Step 5: Commit and push**

Before staging:

```powershell
git check-ignore -v config.php
```

Stage only intended files:

```powershell
git add api/_extra_income.php api/data.php dashboard/app.php dashboard/assets/app.js dashboard/assets/style.css install.php tests/extra-income-backend-source.test.js tests/extra-income-render.test.js docs/superpowers/specs/2026-05-18-zusatzeinkommen-design.md docs/superpowers/plans/2026-05-18-zusatzeinkommen.md .agent-memory/current-state.md .agent-memory/current-task.md .agent-memory/progress.md .agent-memory/handoff.md .agent-memory/next-steps.md
git commit -m "Add additional income tracking"
git push origin main
```

Expected: commit and push succeed, `config.php` remains ignored and untracked.
