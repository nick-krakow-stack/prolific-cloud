const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('dashboard/assets/app.js', 'utf8');
const css = fs.readFileSync('dashboard/assets/style.css', 'utf8');
const appShell = fs.readFileSync('dashboard/app.php', 'utf8');
const apiData = fs.readFileSync('api/data.php', 'utf8');
const systemResponseSource = (apiData.match(/function build_system_response[\s\S]*?\n}\n\nfunction build_settings_response/) || [''])[0];

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
  fxRates: {
    base: 'GBP',
    rates: { EUR: 1.18, USD: 1.27 },
    fetchedAt: '2026-05-17T10:00:00Z'
  },
  settings: {
    goals: { daily_gbp_minor: 500, monthly_gbp_minor: 15000 },
    thresholds: { great_hourly_gbp_minor: 1200, ok_hourly_gbp_minor: 800 }
  },
  system: {
    api: 'ok',
    lastSyncAt: '2026-05-17T11:59:00Z',
    lastError: null,
    dbCounts: { studies: 12, submissions: 34, events: 5, syncLog: 3 },
    serverTime: '2026-05-17T12:00:00Z'
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
      total_places: 87,
      reward_per_hour: 3000,
      first_seen: '2026-05-17 10:00:00',
      is_active: 1
    },
    {
      id: 'study-2',
      name: 'Older study',
      reward_minor: 200,
      reward_currency: 'GBP',
      estimated_minutes: 8,
      total_places: 12,
      reward_per_hour: 1500,
      first_seen: '2026-05-10 10:00:00',
      is_active: 1
    }
  ]
};

for (let i = 3; i <= 55; i++) {
  studies.studies.push({
    id: `study-${i}`,
    name: `Paged study ${i}`,
    reward_minor: 100 + i,
    reward_currency: 'GBP',
    estimated_minutes: 5,
    total_places: 10,
    reward_per_hour: 1200,
    first_seen: `2026-05-${String(18 - (i % 9)).padStart(2, '0')} 09:00:00`,
    is_active: 1
  });
}

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
const exactEurSettingsHtml = sandbox.renderSettings({
  ...settings,
  settings: {
    goals: {
      daily_gbp_minor: 2542,
      daily_eur_minor: 3000,
      monthly_gbp_minor: 50847,
      monthly_eur_minor: 60000
    },
    thresholds: {
      great_hourly_gbp_minor: 2119,
      great_hourly_eur_minor: 2500,
      ok_hourly_gbp_minor: 847,
      ok_hourly_eur_minor: 1000
    }
  }
});
const systemHtml = sandbox.renderSystem({ ...settings, ...events });
const statsHtml = sandbox.renderStats(stats);
const accountHtml = sandbox.renderAccount({
  ok: true,
  balance: {
    approved_per_currency: { GBP: 1139 },
    pending_per_currency: { GBP: 2465, USD: 1562 },
    fetchedAt: '2026-05-17T11:58:00Z'
  },
  fxRates: settings.fxRates,
  serverTime: '2026-05-17T12:00:00Z'
});
const studiesHtml = sandbox.renderStudies(studies);
const expiredStudyHtml = sandbox.renderStudies({
  ok: true,
  studies: [
    {
      id: 'expired-low',
      name: 'Expired low study',
      reward_minor: 267,
      reward_currency: 'GBP',
      estimated_minutes: 20,
      total_places: 45,
      reward_per_hour: 500,
      first_seen: '2026-05-17 19:22:00',
      is_active: 0,
      expired: 1
    }
  ]
});
const submissionsHtml = sandbox.renderSubmissions({
  ok: true,
  submissions: [
    {
      study_name: 'Adjusted reward study',
      status: 'APPROVED',
      effective_reward_amount_minor: 186,
      reward_amount_minor: 36,
      reward_currency: 'GBP',
      time_taken_seconds: 600,
      started_at: '2026-05-17 12:00:00',
      completed_at: '2026-05-17 12:10:00'
    }
  ]
});
const submissionsFilterHtml = sandbox.renderSubmissions({
  ok: true,
  submissions: [
    {
      study_name: 'Recent approved',
      status: 'APPROVED',
      effective_reward_amount_minor: 500,
      reward_currency: 'GBP',
      time_taken_seconds: 600,
      started_at: '2026-05-17 12:00:00',
      completed_at: '2026-05-17 12:10:00'
    },
    {
      study_name: 'Older returned',
      status: 'RETURNED',
      effective_reward_amount_minor: 200,
      reward_currency: 'GBP',
      time_taken_seconds: 480,
      started_at: '2026-05-10 11:00:00',
      completed_at: '2026-05-10 11:08:00'
    },
    {
      study_name: 'Pending study',
      status: 'AWAITING REVIEW',
      effective_reward_amount_minor: 300,
      reward_currency: 'GBP',
      time_taken_seconds: 300,
      started_at: '2026-05-16 10:00:00',
      completed_at: '2026-05-16 10:05:00'
    },
    {
      study_name: 'Screened study',
      status: 'SCREENED OUT',
      effective_reward_amount_minor: 100,
      reward_currency: 'GBP',
      time_taken_seconds: 120,
      started_at: '2026-05-15 10:00:00',
      completed_at: '2026-05-15 10:02:00'
    }
  ]
});

