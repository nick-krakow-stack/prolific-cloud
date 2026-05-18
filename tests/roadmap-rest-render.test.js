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

const worktimeOverview = {
  ok: true,
  earnings: {
    today: { earned: { GBP: 0 }, pending: {} },
    week: { earned: { GBP: 0 }, pending: {} },
    month: { earned: { GBP: 12000 }, pending: {} },
    lastMonth: { earned: {}, pending: {} },
    allTime: { earned: { GBP: 24000 }, pending: {} }
  },
  worktime: {
    today: { paid_seconds: 45, unpaid_seconds: 0, total_seconds: 45, count_paid: 1, count_unpaid: 0, count_total: 1 },
    week: { paidSeconds: 3720, unpaidSeconds: 120, totalSeconds: 3840, countPaid: 2, countUnpaid: 1, countTotal: 3 },
    month: { paid_seconds: 14400, unpaid_seconds: 0, total_seconds: 14400, count_paid: 4, count_unpaid: 0, count_total: 4 },
    allTime: { paidSeconds: 28800, unpaidSeconds: 360, totalSeconds: 29160, countPaid: 8, countUnpaid: 1, countTotal: 9 }
  },
  fxRates: {
    base: 'GBP',
    rates: { EUR: 1.18, USD: 1.27 }
  },
  goals: {
    daily_gbp_minor: 500,
    monthly_gbp_minor: 15000
  },
  forecast: {},
  pendingStats: {},
  todayStats: {},
  monthStats: {},
  statusStats: { counts: {} },
  efficiency: {},
  topStudies: {},
  dailyStats: [],
  serverTime: '2026-05-17T12:00:00Z'
};
const worktimeOverviewHtml = sandbox.renderExpandedOverview(worktimeOverview);

