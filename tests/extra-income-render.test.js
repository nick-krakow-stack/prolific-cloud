const fs = require('fs');
const assert = require('assert');

const shell = fs.readFileSync('dashboard/app.php', 'utf8');
const js = fs.readFileSync('dashboard/assets/app.js', 'utf8');

assert(shell.includes('data-tab="work-home"'));
assert(shell.includes('id="panel-work-home"'));
assert(shell.includes('id="workHomeContent"'));
assert(shell.includes('Arbeit-Zuhause'));
assert(shell.indexOf('data-tab="settings"') < shell.indexOf('class="tabs-divider"'));
assert(shell.indexOf('class="tabs-divider"') < shell.indexOf('data-tab="misc-income"'));
assert(shell.indexOf('data-tab="misc-income"') < shell.indexOf('data-tab="work-home"'));
assert(!shell.includes('id="panel-extra-income"'));

for (const symbol of [
  'loadExtraIncome',
  'loadWorkHome',
  'renderExtraIncome',
  'renderExtraIncomeTiles',
  'renderExtraIncomeTimer',
  'renderExtraIncomeForm',
  'renderExtraIncomeSessions',
  'openExtraIncomeStopModal',
  'submitExtraIncomeStop',
  'submitExtraIncomeSession',
  'openExtraIncomeRangeModal',
  'closeExtraIncomeRangeModal',
  'submitExtraIncomeRange',
  'fmtExtraIncomeRangeLabel',
  'refreshExtraIncomeRangeDisplay',
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
assert(js.includes("contentIds = {\n    'misc-income': 'miscIncomeContent',\n    'work-home': 'workHomeContent'"));
assert(js.includes('Arbeit-Zuhause'));
assert(js.includes('Nachtbonus-Nachrichten'));
assert(js.includes('Free Messages'));
assert(js.includes('extra-income-field-grid'));
assert(js.includes('extra-income-field'));
assert(js.includes('extra-income-actions'));
assert(js.includes('id="extraIncomeRangeButton"'));
assert(js.includes('id="extraIncomeRangeValue"'));
assert(js.includes('extra-income-range-presets'));
assert(js.includes('data-extra-income-range-preset="today"'));
assert(js.includes('data-extra-income-range-preset="yesterday"'));
assert(js.includes('data-extra-income-range-preset="this-week"'));
assert(js.includes('data-extra-income-range-preset="last-week"'));
assert(js.includes('data-extra-income-range-preset="this-month"'));
assert(js.includes('extraIncomeRangeStartTime'));
assert(js.includes('extraIncomeRangeEndTime'));
assert(js.includes('extraIncomeRangeCalendar'));
assert(js.includes('renderExtraIncomeRangeCalendar'));
assert(js.includes('applyExtraIncomeRangePreset'));
assert(js.includes('id="extraIncomeFreeMessageCount"'));
assert(js.includes('id="extraIncomeNightBonusMessageCount"'));
assert(js.includes('name="started_at" type="hidden"'));
assert(js.includes('name="ended_at" type="hidden"'));
assert(js.includes('free_message_count: Number(data.get(\'free_message_count\') || 0)'));
assert(js.includes('night_bonus_message_count: Number(data.get(\'night_bonus_message_count\') || 0)'));
assert(!js.includes('night_bonus_enabled: Boolean(data.get(\'night_bonus_enabled\'))'));
assert(js.includes('freeMessageCount'));
assert(js.includes('extraIncomeFormPayload(form)'));
assert(!js.includes('extraIncomeFormPayload(event.currentTarget)'));
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
  '.extra-income-range-button',
  '.extra-income-calendar-icon',
  '.extra-income-range-modal',
  '.extra-income-range-grid',
  '.extra-income-range-layout',
  '.extra-income-range-presets',
  '.extra-income-calendar-grid',
  '.extra-income-calendar-day',
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
assert(
  css.includes('.extra-income-range-field') && css.includes('grid-column: 1 / -1'),
  'date range trigger should span the form width'
);
assert(
  /\.extra-income-calendar-icon\s*\{[\s\S]*border:\s*2px solid #fff/.test(css),
  'calendar icon should be white'
);
assert(
  /\.extra-income-range-modal \.telegram-modal\s*\{[\s\S]*width:\s*min\(1080px,\s*calc\(100vw - 32px\)\)/.test(css),
  'work-home range picker should use a wider modal'
);
assert(!css.includes('repeat(3, minmax(180px, 1fr))'));

console.log('extra income render contract ok');
