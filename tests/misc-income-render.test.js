const fs = require('fs');
const assert = require('assert');

const shell = fs.readFileSync('dashboard/app.php', 'utf8');
const js = fs.readFileSync('dashboard/assets/app.js', 'utf8');
const css = fs.readFileSync('dashboard/assets/style.css', 'utf8');

assert(shell.includes('data-tab="misc-income"'));
assert(shell.includes('id="panel-misc-income"'));
assert(shell.includes('id="miscIncomeContent"'));
assert(shell.includes('Zusatzeinkommen'));
assert(shell.indexOf('data-tab="settings"') < shell.indexOf('data-tab="misc-income"'));
assert(shell.indexOf('data-tab="misc-income"') < shell.indexOf('class="tabs-divider"'));

for (const symbol of [
  'loadMiscIncome',
  'renderMiscIncome',
  'renderMiscIncomeForms',
  'renderMiscIncomeEntries',
  'submitMiscIncomeTechSupport',
  'submitMiscIncomeUserTesting',
  'deleteMiscIncomeEntry',
  'miscIncomeAmountParts',
]) {
  assert(js.includes(symbol), `missing ${symbol}`);
}

assert(js.includes('miscIncome: null'));
assert(js.includes('type=miscIncome'));
assert(js.includes('type=miscIncomeSave'));
assert(js.includes('type=miscIncomeDelete'));
assert(js.includes('miscIncomeContent'));
assert(js.includes('miscIncomeTechSupportForm'));
assert(js.includes('miscIncomeUserTestingForm'));
assert(js.includes('name="category" value="tech_support"'));
assert(js.includes('name="category" value="user_testing"'));
assert(js.includes('Tech-Support'));
assert(js.includes('User Testing'));
assert(js.includes('Stundenlohn EUR'));
assert(js.includes('type="number" name="hours" min="0" step="0.01"'));
assert(js.includes('type="number" name="hourly_rate_eur" min="0" step="0.01" value="50.00"'));
assert(js.includes('<option value="test">Test</option>'));
assert(js.includes('<option value="survey">Umfrage</option>'));
assert(js.includes('name="amount_usd"'));
assert(js.includes('convertToEur({ USD: amountCents }, fxRates)'));
assert(js.includes('fmtAmount(amountCents, currency)'));
assert(js.includes('fmtEurAmount(eurMinor)'));

for (const cls of [
  '.misc-income-layout',
  '.misc-income-forms',
  '.misc-income-form',
  '.misc-income-entry-list',
  '.misc-income-entry',
]) {
  assert(css.includes(cls), `missing css ${cls}`);
}

console.log('misc income render contract ok');
