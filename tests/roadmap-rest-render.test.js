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
  serverTime: '2026-05-17T12:00:00+02:00',
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

const events = {
  ok: true,
  syncStatus: {
    lastSync: {
      status: 'ok',
      type: 'sync_ok',
      message: 'Sync abgeschlossen',
      timestamp: '2026-05-17 16:00:00'
    },
    lastSuccess: {
      status: 'ok',
      type: 'sync_ok',
      message: 'Sync abgeschlossen',
      timestamp: '2026-05-17 16:00:00'
    },
    lastFailure: null
  },
  events: [
    {
      type: 'sync_ok',
      message: 'Sync abgeschlossen',
      timestamp: '2026-05-17 16:00:00'
    }
  ]
};

const eventsHtml = sandbox.renderEvents(events);
const settingsHtml = sandbox.renderSettings(settings);
const statsHtml = sandbox.renderStats(stats);

const checks = [
  ['renders stats tab content', typeof sandbox.renderStats === 'function' && statsHtml.includes('Kalender-Heatmap')],
  ['renders monthly comparison', typeof sandbox.renderStats === 'function' && statsHtml.includes('Monatsvergleich')],
  ['renders requester analysis', typeof sandbox.renderStats === 'function' && statsHtml.includes('ABC Research')],
  ['renders requester analysis as table columns', statsHtml.includes('class="requester-table"') && statsHtml.includes('<span>Requester</span>') && statsHtml.includes('<span>Anzahl</span>') && statsHtml.includes('<span>Verdienst</span>') && statsHtml.includes('<span>Stundenlohn</span>') && statsHtml.includes('<span>Approval-Rate</span>')],
  ['renders monthly report', typeof sandbox.renderStats === 'function' && statsHtml.includes('Monatsbericht')],
  ['renders monthly report month in German format', statsHtml.includes('Mai 2026') && !statsHtml.includes('>2026-05<')],
  ['renders full current-month heatmap with future days', statsHtml.includes('class="heatmap-grid"') && (statsHtml.match(/class="heatmap-day/g) || []).length === 31 && statsHtml.includes('is-future') && statsHtml.includes('31.05.')],
  ['renders settings form', typeof sandbox.renderSettings === 'function' && settingsHtml.includes('Monatsziel')],
  ['renders modern autosave settings controls', settingsHtml.includes('class="settings-form"') && settingsHtml.includes('type="range"') && settingsHtml.includes('Automatisch gespeichert')],
  ['settings no longer requires manual submit', !settingsHtml.includes('type="submit"')],
  ['renders note control', sandbox.renderStudies(studies).includes('data-study-note')],
  ['renders quality tag', sandbox.renderStudies(studies).includes('Sehr gut')],
  ['renders sync status summary', eventsHtml.includes('Sync-Status') && eventsHtml.includes('Letzter erfolgreicher Sync')],
  ['renders missing sync failure as never', eventsHtml.includes('Letzter Fehlschlag') && eventsHtml.includes('Nie')],
  ['renders collapsed log details', eventsHtml.includes('<details class="log-details">') && eventsHtml.includes('<summary>Log</summary>')],
  ['styles page links with warm non-blue color', css.includes('--link:') && css.includes('a:not(.icon-btn)') && css.includes('color: var(--link)')]
];

let failed = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);

  if (!passed) failed++;
}

if (failed > 0) {
  process.exit(1);
}
