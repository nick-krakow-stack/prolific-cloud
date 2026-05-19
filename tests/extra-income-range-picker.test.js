const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const js = fs.readFileSync('dashboard/assets/app.js', 'utf8');
const css = fs.readFileSync('dashboard/assets/style.css', 'utf8');

const sandbox = {
  console,
  FormData,
  setInterval: () => 0,
  fetch: async () => ({ status: 200, json: async () => ({ ok: true }) }),
  alert: () => {},
  window: {
    location: { href: '' },
    confirm: () => true,
    clearTimeout: () => {},
    setTimeout: () => 0
  },
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({
      className: '',
      id: '',
      innerHTML: '',
      querySelector: () => null,
      addEventListener: () => {},
      remove: () => {}
    }),
    body: { appendChild: () => {} }
  }
};

vm.createContext(sandbox);
vm.runInContext(js, sandbox);

function createRangeForm(start = '', end = '') {
  const fields = {
    '#extraIncomeRangeStartDate': { value: start },
    '#extraIncomeRangeEndDate': { value: end },
    '#extraIncomeRangeCalendar': { innerHTML: '' }
  };

  return {
    fields,
    querySelector(selector) {
      return fields[selector] || null;
    }
  };
}

const firstClickForm = createRangeForm();
sandbox.selectExtraIncomeCalendarDate(firstClickForm, '2026-05-12');
assert.strictEqual(firstClickForm.fields['#extraIncomeRangeStartDate'].value, '2026-05-12');
assert.strictEqual(firstClickForm.fields['#extraIncomeRangeEndDate'].value, '');

const secondClickForm = createRangeForm('2026-05-12', '');
sandbox.selectExtraIncomeCalendarDate(secondClickForm, '2026-05-14');
assert.strictEqual(secondClickForm.fields['#extraIncomeRangeStartDate'].value, '2026-05-12');
assert.strictEqual(secondClickForm.fields['#extraIncomeRangeEndDate'].value, '2026-05-14');

const swappedClickForm = createRangeForm('2026-05-12', '');
sandbox.selectExtraIncomeCalendarDate(swappedClickForm, '2026-05-10');
assert.strictEqual(swappedClickForm.fields['#extraIncomeRangeStartDate'].value, '2026-05-10');
assert.strictEqual(swappedClickForm.fields['#extraIncomeRangeEndDate'].value, '2026-05-12');

const restartForm = createRangeForm('2026-05-10', '2026-05-12');
sandbox.selectExtraIncomeCalendarDate(restartForm, '2026-05-18');
assert.strictEqual(restartForm.fields['#extraIncomeRangeStartDate'].value, '2026-05-18');
assert.strictEqual(restartForm.fields['#extraIncomeRangeEndDate'].value, '');

assert(
  /\.extra-income-range-modal \.telegram-modal\s*\{[\s\S]*width:\s*min\(1080px,\s*calc\(100vw - 32px\)\)/.test(css),
  'work-home range picker modal should be a wide date-range picker'
);
assert(
  /\.extra-income-range-layout\s*\{[\s\S]*grid-template-columns:\s*minmax\(180px,\s*220px\)\s+minmax\(0,\s*1fr\)/.test(css),
  'work-home range picker should reserve a balanced left preset column'
);

console.log('extra income range picker behavior ok');
