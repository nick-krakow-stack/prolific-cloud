const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('dashboard/assets/app.js', 'utf8');
const css = fs.readFileSync('dashboard/assets/style.css', 'utf8');

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
    today: { earned: { GBP: 500 }, pending: { GBP: 300, USD: 127 } },
    week: { earned: { GBP: 2500 }, pending: { USD: 635 } },
    month: { earned: { GBP: 7500 }, pending: { GBP: 1250, USD: 1270 } },
    lastMonth: { earned: { GBP: 2500, USD: 150 }, pending: {} },
    allTime: { earned: { GBP: 15000 }, pending: { GBP: 500, USD: 1270 } }
  },
  worktime: {
    today: {
      paid_seconds: 9300,
      unpaid_seconds: 720,
      total_seconds: 10020,
      count_paid: 5,
      count_unpaid: 1,
      count_total: 6
    },
    week: {
      paidSeconds: 3660,
      unpaidSeconds: 59,
      totalSeconds: 3719,
      countPaid: 3,
      countUnpaid: 1,
      countTotal: 4
    },
    month: {
      paid_seconds: 7200,
      unpaid_seconds: 0,
      total_seconds: 7200,
      count_paid: 14,
      count_unpaid: 0,
      count_total: 14
    },
    lastMonth: {
      paid_seconds: 5400,
      unpaid_seconds: 0,
      total_seconds: 5400,
      count_paid: 7,
      count_unpaid: 0,
      count_total: 7
    },
    allTime: {
      paidSeconds: 30000,
      unpaidSeconds: 1860,
      totalSeconds: 31860,
      countPaid: 28,
      countUnpaid: 4,
      countTotal: 32
    }
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
  extraIncome: {
    month: {
      grossCents: 1425
    }
  },
  miscIncome: {
    summary: {
      monthByCurrency: {
        EUR: 5000,
        USD: 1270
      }
    }
  },
  serverTime: '2026-05-17T12:00:00Z'
};

const html = sandbox.renderExpandedOverview(sampleOverview);
const overflowGoalHtml = sandbox.renderGoalCard('Overflow', 11000, 10000, sampleOverview.fxRates);
const exactEurGoalHtml = sandbox.renderGoalCard(
  'Exact EUR',
  2543,
  2543,
  sampleOverview.fxRates,
  '',
  { currentEurMinor: 3000, targetEurMinor: 3000 }
);
const goalColorSamples = [0, 5, 50, 98, 100, 110].map(percent => {
  const color = typeof sandbox.goalProgressColor === 'function'
    ? sandbox.goalProgressColor(percent)
    : null;

  return [percent, color, sandbox.renderGoalCard(`Color ${percent}`, percent, 100, sampleOverview.fxRates)];
});
const intermediateGoalColors = typeof sandbox.goalProgressColor === 'function'
  ? {
      redYellow: sandbox.goalProgressColor(27.5),
      yellowGreen: sandbox.goalProgressColor(74)
    }
  : {};
const goalRingCssStrokeOverride = /\.goal-ring-svg\.is-(?:danger|warn|good|neutral)\s+\.goal-ring-progress\s*\{[^}]*stroke\s*:/.test(css);
const gbp800 = sandbox.fmtAmount(800, 'GBP');
const gbp300 = sandbox.fmtAmount(300, 'GBP');
const gbp2500 = sandbox.fmtAmount(2500, 'GBP');
const gbp8750 = sandbox.fmtAmount(8750, 'GBP');
const gbp1250 = sandbox.fmtAmount(1250, 'GBP');
const gbp15500 = sandbox.fmtAmount(15500, 'GBP');
const gbp500 = sandbox.fmtAmount(500, 'GBP');
const usd127 = sandbox.fmtAmount(127, 'USD');
const usd635 = sandbox.fmtAmount(635, 'USD');
const usd1270 = sandbox.fmtAmount(1270, 'USD');

