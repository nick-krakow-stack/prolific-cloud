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

const stats = {
  ok: true,
  monthlyComparison: {
    current: { earned: { GBP: 12298 }, submissionsCount: 18 },
    previous: { earned: { GBP: 1317 }, submissionsCount: 3 },
    delta: { earned: { GBP: 10981 }, percent: 833.8 }
  },
  heatmap: [
    { date: '2026-05-01', earned: { GBP: 420 }, pending: {} },
    { date: '2026-05-02', earned: {}, pending: {} }
  ],
  requesterStats: [
    {
      requester: 'ABC Research',
      submissionsCount: 4,
      approvedCount: 4,
      totalReward: { GBP: 4280 },
      averageHourlyRate: { GBP: 1800 },
      approvalRate: 100
    }
  ],
  monthlyReport: {
    month: '2026-05',
    earned: { GBP: 12298 },
    pending: { GBP: 3583 },
    submissionsCount: 21,
    statusCounts: { APPROVED: 18, 'AWAITING REVIEW': 3 },
    hourlyRate: { byCurrency: { GBP: 1440 }, sampleCount: 14 },
    topStudies: [
      { studyId: 's1', name: 'Report study', rewardMinor: 850, rewardCurrency: 'GBP' }
    ]
  }
};

const settings = {
  ok: true,
  settings: {
    goals: { daily_gbp_minor: 500, monthly_gbp_minor: 15000 },
    thresholds: { great_hourly_gbp_minor: 1200, ok_hourly_gbp_minor: 800 }
  }
};

const studies = {
  ok: true,
  studies: [
    {
      id: 'study-1',
      name: 'Quality study',
      reward_minor: 500,
      reward_currency: 'GBP',
      estimated_minutes: 10,
      reward_per_hour: 3000,
      first_seen: '2026-05-17 10:00:00',
      is_active: 1,
      notes: [{ id: 7, note: 'Good requester', updated_at: '2026-05-17 12:00:00' }]
    }
  ]
};

const checks = [
  ['renders stats tab content', typeof sandbox.renderStats === 'function' && sandbox.renderStats(stats).includes('Kalender-Heatmap')],
  ['renders monthly comparison', typeof sandbox.renderStats === 'function' && sandbox.renderStats(stats).includes('Monatsvergleich')],
  ['renders requester analysis', typeof sandbox.renderStats === 'function' && sandbox.renderStats(stats).includes('ABC Research')],
  ['renders monthly report', typeof sandbox.renderStats === 'function' && sandbox.renderStats(stats).includes('Monatsbericht')],
  ['renders settings form', typeof sandbox.renderSettings === 'function' && sandbox.renderSettings(settings).includes('Monatsziel')],
  ['renders note control', sandbox.renderStudies(studies).includes('data-study-note')],
  ['renders quality tag', sandbox.renderStudies(studies).includes('Sehr gut')]
];

let failed = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);

  if (!passed) failed++;
}

if (failed > 0) {
  process.exit(1);
}