const stats = {
  ok: true,
  fxRates: {
    base: 'GBP',
    rates: { EUR: 1.18, USD: 1.27 }
  },
  monthlyComparison: {
    current: { earned: { GBP: 12298 }, submissionsCount: 18 },
    previous: { earned: { GBP: 1317 }, submissionsCount: 3 },
    delta: { earned: { GBP: 10981 }, percent: 833.8 }
  },
  heatmap: [
    { date: '2026-04-30', earned: { GBP: 250 }, pending: {} },
    { date: '2026-05-01', earned: { GBP: 420 }, pending: {} },
    { date: '2026-05-02', earned: {}, pending: {} }
  ],
  dailyStats: [
    { date: '2026-05-01', earned: { GBP: 420 }, pending: {} },
    { date: '2026-05-02', earned: { GBP: 180 }, pending: { GBP: 40 } }
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
    hourlyRate: { byCurrency: { GBP: 1440 }, rewardByCurrency: { GBP: 5040 }, sampleCount: 14, secondsTotal: 12600 },
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
      is_active: 0,
      expired: 1
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
const manyEventsHtml = sandbox.renderEvents({
  ok: true,
  events: Array.from({ length: 12 }, (_, index) => ({
    type: 'sync_ok',
    message: `Sync ${index + 1}`,
    timestamp: `2026-05-17 16:${String(59 - index).padStart(2, '0')}:00`
  }))
});
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
stats.studiesData = studies;
const statsHtml = sandbox.renderStats(stats);
const studiesFilterHtml = sandbox.renderStudiesFilterBar ? sandbox.renderStudiesFilterBar() : '';
const expandedStatsStudiesHtml = sandbox.renderStatsStudiesSection ? sandbox.renderStatsStudiesSection(studies, true) : '';
const aprilHeatmapHtml = sandbox.renderHeatmap ? sandbox.renderHeatmap(sandbox.normalizeHeatmap(stats), stats.fxRates, stats.serverTime, '2026-04') : '';
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
  ['overview supports worktime snake and camel fields', worktimeOverviewHtml.includes('<div class="label">ARBEITSZEIT HEUTE</div>') && worktimeOverviewHtml.includes(`<div class="value">\u2013</div>`) && worktimeOverviewHtml.includes('<div class="label">ARBEITSZEIT DIESE WOCHE</div>') && worktimeOverviewHtml.includes('<div class="value">1 h 2 min</div>') && worktimeOverviewHtml.includes('Davon 2 min unbezahlt') && worktimeOverviewHtml.includes('<div class="label">ARBEITSZEIT GESAMT</div>') && worktimeOverviewHtml.includes('<div class="value">8 h</div>')],
  ['overview renders effective hourly KPI and dash for zero paid seconds', worktimeOverviewHtml.includes('<div class="label">EFFEKTIVER STUNDENLOHN MONAT</div>') && worktimeOverviewHtml.includes(`<div class="value">\u20ac35,40/h</div>`) && worktimeOverviewHtml.includes('<div class="label">EFFEKTIVER STUNDENLOHN GESAMT</div>') && worktimeOverviewHtml.includes(`<div class="value">\u20ac35,40/h</div>`) && typeof sandbox.fmtEffectiveHourlyKpi === 'function' && sandbox.fmtEffectiveHourlyKpi({ earned: { GBP: 500 } }, { paid_seconds: 0 }, settings.fxRates).rate === '\u2013'],
  ['renders monthly comparison', typeof sandbox.renderStats === 'function' && statsHtml.includes('Monatsvergleich')],
  ['renders requester analysis', typeof sandbox.renderStats === 'function' && statsHtml.includes('ABC Research')],
  ['renders requester analysis as table columns', statsHtml.includes('class="requester-table"') && statsHtml.includes('<span>Requester</span>') && statsHtml.includes('<span>Anzahl</span>') && statsHtml.includes('<span>Verdienst</span>') && statsHtml.includes('<span>Stundenlohn</span>') && statsHtml.includes('<span>Approval-Rate</span>')],
  ['renders monthly report', typeof sandbox.renderStats === 'function' && statsHtml.includes('Monatsbericht')],
  ['renders monthly report month in German format', statsHtml.includes('Mai 2026') && !statsHtml.includes('>2026-05<')],
  ['renders monthly report basis as studies not samples', statsHtml.includes('14 Studien') && !statsHtml.includes('Samples')],
  ['renders monthly report hourly in EUR with separate study and work-hour rows', statsHtml.includes('<span class="key">Stundenlohn</span>') && statsHtml.includes('<span class="value">€16,99/h</span>') && /<span class="key">Stundenlohn<\/span>[\s\S]*<span class="key">Studien<\/span>[\s\S]*<span class="value">14 Studien<\/span>[\s\S]*<span class="key">Arbeitszeit<\/span>[\s\S]*<span class="value">3 Std 30 Min<\/span>/.test(statsHtml) && !statsHtml.includes('£14,40/h &middot; 14 Studien')],
  ['renders full current-month heatmap with future days', statsHtml.includes('class="heatmap-grid"') && (statsHtml.match(/class="heatmap-day/g) || []).length === 31 && statsHtml.includes('is-future') && statsHtml.includes('31.05.')],
  ['renders income history in stats tab', statsHtml.includes('<h3>Einnahmen-Verlauf</h3>') && statsHtml.includes('class="daily-chart"') && statsHtml.includes('class="daily-bar"')],
  ['renders heatmap month navigation', statsHtml.includes('class="heatmap-header"') && statsHtml.includes('data-heatmap-nav="prev"') && statsHtml.includes('Mai 2026') && statsHtml.includes('data-heatmap-nav="next"') && statsHtml.includes('data-heatmap-nav="today"')],
  ['disables heatmap next button in current month', /data-heatmap-nav="next"[\s\S]*disabled/.test(statsHtml)],
  ['renders selected previous heatmap month', aprilHeatmapHtml.includes('April 2026') && (aprilHeatmapHtml.match(/class="heatmap-day/g) || []).length === 30 && aprilHeatmapHtml.includes('30.04.') && aprilHeatmapHtml.includes('£2,50') && !/data-heatmap-nav="next"[\s\S]*disabled/.test(aprilHeatmapHtml)],
  ['stats binds heatmap navigation controls', code.includes("target.dataset.heatmapNav") && code.includes('statsHeatmapMonth = shiftMonthKey') && code.includes('statsHeatmapMonth = currentHeatmapMonthKey')],
  ['stats endpoint provides historical heatmap data', /'heatmap'\s*=>\s*build_heatmap_history\(/.test(apiData)],
  ['moves studies into stats tab', !appShell.includes('data-tab="studies"') && !appShell.includes('id="panel-studies"') && statsHtml.includes('<h3>Studien</h3>')],
  ['stats studies default shows only active studies', statsHtml.includes('Quality study') && !statsHtml.includes('Older study') && statsHtml.includes('Alle Studien anzeigen') && !statsHtml.includes('id="studiesSort"')],
  ['expanded stats studies keeps the toggle button before filters', expandedStatsStudiesHtml.includes('Studien ausblenden') && expandedStatsStudiesHtml.indexOf('Studien ausblenden') < expandedStatsStudiesHtml.indexOf('id="studiesSort"')],
  ['stats studies toggle can collapse the expanded list', code.includes("target.id === 'statsShowAllStudies'") && code.includes('statsShowAllStudies = !statsShowAllStudies;')],
  ['stats fetches studies when loading statistics', /if \(tab === 'stats'\)[\s\S]*fetchData\('studies'\)/.test(code) && code.includes('data.studiesData = studiesData;')],
  ['renders settings form', typeof sandbox.renderSettings === 'function' && settingsHtml.includes('Monatsziel')],
  ['renders settings money controls in EUR', settingsHtml.includes('settingsDailyGoal') && settingsHtml.includes('€') && settingsHtml.includes('5.90') && !settingsHtml.includes('setting-prefix">£')],
  ['preserves exact EUR settings values after reload', /id="settingsOkHourly"[\s\S]*value="10\.00"/.test(exactEurSettingsHtml) && /id="settingsDailyGoal"[\s\S]*value="30\.00"/.test(exactEurSettingsHtml)],
  ['settings save payload carries exact EUR values', code.includes('ok_hourly_eur_minor: inputToDisplayMinor') && apiData.includes("'ok_hourly_eur_minor'")],
  ['moves system health from settings to system tab', !settingsHtml.includes('System-Health') && !settingsHtml.includes('health-grid') && systemHtml.includes('System-Health') && systemHtml.includes('health-grid')],
  ['uses readable system health count labels', systemHtml.includes('<span>Studien</span>') && systemHtml.includes('<span>Teilnahmen</span>') && systemHtml.includes('<span>Ereignisse</span>') && systemHtml.includes('<span>Sync-Log</span>') && !systemHtml.includes('<span>studies</span>') && !systemHtml.includes('<span>submissions</span>') && !systemHtml.includes('<span>events</span>') && !systemHtml.includes('<span>syncLog</span>')],
  ['uses German event label in system status', systemHtml.includes('Ereignisse in DB') && !systemHtml.includes('Events in DB')],
  ['moves sync status from tab to system tab', !appShell.includes('data-tab="events"') && !appShell.includes('id="panel-events"') && !appShell.includes('eventsContent') && systemHtml.includes('Sync-Status') && systemHtml.includes('Letzter erfolgreicher Sync') && systemHtml.includes('<details class="log-details">')],
  ['moves currency box from settings to system tab', !accountHtml.includes('W&auml;hrungen') && !accountHtml.includes('FX-Rates') && !settingsHtml.includes('W&auml;hrungen') && !settingsHtml.includes('FX-Rates') && systemHtml.includes('W&auml;hrungen') && systemHtml.includes('FX-Rates') && systemHtml.includes('Teilnahmen exportieren')],
  ['system endpoint provides fx rates for currency box', /'fxRates'\s*=>\s*decode_setting_value\(get_setting\('fxRates'\)\)/.test(systemResponseSource)],
  ['removes account tab from shell', !appShell.includes('data-tab="account"') && !appShell.includes('id="panel-account"') && !appShell.includes('accountContent')],
  ['renders modern autosave settings controls', settingsHtml.includes('class="settings-form"') && settingsHtml.includes('type="range"') && settingsHtml.includes('Automatisch gespeichert')],
  ['settings no longer requires manual submit', !settingsHtml.includes('type="submit"')],
  ['studies panel has date range controls', typeof sandbox.studyInDateRange === 'function' && sandbox.studyInDateRange(studies.studies[0], '2026-05-15', '2026-05-18') && !sandbox.studyInDateRange(studies.studies[1], '2026-05-15', '2026-05-18')],
  ['studies date range handles swapped bounds', sandbox.studyInDateRange(studies.studies[0], '2026-05-18', '2026-05-15') && !sandbox.studyInDateRange(studies.studies[1], '2026-05-18', '2026-05-15')],
  ['studies filter controls are rendered inside stats expansion', studiesFilterHtml.includes('id="studiesPageSize"') && studiesFilterHtml.includes('value="50"') && studiesFilterHtml.includes('value="all"')],
  ['studies filter omits filter and page-size labels', !/Filter:\s*[\r\n\s]*<select id="studiesFilter"/.test(studiesFilterHtml) && !/Anzeige:\s*[\r\n\s]*<select id="studiesPageSize"/.test(studiesFilterHtml)],
  ['studies date filter is compact calendar popover', studiesFilterHtml.includes('id="studiesDateToggle"') && studiesFilterHtml.includes('class="filter-icon date-filter-toggle"') && studiesFilterHtml.includes('aria-controls="studiesDatePanel"') && studiesFilterHtml.includes('id="studiesDatePanel" class="date-filter-panel" hidden') && studiesFilterHtml.indexOf('id="studiesDateToggle"') < studiesFilterHtml.indexOf('id="studiesDatePanel"') && studiesFilterHtml.indexOf('id="studiesDatePanel"') < studiesFilterHtml.indexOf('id="studiesDateFrom"')],
  ['studies date filter opens native picker from calendar button', code.includes("const studiesDateToggle = $('studiesDateToggle')") && code.includes('studiesDateFrom.showPicker') && code.includes("setAttribute('aria-expanded', 'true')")],
  ['studies default page size is 50 with lazy load control', (studiesHtml.match(/class="study-card"/g) || []).length === 50 && studiesHtml.includes('50 von 55') && studiesHtml.includes('Weitere 5 laden')],
  ['studies page-size helper supports all', typeof sandbox.resolveStudiesPageSize === 'function' && sandbox.resolveStudiesPageSize('all', 55) === 55 && sandbox.resolveStudiesPageSize('50', 55) === 50],
  ['does not render study note controls', !studiesHtml.includes('data-study-note') && !studiesHtml.includes('Notiz speichern')],
  ['renders study detail tiles instead of a compact meta line', studiesHtml.includes('class="study-detail-grid"') && studiesHtml.includes('Vergütung') && studiesHtml.includes('Dauer') && studiesHtml.includes('Plätze') && studiesHtml.includes('Stundenlohn') && studiesHtml.includes('Gesehen') && !studiesHtml.includes('class="meta"')],
  ['renders study quality tag next to title', expiredStudyHtml.includes('class="study-title"') && /<div class="name">Expired low study<\/div>[\s\S]*<span class="tag tag-inactive">Niedrig<\/span>/.test(expiredStudyHtml)],
  ['does not render study availability status tags', !expiredStudyHtml.includes('Voll/Abgelaufen') && !expiredStudyHtml.includes('Aktiv') && !expiredStudyHtml.includes('Beendet')],
  ['submissions panel has matching filter controls and csv icon', appShell.includes('id="submissionsSort"') && appShell.includes('id="submissionsFilter"') && appShell.includes('id="submissionsPageSize"') && appShell.includes('id="submissionsDateFrom"') && appShell.includes('id="submissionsDateTo"') && appShell.includes('class="filter-icon export-icon"')],
  ['submissions filter omits filter and page-size labels', !/Filter:\s*[\r\n\s]*<select id="submissionsFilter"/.test(appShell) && !/Anzeige:\s*[\r\n\s]*<select id="submissionsPageSize"/.test(appShell)],
  ['submissions date filter is compact calendar popover', appShell.includes('id="submissionsDateToggle"') && appShell.includes('class="filter-icon date-filter-toggle"') && appShell.includes('aria-controls="submissionsDatePanel"') && appShell.includes('id="submissionsDatePanel" class="date-filter-panel" hidden') && appShell.indexOf('id="submissionsDateToggle"') < appShell.indexOf('id="submissionsDatePanel"') && appShell.indexOf('id="submissionsDatePanel"') < appShell.indexOf('id="submissionsDateFrom"') && appShell.indexOf('</fieldset>', appShell.indexOf('id="submissionsDatePanel"')) < appShell.indexOf('class="filter-icon export-icon"')],
  ['submissions date filter opens native picker from calendar button', code.includes("const submissionsDateToggle = $('submissionsDateToggle')") && code.includes('submissionsDateFrom.showPicker') && code.includes("setAttribute('aria-expanded', 'true')")],
  ['submissions filter keeps clean text', appShell.includes('Älteste zuerst') && appShell.includes('Höchste Vergütung') && appShell.includes('Zurücksetzen') && !appShell.includes('Ã„lteste') && !appShell.includes('ZurÃ¼cksetzen')],
  ['submissions date range handles swapped bounds', typeof sandbox.submissionInDateRange === 'function' && sandbox.submissionInDateRange({ completed_at: '2026-05-17 12:10:00' }, '2026-05-18', '2026-05-15') && !sandbox.submissionInDateRange({ completed_at: '2026-05-10 11:08:00' }, '2026-05-18', '2026-05-15')],
  ['submissions render without export status box', !submissionsFilterHtml.includes('<h3>Export</h3>') && !submissionsFilterHtml.includes('CSV Export') && submissionsFilterHtml.includes('Recent approved')],
  ['submissions render four summary tiles and a wide chart tile in one grid', submissionsFilterHtml.includes('class="submission-summary-grid"') && (submissionsFilterHtml.match(/class="submission-summary-tile/g) || []).length === 4 && /<div class="submission-summary-grid">[\s\S]*class="submission-chart-card summary-wide"/.test(submissionsFilterHtml) && css.includes('grid-template-columns: repeat(6, minmax(0, 1fr))') && css.includes('.submission-chart-card.summary-wide') && submissionsFilterHtml.includes('class="submission-pie"') && submissionsFilterHtml.includes('Approved') && submissionsFilterHtml.includes('In Prüfung') && submissionsFilterHtml.includes('Screened Out') && submissionsFilterHtml.includes('Returned / Timed-Out')],
  ['submissions pie chart uses CSP-safe SVG segments instead of inline conic gradient', submissionsFilterHtml.includes('class="submission-pie-svg"') && (submissionsFilterHtml.match(/class="submission-pie-segment/g) || []).length >= 3 && submissionsFilterHtml.includes('stroke-dasharray=') && !submissionsFilterHtml.includes('conic-gradient') && !submissionsFilterHtml.includes('style="background:')],
  ['submissions render effective reward amount when present', submissionsHtml.includes('1,86') && !submissionsHtml.includes('0,36')],
  ['renders sync status summary', eventsHtml.includes('Sync-Status') && eventsHtml.includes('Letzter erfolgreicher Sync')],
  ['renders missing sync failure as never', eventsHtml.includes('Letzter Fehlschlag') && eventsHtml.includes('Nie')],
  ['renders collapsed log details', eventsHtml.includes('<details class="log-details">') && eventsHtml.includes('<summary>Log</summary>')],
  ['limits system log rendering to ten events', (manyEventsHtml.match(/class="event-card"/g) || []).length === 10 && manyEventsHtml.includes('Sync 10') && !manyEventsHtml.includes('Sync 11')],
  ['system endpoint fetches only ten log events', /function build_system_response[\s\S]*bindValue\(1,\s*10,\s*PDO::PARAM_INT\)/.test(systemResponseSource)],
  ['renders distinct logout button symbol', appShell.includes('href="/logout.php" class="icon-btn logout-btn"') && appShell.includes('aria-label="Abmelden"') && appShell.includes('&#x23FB;') && !appShell.includes('>⎋</a>')],
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