const checks = [
  ['renders EUR equivalent from GBP-based fxRates', html.includes('≈ €13,44')],
  ['renders top study list', html.includes('top-study-list') && html.includes('High reward study')],
  ['renders top studies as two separate sections', html.includes('<h3>Top-Studien nach Gesamtvergütung</h3>') && html.includes('<h3>Top-Studien nach Stundenlohn</h3>') && !html.includes('<h3>Top-Studien</h3>') && !html.includes('Top nach Verg&uuml;tung')],
  ['renders top studies side by side', html.includes('class="top-studies-grid"') && /<div class="top-studies-grid">[\s\S]*<h3>Top-Studien nach Gesamtvergütung<\/h3>[\s\S]*<h3>Top-Studien nach Stundenlohn<\/h3>[\s\S]*<\/div>/.test(html) && css.includes('.top-studies-grid') && css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))')],
  ['does not render daily chart in overview', !html.includes('Einnahmen-Verlauf') && !html.includes('daily-chart') && !html.includes('daily-bar')],
  ['renders efficiency basis as studies not samples', html.includes('2 Studien &middot; 30 Min') && html.includes('1 Studie') === false && !html.includes('Samples')],
  ['renders efficiency as four metric tiles in the former hourly KPI position', html.includes('class="efficiency-grid"') && (html.match(/class="efficiency-tile"/g) || []).length === 4 && html.includes('<div class="efficiency-label">Heute</div>') && html.includes('<div class="efficiency-label">Gesamt</div>') && html.indexOf('class="efficiency-grid"') > html.indexOf('ARBEITSZEIT GESAMT') && html.indexOf('class="efficiency-grid"') < html.indexOf('class="goal-card-grid"')],
  ['formats singular study count', sandbox.fmtStudyCount(1) === '1 Studie'],
  ['does not render system health in overview', !html.includes('System-Health') && !html.includes('health-grid')],
  ['keeps account tiles', html.includes('Auszahlbar') && html.includes('In Prüfung')],
  ['links cashout tile to Prolific balance hub in a new tab', html.includes('<a class="earning-tile earning-tile-link" href="https://app.prolific.com/balance-hub" target="_blank" rel="noopener noreferrer">') && html.includes('<div class="label">Auszahlbar</div>')],
  ['period tiles include awaiting review in the main amount', html.includes(`<div class="value">${gbp800} + ${usd127}</div>`) && html.includes(`<div class="value">${gbp2500} + ${usd635}</div>`) && html.includes(`<div class="value">${gbp8750} + ${usd1270}</div>`) && html.includes(`<div class="value">${gbp15500} + ${usd1270}</div>`)],
  ['period tiles label pending as included share', html.includes(`Davon ${gbp300} + ${usd127} ausstehend`) && html.includes(`Davon ${usd635} ausstehend`) && html.includes(`Davon ${gbp1250} + ${usd1270} ausstehend`) && html.includes(`Davon ${gbp500} + ${usd1270} ausstehend`) && !html.includes(`+ ${gbp300} ausstehend`)],
  ['renders worktime cards directly after earnings cards', html.includes('class="earnings-grid worktime-grid"') && html.indexOf('ARBEITSZEIT HEUTE') > html.indexOf('</div>') && html.indexOf('ARBEITSZEIT HEUTE') < html.indexOf('class="goal-card-grid"')],
  ['renders four worktime cards with worktime formatting', (html.match(/ARBEITSZEIT /g) || []).length === 4 && html.includes('<div class="label">ARBEITSZEIT HEUTE</div>') && html.includes('<div class="value">2 h 35 min</div>') && html.includes('<div class="label">ARBEITSZEIT DIESE WOCHE</div>') && html.includes('<div class="value">1 h 1 min</div>') && html.includes('<div class="label">ARBEITSZEIT GESAMT</div>') && html.includes('<div class="value">8 h 20 min</div>')],
  ['renders unpaid worktime subline only when unpaid seconds are at least one minute', html.includes('Davon 12 min unbezahlt') && html.includes('Davon 31 min unbezahlt') && !html.includes('Davon 0 min unbezahlt') && !html.includes('ohne Verg&uuml;tung')],
  ['formats worktime below one minute as dash', typeof sandbox.fmtWorktime === 'function' && sandbox.fmtWorktime(59) === '\u2013' && sandbox.fmtWorktime(60) === '1 min' && sandbox.fmtWorktime(3600) === '1 h'],
  ['does not render duplicate effective hourly KPI row', !html.includes('class="effective-hourly-grid"') && !html.includes('<div class="label">EFFEKTIVER STUNDENLOHN MONAT</div>') && !html.includes('<div class="label">EFFEKTIVER STUNDENLOHN GESAMT</div>')],
  ['renames daily goal card to today', html.includes('<h3>Heute</h3>') && !html.includes('<h3>Tagesziel</h3>')],
  ['daily goal includes pending rewards', html.includes('€10,62 von €11,80') && html.includes('90 %')],
  ['monthly goal includes pending rewards', html.includes('€115,05 von €118,00') && html.includes('97,5 %')],
  ['goal cards keep exact EUR targets instead of reconverting rounded GBP settings', exactEurGoalHtml.includes('\u20ac30,00 von \u20ac30,00') && !exactEurGoalHtml.includes('\u20ac30,01')],
  ['renders daily and monthly goals as paired SVG ring cards', html.includes('class="goal-card-grid"') && html.includes('class="status-box goal-card"') && html.includes('class="goal-ring-wrap"') && html.includes('<svg class="goal-ring-svg ') && (html.match(/class="goal-ring-progress/g) || []).length === 2],
  ['goal SVG rings render concrete stroke offsets', html.includes('stroke-dasharray="100"') && html.includes('stroke-dashoffset="10"') && html.includes('stroke-dashoffset="2.5"')],
  ['goal overflow SVG rings render a concrete blue outer circle', overflowGoalHtml.includes('class="goal-ring-overflow"') && overflowGoalHtml.includes('stroke-dashoffset="90"') && css.includes('.goal-ring-overflow') && css.includes('var(--primary)')],
  ['goal ring colors follow continuous percentage rule', typeof sandbox.goalProgressColor === 'function' && JSON.stringify(Object.fromEntries(goalColorSamples.map(([percent, color]) => [percent, color]))) === JSON.stringify({
    0: '#ef4444',
    5: '#ef4444',
    50: '#facc15',
    98: '#16a34a',
    100: '#16a34a',
    110: '#16a34a'
  })],
  ['goal ring colors interpolate real intermediate colors', intermediateGoalColors.redYellow === '#f5882d' && intermediateGoalColors.redYellow !== '#ef4444' && intermediateGoalColors.redYellow !== '#facc15' && intermediateGoalColors.yellowGreen === '#88b830' && intermediateGoalColors.yellowGreen !== '#facc15' && intermediateGoalColors.yellowGreen !== '#16a34a'],
  ['goal ring colors render as presentation attributes and inline SVG stroke styles', goalColorSamples.every(([, color, goalHtml]) => goalHtml.includes(`class="goal-ring-progress"`) && goalHtml.includes(`stroke="${color}"`) && goalHtml.includes(`style="stroke: ${color};"`)) && overflowGoalHtml.includes('class="goal-ring-overflow"') && overflowGoalHtml.includes('stroke="var(--primary)"') && overflowGoalHtml.includes('style="stroke: var(--primary);"')],
  ['goal ring CSS does not override calculated stroke colors', !goalRingCssStrokeOverride],
  ['goal rings do not use conic-gradient', !html.includes('conic-gradient') && !overflowGoalHtml.includes('conic-gradient') && !/\.goal-ring[\s\S]*conic-gradient/.test(css)],
  ['renames monthly goal card to current month', html.includes('<h3>Aktueller Monat</h3>') && !html.includes('<h3>Monatsziel</h3>')],
  ['colors goal rings by threshold', typeof sandbox.goalProgressClass === 'function' && sandbox.goalProgressClass(49.9) === 'is-danger' && sandbox.goalProgressClass(50) === 'is-warn' && sandbox.goalProgressClass(94.9) === 'is-warn' && sandbox.goalProgressClass(95) === 'is-good'],
  ['supports outer progress ring above 100 percent', typeof sandbox.goalOverflowPercent === 'function' && sandbox.goalOverflowPercent(110) === 10 && sandbox.goalOverflowPercent(250) === 100],
  ['merges today stats into the daily goal card', html.includes('<span class="key">Teilnahmen</span>') && html.includes('<span class="value">5</span>') && html.includes('<span class="key">Ø pro Teilnahme</span>') && html.includes('<span class="value">€2,19</span>') && html.includes('<span class="key">Effektiver Stundenlohn</span>') && html.includes('<span class="value">€13,68/h</span>')],
  ['adds monthly participation stats to the current month card', html.includes('<span class="value">14</span>') && html.includes('<span class="value">€7,38</span>')],
  ['renders effective hourly as one combined EUR rate', html.includes('<span class="value">€25,90/h</span>') && !html.includes('$13,44/h')],
  ['renders monthly forecast in EUR', html.includes('<span class="value">€115,05</span>') && html.includes('<span class="value">€209,80</span>')],
  ['renders forecast and status distribution side by side', html.includes('class="forecast-status-grid"') && /<div class="forecast-status-grid">[\s\S]*<h3>Monatsprognose<\/h3>[\s\S]*<h3>Status-Verteilung<\/h3>[\s\S]*<\/div>/.test(html) && css.includes('.forecast-status-grid') && css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))')],
  ['renders forecast verdict as the only forecast card callout', html.includes('class="status-box forecast-card"') && (html.match(/forecast-card/g) || []).length === 1 && html.includes('class="forecast-verdict is-good"') && html.includes('Ziel wird voraussichtlich erreicht')],
  ['styles forecast verdict for desktop and mobile', css.includes('.forecast-card') && css.includes('.forecast-verdict') && css.includes('.forecast-verdict.is-good') && css.includes('.forecast-verdict.is-danger') && css.includes('text-shadow') && css.includes('@media (max-width: 520px)')],
  ['renders efficiency hourly rates in EUR', html.includes('€14,16/h') && html.includes('€15,93/h')],
  ['renders top studies in EUR', html.includes('€10,03') && html.includes('€40,12/h') && !html.includes('£34,00/h')],
  ['removes earned and pending rows from the today detail card', !html.includes('<span class="key">Verdient</span>') && !html.includes('<span class="key">Ausstehend</span>')],
  ['renames pending total row', html.includes('<span class="key">Offene Summen</span>') && !html.includes('<span class="key">Gesamt pending</span>')],
  ['renders pending overview below status distribution', html.indexOf('<h3>Status-Verteilung</h3>') >= 0 && html.indexOf('<h3>Status-Verteilung</h3>') < html.indexOf('<h3>Pending-Übersicht</h3>')],
  ['orders screened out second in status distribution', html.indexOf('>APPROVED<') < html.indexOf('>SCREENED OUT<') && html.indexOf('>SCREENED OUT<') < html.indexOf('>AWAITING REVIEW<')],
  ['colors paid and negative status tags', html.includes('class="tag tag-paid">SCREENED OUT</span>') && html.includes('class="tag tag-danger">RETURNED</span>') && html.includes('class="tag tag-danger-soft">TIMED-OUT</span>')],
  ['counts returned as rejected in fallback reject rate', html.includes('<span class="key">Reject-Rate</span>') && html.includes('<span class="value">8,6 %</span>')],
  ['renders monthly comparison as development tile', html.includes('class="earning-tile comparison-tile"') && html.includes('<div class="label">Entwicklung zum Vormonat</div>') && !html.includes('<div class="label">Vormonat</div>') && !html.includes('<div class="label">Vergleich</div>')],
  ['renders comparison before monthly additional income tile', html.indexOf('<div class="label">Entwicklung zum Vormonat</div>') >= 0 && html.indexOf('<div class="label">Entwicklung zum Vormonat</div>') < html.indexOf('<div class="label">Zusatzeinkommen</div>')],
  ['renders additional income tile as current month total from all sources', html.includes('class="earning-tile additional-income-tile"') && html.includes('<div class="label">Zusatzeinkommen</div>') && html.includes('<div class="value">€76,05</div>') && html.includes('<div class="secondary">im aktuellen Monat</div>') && !html.includes('<div class="label">Arbeit-Zuhause</div>') && !html.includes('Offen zur Auszahlung')],
  ['styles additional income tile differently from Prolific total tiles', css.includes('.earning-tile.additional-income-tile') && css.includes('#134e4a') && css.includes('#99f6e4')],
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