const checks = [
  ['renders stats tab content', typeof sandbox.renderStats === 'function' && statsHtml.includes('Kalender-Heatmap')],
  ['renders monthly comparison', typeof sandbox.renderStats === 'function' && statsHtml.includes('Monatsvergleich')],
  ['renders requester analysis', typeof sandbox.renderStats === 'function' && statsHtml.includes('ABC Research')],
  ['renders requester analysis as table columns', statsHtml.includes('class="requester-table"') && statsHtml.includes('<span>Requester</span>') && statsHtml.includes('<span>Anzahl</span>') && statsHtml.includes('<span>Verdienst</span>') && statsHtml.includes('<span>Stundenlohn</span>') && statsHtml.includes('<span>Approval-Rate</span>')],
  ['renders monthly report', typeof sandbox.renderStats === 'function' && statsHtml.includes('Monatsbericht')],
  ['renders monthly report month in German format', statsHtml.includes('Mai 2026') && !statsHtml.includes('>2026-05<')],
  ['renders monthly report basis as studies not samples', statsHtml.includes('14 Studien') && !statsHtml.includes('Samples')],
  ['renders full current-month heatmap with future days', statsHtml.includes('class="heatmap-grid"') && (statsHtml.match(/class="heatmap-day/g) || []).length === 31 && statsHtml.includes('is-future') && statsHtml.includes('31.05.')],
  ['renders settings form', typeof sandbox.renderSettings === 'function' && settingsHtml.includes('Monatsziel')],
  ['renders settings money controls in EUR', settingsHtml.includes('settingsDailyGoal') && settingsHtml.includes('€') && settingsHtml.includes('5.90') && !settingsHtml.includes('setting-prefix">£')],
  ['preserves exact EUR settings values after reload', /id="settingsOkHourly"[\s\S]*value="10\.00"/.test(exactEurSettingsHtml) && /id="settingsDailyGoal"[\s\S]*value="30\.00"/.test(exactEurSettingsHtml)],
  ['settings save payload carries exact EUR values', code.includes('ok_hourly_eur_minor: inputToDisplayMinor') && apiData.includes("'ok_hourly_eur_minor'")],
  ['moves system health from settings to system tab', !settingsHtml.includes('System-Health') && !settingsHtml.includes('health-grid') && systemHtml.includes('System-Health') && systemHtml.includes('health-grid')],
  ['capitalizes system health count labels', systemHtml.includes('<span>Submissions</span>') && !systemHtml.includes('<span>submissions</span>')],
  ['moves sync status from tab to system tab', !appShell.includes('data-tab="events"') && !appShell.includes('id="panel-events"') && !appShell.includes('eventsContent') && systemHtml.includes('Sync-Status') && systemHtml.includes('Letzter erfolgreicher Sync') && systemHtml.includes('<details class="log-details">')],
  ['moves currency box from settings to system tab', !accountHtml.includes('W&auml;hrungen') && !accountHtml.includes('FX-Rates') && !settingsHtml.includes('W&auml;hrungen') && !settingsHtml.includes('FX-Rates') && systemHtml.includes('W&auml;hrungen') && systemHtml.includes('FX-Rates') && systemHtml.includes('Teilnahmen exportieren')],
  ['system endpoint provides fx rates for currency box', /'fxRates'\s*=>\s*decode_setting_value\(get_setting\('fxRates'\)\)/.test(systemResponseSource)],
  ['removes account tab from shell', !appShell.includes('data-tab="account"') && !appShell.includes('id="panel-account"') && !appShell.includes('accountContent')],
  ['renders modern autosave settings controls', settingsHtml.includes('class="settings-form"') && settingsHtml.includes('type="range"') && settingsHtml.includes('Automatisch gespeichert')],
  ['settings no longer requires manual submit', !settingsHtml.includes('type="submit"')],
  ['studies panel has date range controls', typeof sandbox.studyInDateRange === 'function' && sandbox.studyInDateRange(studies.studies[0], '2026-05-15', '2026-05-18') && !sandbox.studyInDateRange(studies.studies[1], '2026-05-15', '2026-05-18')],
  ['studies date range handles swapped bounds', sandbox.studyInDateRange(studies.studies[0], '2026-05-18', '2026-05-15') && !sandbox.studyInDateRange(studies.studies[1], '2026-05-18', '2026-05-15')],
  ['studies panel has page-size control', appShell.includes('id="studiesPageSize"') && appShell.includes('value="50"') && appShell.includes('value="all"')],
  ['studies default page size is 50 with lazy load control', (studiesHtml.match(/class="study-card"/g) || []).length === 50 && studiesHtml.includes('50 von 55') && studiesHtml.includes('Weitere 5 laden')],
  ['studies page-size helper supports all', typeof sandbox.resolveStudiesPageSize === 'function' && sandbox.resolveStudiesPageSize('all', 55) === 55 && sandbox.resolveStudiesPageSize('50', 55) === 50],
  ['does not render study note controls', !studiesHtml.includes('data-study-note') && !studiesHtml.includes('Notiz speichern')],
  ['renders study detail tiles instead of a compact meta line', studiesHtml.includes('class="study-detail-grid"') && studiesHtml.includes('Vergütung') && studiesHtml.includes('Dauer') && studiesHtml.includes('Plätze') && studiesHtml.includes('Stundenlohn') && studiesHtml.includes('Gesehen') && !studiesHtml.includes('class="meta"')],
  ['renders study quality tag next to title', expiredStudyHtml.includes('class="study-title"') && /<div class="name">Expired low study<\/div>[\s\S]*<span class="tag tag-inactive">Niedrig<\/span>/.test(expiredStudyHtml)],
  ['does not render study availability status tags', !expiredStudyHtml.includes('Voll/Abgelaufen') && !expiredStudyHtml.includes('Aktiv') && !expiredStudyHtml.includes('Beendet')],
  ['submissions panel has matching filter controls and csv icon', appShell.includes('id="submissionsSort"') && appShell.includes('id="submissionsFilter"') && appShell.includes('id="submissionsPageSize"') && appShell.includes('id="submissionsDateFrom"') && appShell.includes('id="submissionsDateTo"') && appShell.includes('class="filter-icon export-icon"')],
  ['submissions filter omits filter and page-size labels', !/Filter:\s*[\r\n\s]*<select id="submissionsFilter"/.test(appShell) && !/Anzeige:\s*[\r\n\s]*<select id="submissionsPageSize"/.test(appShell)],
  ['submissions filter keeps export with date controls and clean text', appShell.indexOf('id="submissionsDateReset"') < appShell.indexOf('class="filter-icon export-icon"') && appShell.indexOf('class="filter-icon export-icon"') < appShell.indexOf('</fieldset>', appShell.indexOf('id="submissionsDateReset"')) && appShell.includes('Älteste zuerst') && appShell.includes('Höchste Vergütung') && appShell.includes('Zurücksetzen') && !appShell.includes('Ã„lteste') && !appShell.includes('ZurÃ¼cksetzen')],
  ['submissions date range handles swapped bounds', typeof sandbox.submissionInDateRange === 'function' && sandbox.submissionInDateRange({ completed_at: '2026-05-17 12:10:00' }, '2026-05-18', '2026-05-15') && !sandbox.submissionInDateRange({ completed_at: '2026-05-10 11:08:00' }, '2026-05-18', '2026-05-15')],
  ['submissions render without export status box', !submissionsFilterHtml.includes('<h3>Export</h3>') && !submissionsFilterHtml.includes('CSV Export') && submissionsFilterHtml.includes('Recent approved')],
  ['submissions render four summary tiles and pie chart', submissionsFilterHtml.includes('class="submission-summary-grid"') && (submissionsFilterHtml.match(/class="submission-summary-tile/g) || []).length === 4 && submissionsFilterHtml.includes('class="submission-pie"') && submissionsFilterHtml.includes('Approved') && submissionsFilterHtml.includes('In Prüfung') && submissionsFilterHtml.includes('Screened Out') && submissionsFilterHtml.includes('Returned / Timed-Out')],
  ['submissions render effective reward amount when present', submissionsHtml.includes('1,86') && !submissionsHtml.includes('0,36')],
  ['renders sync status summary', eventsHtml.includes('Sync-Status') && eventsHtml.includes('Letzter erfolgreicher Sync')],
  ['renders missing sync failure as never', eventsHtml.includes('Letzter Fehlschlag') && eventsHtml.includes('Nie')],
  ['renders collapsed log details', eventsHtml.includes('<details class="log-details">') && eventsHtml.includes('<summary>Log</summary>')],
  ['styles page links with warm non-blue color', css.includes('--link:') && css.includes('a:not(.icon-btn)') && css.includes('color: var(--link)')],
  ['styles refresh button spinner state', css.includes('@keyframes refresh-spin') && css.includes('.icon-btn.is-refreshing .icon-btn-symbol') && css.includes('animation: refresh-spin')],
  ['styles page refresh loading overlay', css.includes('.tab-panel.is-loading::after') && css.includes('.tab-panel.is-loading::before') && css.includes('@keyframes loading-pulse')]
];

let failed = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);

  if (!passed) failed++;
}

if (failed > 0) {
  process.exit(1);
}
