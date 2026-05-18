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
]) {
  assert(css.includes(cls), `missing css ${cls}`);
}

console.log('extra income render contract ok');
