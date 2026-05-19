const fs = require('fs');
const assert = require('assert');

const shell = fs.readFileSync('dashboard/app.php', 'utf8');
const js = fs.readFileSync('dashboard/assets/app.js', 'utf8');

assert(shell.includes('data-tab="extra-income"'));
assert(shell.includes('id="panel-extra-income"'));
assert(shell.indexOf('data-tab="settings"') < shell.indexOf('class="tabs-divider"'));
assert(shell.indexOf('class="tabs-divider"') < shell.indexOf('data-tab="extra-income"'));
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

assert(js.includes('type=extraIncome'));
assert(js.includes('type=extraIncomeStart'));
assert(js.includes('type=extraIncomeStop'));
assert(js.includes('type=extraIncomeSave'));
assert(js.includes('type=extraIncomeDelete'));
assert(js.includes('type=extraIncomeMarkPaid'));
assert(js.includes('Zusatzverdienste'));
assert(js.includes('Nachtbonus anwenden'));
assert(js.includes('extra-income-field-grid'));
assert(js.includes('extra-income-field'));
assert(js.includes('extra-income-actions'));
assert(js.includes('extraIncome'));
assert(js.includes('openNetCents'));
assert(js.includes('todayGrossCents'));
assert(js.includes('monthGrossCents'));
assert(js.includes('renderGoalCard'));

const css = fs.readFileSync('dashboard/assets/style.css', 'utf8');
for (const cls of [
  '.extra-income-grid',
  '.extra-income-timer',
  '.extra-income-form',
  '.extra-income-session-list',
  '.extra-income-modal',
  '.extra-income-payout',
  '.extra-income-field-grid',
  '.extra-income-field',
  '.extra-income-actions',
]) {
  assert(css.includes(cls), `missing css ${cls}`);
}

assert(
  /\.extra-income-field-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css),
  'manual session form should use two bounded columns'
);
assert(
  css.includes('.extra-income-form .extra-income-toggle'),
  'manual session toggle should override the global settings label layout'
);
assert(!css.includes('repeat(3, minmax(180px, 1fr))'));

console.log('extra income render contract ok');
