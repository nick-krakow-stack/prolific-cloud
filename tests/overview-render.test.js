const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('dashboard/assets/app.js', 'utf8');

const sandbox = {
  console,
  window: {},
  document: {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  },
  setInterval() {},
  clearInterval() {},
  fetch() {
    return Promise.resolve({
      ok: false,
      status: 401,
      json: async () => ({ ok: false })
    });
  },
  location: { href: '', pathname: '/' },
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  }
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const sampleOverview = {
  ok: true,
  earnings: {
    today: { earned: { GBP: 500 }, pending: { GBP: 300 } },
    week: { earned: { GBP: 2500 }, pending: {} },
    month: { earned: { GBP: 7500 }, pending: { GBP: 1250 } },
    lastMonth: { earned: { GBP: 2500, USD: 150 }, pending: {} },
    allTime: { earned: { GBP: 15000 }, pending: {} }
  },
  balance: {
    approved_per_currency: { GBP: 1139 },
    pending_per_currency: { GBP: 2465, USD: 1562 }
  },
  fxRates: {
    base: 'GBP',
    rates: { EUR: 1.18, USD: 1.27 },
    fetchedAt: '2026-05-17T10:00:00Z'
  },
  goals: {
    daily_gbp_minor: 1000,
    monthly_gbp_minor: 10000
  },
  forecast: {},
  pendingStats: {},
  todayStats: {
    submissionsCount: 5,
    averageReward: { byCurrency: { GBP: 186 }, sampleCount: 1 },
    effectiveHourlyRate: { byCurrency: { GBP: 1160 }, sampleCount: 1, secondsTotal: 600 }
  },
  statusStats: {},
  efficiency: {
    today: { byCurrency: { GBP: 1200 }, sampleCount: 2, secondsTotal: 1800 },
    week: { byCurrency: { GBP: 1350 }, sampleCount: 6, secondsTotal: 6400 },
    month: { byCurrency: { GBP: 1425 }, sampleCount: 14, secondsTotal: 12000 },
    allTime: { byCurrency: { GBP: 1280 }, sampleCount: 28, secondsTotal: 24000 }
  },
  topStudies: {
    byReward: [
      {
        studyId: 'reward-1',
        name: 'High reward study',
        status: 'APPROVED',
        rewardMinor: 850,
        rewardCurrency: 'GBP',
        timeTakenSeconds: 900,
        hourlyRateMinor: 3400,
        completedAt: '2026-05-17 10:00:00'
      }
    ],
    byHourly: [
      {
        studyId: 'hourly-1',
        name: 'Efficient study',
        status: 'APPROVED',
        rewardMinor: 500,
        rewardCurrency: 'GBP',
        timeTakenSeconds: 300,
        hourlyRateMinor: 6000,
        completedAt: '2026-05-17 11:00:00'
      }
    ]
  },
  dailyStats: [
    { date: '2026-05-16', earned: { GBP: 250 }, pending: {} },
    { date: '2026-05-17', earned: { GBP: 500 }, pending: { GBP: 100 } }
  ],
  system: {
    api: 'ok',
    lastSyncAt: '2026-05-17T11:59:00Z',
    lastError: null,
    dbCounts: { studies: 12, submissions: 34, events: 5, syncLog: 3 },
    serverTime: '2026-05-17T12:00:00Z'
  },
  serverTime: '2026-05-17T12:00:00Z'
};

const html = sandbox.renderExpandedOverview(sampleOverview);

const checks = [
  ['renders EUR equivalent from GBP-based fxRates', html.includes('≈ €13,44')],
  ['renders top study list', html.includes('top-study-list') && html.includes('High reward study')],
  ['renders daily chart', html.includes('daily-chart') && html.includes('daily-bar')],
  ['renders efficiency basis as studies not samples', html.includes('2 Studien &middot; 30 Min') && html.includes('1 Studie') === false && !html.includes('Samples')],
  ['formats singular study count', sandbox.fmtStudyCount(1) === '1 Studie'],
  ['does not render system health in overview', !html.includes('System-Health') && !html.includes('health-grid')],
  ['keeps account tiles', html.includes('Auszahlbar') && html.includes('In Prüfung')],
  ['renames daily goal card to today', html.includes('<h3>Heute</h3>') && !html.includes('<h3>Tagesziel</h3>')],
  ['daily goal includes pending rewards', html.includes('£8,00 von £10,00') && html.includes('80 %')],
  ['monthly goal includes pending rewards', html.includes('£87,50 von £100,00') && html.includes('87,5 %')],
  ['merges today stats into the daily goal card', html.includes('<span class="key">Teilnahmen</span>') && html.includes('<span class="value">5</span>') && html.includes('<span class="key">Ø pro Teilnahme</span>') && html.includes('<span class="value">£1,86</span>') && html.includes('<span class="key">Effektiver Stundenlohn</span>') && html.includes('<span class="value">£11,60/h</span>')],
  ['removes earned and pending rows from the today detail card', !html.includes('<span class="key">Verdient</span>') && !html.includes('<span class="key">Ausstehend</span>')],
  ['renders monthly comparison as previous-month tile', html.includes('class="earning-tile comparison-tile"') && html.includes('<div class="label">Vormonat</div>') && !html.includes('<div class="label">Vergleich</div>')],
  ['renders monthly comparison percentage with threshold color class', html.includes('class="value comparison-value is-good"') && html.includes('286,5 %')],
  ['renders previous month amounts without duplicate label', html.includes('<div class="secondary">£25,00 + $1,50</div>') && !html.includes('Vormonat: £25,00 + $1,50')],
  ['classifies monthly comparison percentage thresholds', typeof sandbox.comparisonPercentClass === 'function' && sandbox.comparisonPercentClass(94.9) === 'is-danger' && sandbox.comparisonPercentClass(95) === 'is-warn' && sandbox.comparisonPercentClass(105) === 'is-warn' && sandbox.comparisonPercentClass(105.1) === 'is-good'],
  ['does not render old comparison status box', !html.includes('<h3>Vergleich</h3>') && !html.includes('<span class="key">Vormonat</span>')],
  ['does not restore old account box', !html.includes('Prolific-Konto') && !html.includes('Gesamt offen')],
  ['sanitizes unknown currency codes', !sandbox.fmtAmount(123, '<img src=x onerror=alert(1)>').includes('<')]
];

let failed = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);

  if (!passed) {
    failed++;
  }
}

if (failed > 0) {
  process.exit(1);
}
