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
  forecast: {
    current_gbp_minor: 8750,
    averageDayGbpMinor: 515,
    projectedMonthGbpMinor: 15960,
    targetDifferenceGbpMinor: 5960,
    willReachGoal: true
  },
  pendingStats: {},
  todayStats: {
    submissionsCount: 5,
    averageReward: { byCurrency: { GBP: 186 }, sampleCount: 1 },
    effectiveHourlyRate: {
      byCurrency: { GBP: 1160 },
      rewardByCurrency: { GBP: 193 },
      sampleCount: 1,
      secondsTotal: 600
    }
  },
  monthStats: {
    submissionsCount: 14,
    averageReward: { byCurrency: { GBP: 625 }, sampleCount: 14 },
    effectiveHourlyRate: {
      byCurrency: { GBP: 1137, USD: 1344 },
      rewardByCurrency: { GBP: 9475, USD: 11200 },
      sampleCount: 14,
      secondsTotal: 30000
    }
  },
  statusStats: {
    counts: {
      APPROVED: 47,
      'AWAITING REVIEW': 13,
      'SCREENED OUT': 11,
      RETURNED: 5,
      'TIMED-OUT': 3,
      REJECTED: 2
    }
  },
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
  ['renders efficiency as four metric tiles', html.includes('class="efficiency-grid"') && (html.match(/class="efficiency-tile"/g) || []).length === 4 && html.includes('<div class="efficiency-label">Heute</div>') && html.includes('<div class="efficiency-label">Gesamt</div>')],
  ['formats singular study count', sandbox.fmtStudyCount(1) === '1 Studie'],
  ['does not render system health in overview', !html.includes('System-Health') && !html.includes('health-grid')],
  ['keeps account tiles', html.includes('Auszahlbar') && html.includes('In Prüfung')],
  ['renames daily goal card to today', html.includes('<h3>Heute</h3>') && !html.includes('<h3>Tagesziel</h3>')],
  ['daily goal includes pending rewards', html.includes('€9,44 von €11,80') && html.includes('80 %')],
  ['monthly goal includes pending rewards', html.includes('€103,25 von €118,00') && html.includes('87,5 %')],
  ['renders daily and monthly goals as paired ring cards', html.includes('class="goal-card-grid"') && html.includes('class="status-box goal-card"') && html.includes('class="goal-ring-wrap"') && html.includes('class="goal-ring')],
  ['renames monthly goal card to current month', html.includes('<h3>Aktueller Monat</h3>') && !html.includes('<h3>Monatsziel</h3>')],
  ['colors goal rings by threshold', typeof sandbox.goalProgressClass === 'function' && sandbox.goalProgressClass(49.9) === 'is-danger' && sandbox.goalProgressClass(50) === 'is-warn' && sandbox.goalProgressClass(94.9) === 'is-warn' && sandbox.goalProgressClass(95) === 'is-good'],
  ['supports outer progress ring above 100 percent', typeof sandbox.goalOverflowPercent === 'function' && sandbox.goalOverflowPercent(110) === 10 && sandbox.goalOverflowPercent(250) === 100],
  ['merges today stats into the daily goal card', html.includes('<span class="key">Teilnahmen</span>') && html.includes('<span class="value">5</span>') && html.includes('<span class="key">Ø pro Teilnahme</span>') && html.includes('<span class="value">€2,19</span>') && html.includes('<span class="key">Effektiver Stundenlohn</span>') && html.includes('<span class="value">€13,68/h</span>')],
  ['adds monthly participation stats to the current month card', html.includes('<span class="value">14</span>') && html.includes('<span class="value">€7,38</span>')],
  ['renders effective hourly as one combined EUR rate', html.includes('<span class="value">€25,90/h</span>') && !html.includes('$13,44/h')],
  ['renders monthly forecast in EUR', html.includes('<span class="value">€103,25</span>') && html.includes('<span class="value">€188,33</span>')],
  ['renders efficiency hourly rates in EUR', html.includes('€14,16/h') && html.includes('€15,93/h')],
  ['renders top studies in EUR', html.includes('€10,03') && html.includes('€40,12/h') && !html.includes('£34,00/h')],
  ['removes earned and pending rows from the today detail card', !html.includes('<span class="key">Verdient</span>') && !html.includes('<span class="key">Ausstehend</span>')],
  ['renames pending total row', html.includes('<span class="key">Offene Summen</span>') && !html.includes('<span class="key">Gesamt pending</span>')],
  ['orders screened out second in status distribution', html.indexOf('>APPROVED<') < html.indexOf('>SCREENED OUT<') && html.indexOf('>SCREENED OUT<') < html.indexOf('>AWAITING REVIEW<')],
  ['colors paid and negative status tags', html.includes('class="tag tag-paid">SCREENED OUT</span>') && html.includes('class="tag tag-danger">RETURNED</span>') && html.includes('class="tag tag-danger-soft">TIMED-OUT</span>')],
  ['counts returned as rejected in fallback reject rate', html.includes('<span class="key">Reject-Rate</span>') && html.includes('<span class="value">8,6 %</span>')],
  ['renders monthly comparison as development tile', html.includes('class="earning-tile comparison-tile"') && html.includes('<div class="label">Entwicklung zum Vormonat</div>') && !html.includes('<div class="label">Vormonat</div>') && !html.includes('<div class="label">Vergleich</div>')],
  ['renders monthly comparison percentage with sign and threshold color class', html.includes('class="value comparison-value is-good"') && html.includes('+ 286,5 %')],
  ['renders previous month amounts without duplicate label', html.includes('<div class="secondary">£25,00 + $1,50</div>') && !html.includes('Vormonat: £25,00 + $1,50')],
  ['formats monthly comparison signs', typeof sandbox.fmtComparisonPercent === 'function' && sandbox.fmtComparisonPercent(94.9) === '- 94,9 %' && sandbox.fmtComparisonPercent(100) === '= 100 %' && sandbox.fmtComparisonPercent(105.1) === '+ 105,1 %'],
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
