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
    today: { earned: { GBP: 500 }, pending: {} },
    week: { earned: { GBP: 2500 }, pending: {} },
    month: { earned: { GBP: 7500 }, pending: {} },
    lastMonth: {},
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
  goals: {},
  forecast: {},
  pendingStats: {},
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
  ['renders system health grid', html.includes('health-grid') && html.includes('API')],
  ['keeps account tiles', html.includes('Auszahlbar') && html.includes('In Prüfung')],
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
