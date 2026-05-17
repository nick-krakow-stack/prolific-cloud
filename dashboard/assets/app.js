// ============================================================
// Prolific Watcher Dashboard - JavaScript
// Lädt Daten von /api/data.php und rendert sie in die Tabs.
// ============================================================

const API_BASE = '/api/data.php';
const DASH = '–';
const WATCHER_ONLINE_MAX_AGE_MIN = 10;

let cachedData = {
  overview: null,
  studies: null,
  submissions: null,
  events: null
};

// ---- Helpers ----

function $(id) {
  return document.getElementById(id);
}

function fmtAmount(minor, currency) {
  if (minor == null) return DASH;

  const sym =
    currency === 'USD' ? '$' :
    currency === 'EUR' ? '€' :
    currency === 'GBP' ? '£' :
    currency + ' ';

  return sym + (minor / 100).toFixed(2).replace('.', ',');
}

function fmtMulti(byCurrency) {
  if (!byCurrency || Object.keys(byCurrency).length === 0) return DASH;

  const parts = [];
  const order = ['GBP', 'USD', 'EUR'];

  const sorted = Object.keys(byCurrency).sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);

    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;

    return ai - bi;
  });

  for (const cur of sorted) {
    if (byCurrency[cur] > 0) {
      parts.push(fmtAmount(byCurrency[cur], cur));
    }
  }

  return parts.length ? parts.join(' + ') : DASH;
}

function fmtCount(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return DASH;

  return Math.round(numeric).toLocaleString('de-DE');
}

function fmtPercent(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return DASH;

  const percent = Math.abs(numeric) <= 1 && numeric !== 0 ? numeric * 100 : numeric;
  const rounded = Math.round(percent * 10) / 10;

  return rounded.toLocaleString('de-DE', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
    maximumFractionDigits: 1
  }) + ' %';
}

function clampPercent(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return null;

  return Math.max(0, Math.min(100, numeric));
}

function progressPercent(currentMinor, targetMinor) {
  const current = Number(currentMinor);
  const target = Number(targetMinor);

  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return null;
  }

  return (current / target) * 100;
}

function renderProgressBar(percent) {
  const clamped = clampPercent(percent);

  if (clamped == null) {
    return `
      <div class="progress-bar" aria-label="Fortschritt ${DASH}"
           style="height:8px;background:var(--border);border-radius:999px;overflow:hidden;margin:8px 0 4px;">
        <div class="progress-fill" style="height:100%;width:0%;background:var(--primary);border-radius:999px;"></div>
      </div>
    `;
  }

  return `
    <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"
         aria-valuenow="${Math.round(clamped)}"
         style="height:8px;background:var(--border);border-radius:999px;overflow:hidden;margin:8px 0 4px;">
      <div class="progress-fill"
           style="height:100%;width:${clamped.toFixed(2)}%;background:var(--primary);border-radius:999px;"></div>
    </div>
  `;
}

function asObject(value) {
  value = parseJsonMaybe(value);

  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstDefined(source, keys) {
  const obj = asObject(source);

  for (const key of keys) {
    if (obj[key] != null) return obj[key];
  }

  return null;
}

function firstNumber(source, keys) {
  const value = firstDefined(source, keys);
  const numeric = Number(value);

  return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

function firstNumeric(source, keys) {
  const value = firstDefined(source, keys);
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function firstBoolean(source, keys) {
  const value = firstDefined(source, keys);

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();

    if (['1', 'true', 'yes', 'ja'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'nein'].includes(normalized)) return false;
  }

  return null;
}

function currencyMinor(byCurrency, currency = 'GBP') {
  const map = asObject(byCurrency);
  const value = map[currency] ?? map[currency.toLowerCase()];
  const numeric = Number(value);

  return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

function hasCurrencyAmounts(byCurrency) {
  return Object.values(asObject(byCurrency)).some(value => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0;
  });
}

function fmtDateTime(iso) {
  if (!iso) return DASH;

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return DASH;

  return d.toLocaleString('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function fmtTimestamp(iso) {
  if (!iso) return DASH;

  const then = new Date(iso);

  if (Number.isNaN(then.getTime())) return DASH;

  const now = new Date();
  const isToday = then.toDateString() === now.toDateString();

  const time = then.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  });

  if (isToday) return 'heute ' + time;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (then.toDateString() === yesterday.toDateString()) {
    return 'gestern ' + time;
  }

  return then.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit'
  }) + ' ' + time;
}

function fmtTimeAgo(iso) {
  if (!iso) return DASH;

  const then = new Date(iso);

  if (Number.isNaN(then.getTime())) return DASH;

  const diff = Math.floor((new Date() - then) / 1000);

  if (diff < 60) return 'gerade eben';

  const m = Math.floor(diff / 60);
  if (m < 60) return `vor ${m} Min`;

  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;

  const d = Math.floor(h / 24);
  return `vor ${d} Tg`;
}

function escapeHtml(s) {
  if (s == null) return '';

  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// ---- JSON Helper ----

function parseJsonMaybe(value) {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();

  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch (e) {
    return value;
  }
}

// ---- Balance Helpers ----

function looksLikeMinorUnits(value) {
  return Number.isInteger(value) && Math.abs(value) >= 1000;
}

function normalizeAmountToMinor(value, forceMinor = false) {
  if (value == null) return null;

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return null;

  if (forceMinor) {
    return Math.round(numeric);
  }

  if (looksLikeMinorUnits(numeric)) {
    return Math.round(numeric);
  }

  return Math.round(numeric * 100);
}

function addCurrencyAmount(target, currency, value, forceMinor = false) {
  if (!currency || value == null) return;

  const cur = String(currency).toUpperCase();
  const minor = normalizeAmountToMinor(value, forceMinor);

  if (minor == null) return;

  target[cur] = (target[cur] || 0) + minor;
}

function extractCurrencyMap(source, forceMinor = false) {
  const result = {};

  source = parseJsonMaybe(source);

  if (!source) return result;

  // Variante 1:
  // [
  //   { currency: 'GBP', amount: 12.34 },
  //   { currency: 'USD', amount: 5.67 }
  // ]
  if (Array.isArray(source)) {
    for (const itemRaw of source) {
      const item = parseJsonMaybe(itemRaw);

      if (!item || typeof item !== 'object') continue;

      const currency =
        item.currency ??
        item.code ??
        item.reward_currency;

      if (!currency) continue;

      if (item.amount_minor != null) {
        addCurrencyAmount(result, currency, item.amount_minor, true);
        continue;
      }

      if (item.value_minor != null) {
        addCurrencyAmount(result, currency, item.value_minor, true);
        continue;
      }

      if (item.total_minor != null) {
        addCurrencyAmount(result, currency, item.total_minor, true);
        continue;
      }

      const value =
        item.amount ??
        item.value ??
        item.total ??
        item.balance ??
        item.available ??
        item.pending;

      addCurrencyAmount(result, currency, value, forceMinor);
    }

    return result;
  }

  // Variante 2:
  // { GBP: 12.34, USD: 5.67 }
  if (typeof source === 'object') {
    for (const [currency, rawValue] of Object.entries(source)) {
      const value = parseJsonMaybe(rawValue);

      if (value == null) continue;

      if (typeof value === 'number' || typeof value === 'string') {
        addCurrencyAmount(result, currency, value, forceMinor);
        continue;
      }

      if (typeof value === 'object') {
        if (value.amount_minor != null) {
          addCurrencyAmount(result, currency, value.amount_minor, true);
          continue;
        }

        if (value.value_minor != null) {
          addCurrencyAmount(result, currency, value.value_minor, true);
          continue;
        }

        if (value.total_minor != null) {
          addCurrencyAmount(result, currency, value.total_minor, true);
          continue;
        }

        const nestedCurrency =
          value.currency ??
          value.code ??
          value.reward_currency ??
          currency;

        const nestedValue =
          value.amount ??
          value.value ??
          value.total ??
          value.balance ??
          value.available ??
          value.pending;

        addCurrencyAmount(result, nestedCurrency, nestedValue, forceMinor);
      }
    }
  }

  return result;
}

function mergeCurrencyMap(target, source, forceMinor = false) {
  const extracted = extractCurrencyMap(source, forceMinor);

  for (const [currency, amount] of Object.entries(extracted)) {
    target[currency] = (target[currency] || 0) + amount;
  }
}

function extractProlificBalance(balance) {
  const availableByCurrency = {};
  const pendingByCurrency = {};

  balance = parseJsonMaybe(balance);

  if (!balance || typeof balance !== 'object') {
    return { availableByCurrency, pendingByCurrency };
  }

  mergeCurrencyMap(availableByCurrency, balance.approved_per_currency, true);

  const availableCandidates = [
    // Deine echte aktuelle Struktur
    // Weitere mögliche Strukturen
    balance.balance_by_currency,
    balance.available_balance_by_currency,
    balance.available_by_currency,
    balance.cashout_balance_by_currency,
    balance.cashout_by_currency,
    balance.current_balance_by_currency,

    balance.available_balance,
    balance.cashout_balance,
    balance.current_balance,
    balance.balance,
    balance.available,
    balance.cashout,
    balance.approved,
    balance.total
  ];

  for (const candidate of availableCandidates) {
    mergeCurrencyMap(availableByCurrency, candidate);
  }

  mergeCurrencyMap(pendingByCurrency, balance.pending_per_currency, true);

  const pendingCandidates = [
    // Deine echte aktuelle Struktur
    // Weitere mögliche Strukturen
    balance.pending_balance_by_currency,
    balance.pending_by_currency,
    balance.awaiting_review_by_currency,
    balance.awaiting_by_currency,

    balance.pending_balance,
    balance.pending,
    balance.awaiting_review,
    balance.awaiting
  ];

  for (const candidate of pendingCandidates) {
    mergeCurrencyMap(pendingByCurrency, candidate);
  }

  // Fallback für reine GBP-Werte
  if (balance.total_gbp != null && Object.keys(availableByCurrency).length === 0) {
    addCurrencyAmount(availableByCurrency, 'GBP', balance.total_gbp, true);
  }

  if (balance.total_pending_gbp != null && Object.keys(pendingByCurrency).length === 0) {
    addCurrencyAmount(pendingByCurrency, 'GBP', balance.total_pending_gbp, true);
  }

  return { availableByCurrency, pendingByCurrency };
}

// ---- API-Calls ----

async function fetchData(type) {
  const res = await fetch(`${API_BASE}?type=${encodeURIComponent(type)}`, {
    credentials: 'same-origin',
    cache: 'no-store'
  });

  if (res.status === 401) {
    window.location.href = '/';
    return null;
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

// ---- Sync-Indicator ----

function updateSyncIndicator(lastSyncAt) {
  const el = $('syncIndicator');

  if (!el) return;

  el.classList.remove('is-fresh', 'is-stale', 'is-old');

  if (!lastSyncAt) {
    el.classList.add('is-old');
    el.title = 'Prolific Watcher läuft nicht: noch kein Sync';
    el.setAttribute('aria-label', el.title);
    return;
  }

  const lastSyncDate = new Date(lastSyncAt);

  if (Number.isNaN(lastSyncDate.getTime())) {
    el.classList.add('is-old');
    el.title = 'Prolific Watcher läuft nicht: letzter Sync unbekannt';
    el.setAttribute('aria-label', el.title);
    return;
  }

  const ageMin = (new Date() - lastSyncDate) / 60000;

  if (ageMin <= WATCHER_ONLINE_MAX_AGE_MIN) {
    el.classList.add('is-fresh');
    el.title = 'Prolific Watcher läuft: letzter Sync ' + fmtTimeAgo(lastSyncAt);
  } else {
    el.classList.add('is-old');
    el.title = 'Prolific Watcher läuft nicht: letzter Sync ' + fmtTimeAgo(lastSyncAt);
  }

  el.setAttribute('aria-label', el.title);
}

// ---- Overview Helpers ----

function readGoalMinor(goals, period) {
  const keys = period === 'daily'
    ? ['daily_gbp_minor', 'dailyGoalGbpMinor', 'dailyGoalMinor', 'daily_minor', 'daily']
    : ['monthly_gbp_minor', 'monthlyGoalGbpMinor', 'monthlyGoalMinor', 'monthly_minor', 'monthly'];

  const value = firstDefined(goals, keys);

  if (value && typeof value === 'object') {
    return currencyMinor(value, 'GBP');
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

function readCurrencyMetric(source, mapKeys, gbpKeys = []) {
  const obj = asObject(source);
  let result = {};

  for (const key of mapKeys) {
    if (obj[key] == null) continue;

    result = extractCurrencyMap(obj[key], true);

    if (Object.keys(result).length > 0) return result;
  }

  const gbpMinor = firstNumber(obj, gbpKeys);

  if (gbpMinor != null) {
    result.GBP = gbpMinor;
  }

  return result;
}

function readTodayStats(data, today) {
  const todayStats = asObject(data.todayStats);
  const earned = readCurrencyMetric(
    todayStats,
    ['earned', 'earnedByCurrency', 'earned_by_currency'],
    ['earned_gbp_minor', 'earnedGbpMinor', 'earnedMinor']
  );
  const pending = readCurrencyMetric(
    todayStats,
    ['pending', 'pendingByCurrency', 'pending_by_currency'],
    ['pending_gbp_minor', 'pendingGbpMinor', 'pendingMinor']
  );

  const fallbackEarned = asObject(today.earned);
  const fallbackPending = asObject(today.pending);
  const finalEarned = Object.keys(earned).length ? earned : fallbackEarned;
  const finalPending = Object.keys(pending).length ? pending : fallbackPending;
  const count = firstNumber(todayStats, [
    'submission_count',
    'submissionCount',
    'submissions_count',
    'submissionsCount',
    'participations',
    'count'
  ]);
  const averageMap = readCurrencyMetric(
    asObject(todayStats.averageReward),
    ['byCurrency', 'by_currency', 'average', 'averageByCurrency', 'average_by_currency'],
    ['gbp_minor', 'gbpMinor', 'average_gbp_minor', 'averageGbpMinor']
  );
  const hourlyMap = readCurrencyMetric(
    asObject(todayStats.effectiveHourlyRate),
    ['byCurrency', 'by_currency', 'hourly', 'hourlyByCurrency', 'hourly_by_currency'],
    ['gbp_minor', 'gbpMinor', 'hourly_gbp_minor', 'hourlyGbpMinor']
  );
  const average = Object.keys(averageMap).length ? averageMap : firstNumber(todayStats, [
    'average_reward_gbp_minor',
    'averageRewardGbpMinor',
    'average_reward_minor',
    'averageRewardMinor',
    'avg_gbp_minor',
    'avgMinor'
  ]);
  const hourly = Object.keys(hourlyMap).length ? hourlyMap : firstNumber(todayStats, [
    'hourly_rate_gbp_minor',
    'hourlyRateGbpMinor',
    'effective_hourly_gbp_minor',
    'effectiveHourlyGbpMinor'
  ]);
  const earnedGbp = currencyMinor(finalEarned, 'GBP');
  const calculatedAverage =
    average != null ? average :
    count && earnedGbp != null ? Math.round(earnedGbp / count) :
    null;

  return {
    earned: finalEarned,
    pending: finalPending,
    count,
    average: calculatedAverage,
    hourly
  };
}

function readPendingStats(data, allTimePending, pendingByCurrency) {
  const pendingStats = asObject(data.pendingStats);
  const total = readCurrencyMetric(
    pendingStats,
    ['total', 'totalPending', 'total_pending', 'totalByCurrency', 'total_by_currency', 'byCurrency', 'by_currency'],
    ['total_pending_gbp_minor', 'totalPendingGbpMinor', 'total_pending_minor', 'totalPendingMinor']
  );
  const finalTotal =
    Object.keys(total).length ? total :
    hasCurrencyAmounts(allTimePending) ? asObject(allTimePending) :
    asObject(pendingByCurrency);

  return {
    count: firstNumber(pendingStats, [
      'count_pending',
      'countPending',
      'pending_count',
      'pendingCount',
      'count'
    ]),
    total: finalTotal,
    oldestAt: firstDefined(pendingStats, [
      'oldest_pending_completed_at',
      'oldestPendingCompletedAt',
      'oldest_completed_at',
      'oldestCompletedAt',
      'oldestPendingAt'
    ]),
    olderThan7: firstNumber(pendingStats, [
      'older_than_7_days',
      'olderThan7Days',
      'older7',
      'count_older_than_7_days',
      'countOlderThan7Days'
    ]),
    olderThan14: firstNumber(pendingStats, [
      'older_than_14_days',
      'olderThan14Days',
      'older14',
      'count_older_than_14_days',
      'countOlderThan14Days'
    ])
  };
}

function normalizeStatusCounts(statusStats, fallbackCounts) {
  const stats = asObject(statusStats);
  const candidate =
    firstDefined(stats, ['counts', 'byStatus', 'by_status', 'distribution', 'statuses']) ??
    (Object.keys(stats).length ? stats : fallbackCounts);
  const rawCounts = asObject(candidate);
  const counts = {};

  for (const [status, value] of Object.entries(rawCounts)) {
    if (/rate|total/i.test(status)) continue;

    const numeric = Number(value);

    if (!Number.isFinite(numeric)) continue;

    counts[status] = Math.round(numeric);
  }

  return counts;
}

function statusCount(counts, aliases) {
  for (const alias of aliases) {
    if (counts[alias] != null) return counts[alias];
  }

  return 0;
}

function readStatusRate(statusStats, keys, fallback) {
  const explicit = firstNumeric(statusStats, keys);

  if (explicit != null) return explicit;

  return fallback;
}

function renderStatusTag(status) {
  const normalized = String(status || '').toUpperCase();
  let className = 'tag tag-times';
  let inline = '';

  if (normalized === 'APPROVED') {
    className = 'tag tag-active';
  } else if (normalized === 'AWAITING REVIEW') {
    className = 'tag tag-expired';
  } else if (['RETURNED', 'SCREENED OUT', 'SCREENED-OUT'].includes(normalized)) {
    className = 'tag tag-inactive';
  } else if (normalized === 'REJECTED') {
    inline = ' style="background:var(--danger-bg);color:var(--danger);"';
  }

  return `<span class="${className}"${inline}>${escapeHtml(status)}</span>`;
}

function statusSortKey(status) {
  const order = ['APPROVED', 'AWAITING REVIEW', 'REJECTED', 'RETURNED', 'SCREENED OUT', 'SCREENED-OUT'];
  const index = order.indexOf(String(status || '').toUpperCase());

  return index === -1 ? order.length : index;
}

function inferMonthlyForecast(forecast, monthEarnedMinor, monthlyGoalMinor, serverTime) {
  const current = firstNumber(forecast, [
    'current_month_gbp_minor',
    'currentMonthGbpMinor',
    'currentMonthMinor',
    'current_gbp_minor',
    'currentMinor'
  ]) ?? monthEarnedMinor;
  let average = firstNumber(forecast, [
    'average_day_gbp_minor',
    'averagePerDayGbpMinor',
    'averagePerDayMinor',
    'daily_average_gbp_minor',
    'dailyAverageGbpMinor'
  ]);
  let projected = firstNumber(forecast, [
    'projected_month_gbp_minor',
    'projectedMonthGbpMinor',
    'projectedMonthMinor',
    'forecast_gbp_minor',
    'forecastGbpMinor',
    'forecastMinor'
  ]);
  let delta = firstNumber(forecast, [
    'target_delta_gbp_minor',
    'targetDeltaGbpMinor',
    'goal_delta_gbp_minor',
    'goalDeltaGbpMinor',
    'difference_to_goal_gbp_minor',
    'differenceToGoalGbpMinor'
  ]);
  let willReach = firstBoolean(forecast, [
    'will_reach_goal',
    'willReachGoal',
    'targetWillBeReached',
    'goalWillBeReached'
  ]);

  if ((average == null || projected == null || delta == null || willReach == null) && current != null) {
    const now = serverTime ? new Date(serverTime) : new Date();

    if (!Number.isNaN(now.getTime())) {
      const elapsedDays = Math.max(1, now.getDate());
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      if (average == null) {
        average = Math.round(current / elapsedDays);
      }

      if (projected == null) {
        projected = Math.round((current / elapsedDays) * daysInMonth);
      }
    }
  }

  if (delta == null && projected != null && monthlyGoalMinor != null) {
    delta = projected - monthlyGoalMinor;
  }

  if (willReach == null && delta != null) {
    willReach = delta >= 0;
  }

  return { current, average, projected, delta, willReach };
}

function fmtSignedAmount(minor, currency) {
  const numeric = Number(minor);

  if (!Number.isFinite(numeric)) return DASH;

  const sign = numeric > 0 ? '+' : numeric < 0 ? '-' : '';

  return sign + fmtAmount(Math.abs(Math.round(numeric)), currency);
}

function fmtMetricAmount(value, currency = 'GBP') {
  if (value && typeof value === 'object') {
    return fmtMulti(value);
  }

  return fmtAmount(value, currency);
}

function fmtMetricHourly(value, currency = 'GBP') {
  if (value && typeof value === 'object') {
    const formatted = fmtMulti(value);

    return formatted === DASH ? DASH : formatted + '/h';
  }

  return value == null ? DASH : fmtAmount(value, currency) + '/h';
}

function renderGoalCard(label, currentMinor, targetMinor) {
  const percent = progressPercent(currentMinor, targetMinor);
  const remaining =
    Number.isFinite(Number(currentMinor)) && Number.isFinite(Number(targetMinor))
      ? Math.max(0, Number(targetMinor) - Number(currentMinor))
      : null;

  return `
    <div class="status-box">
      <h3>${label}</h3>
      <div class="status-row">
        <span class="key">Fortschritt</span>
        <span class="value">${fmtAmount(currentMinor, 'GBP')} von ${fmtAmount(targetMinor, 'GBP')}</span>
      </div>
      ${renderProgressBar(percent)}
      <div class="status-row">
        <span class="key">Erreicht</span>
        <span class="value">${fmtPercent(percent)}</span>
      </div>
      <div class="status-row">
        <span class="key">Noch offen</span>
        <span class="value">${fmtAmount(remaining, 'GBP')}</span>
      </div>
    </div>
  `;
}

// ---- Renderer: Übersicht ----

function renderExpandedOverview(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  const e = data.earnings || {};
  const today = e.today || {};
  const week = e.week || {};
  const month = e.month || {};
  const lastMonth = e.lastMonth || {};
  const allTime = e.allTime || {};
  const goals = asObject(data.goals);
  const dailyGoalMinor = readGoalMinor(goals, 'daily');
  const monthlyGoalMinor = readGoalMinor(goals, 'monthly');
  const todayEarnedGbp = currencyMinor(today.earned, 'GBP');
  const monthEarnedGbp = currencyMinor(month.earned, 'GBP');
  const balance = asObject(data.balance);
  const { availableByCurrency, pendingByCurrency } = extractProlificBalance(balance);
  const todayStats = readTodayStats(data, today);
  const pendingStats = readPendingStats(data, allTime.pending, pendingByCurrency);
  const statusCounts = normalizeStatusCounts(data.statusStats, data.submissionCounts);
  const statusTotal = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);
  const approvedCount = statusCount(statusCounts, ['APPROVED']);
  const rejectedCount = statusCount(statusCounts, ['REJECTED']);
  const pendingCount = statusCount(statusCounts, ['AWAITING REVIEW']);
  const statusStats = asObject(data.statusStats);
  const approvalRate = readStatusRate(
    statusStats,
    ['approval_rate', 'approvalRate', 'approved_rate', 'approvedRate'],
    statusTotal > 0 ? (approvedCount / statusTotal) * 100 : null
  );
  const rejectionRate = readStatusRate(
    statusStats,
    ['rejection_rate', 'rejectionRate', 'reject_rate', 'rejectRate'],
    statusTotal > 0 ? (rejectedCount / statusTotal) * 100 : null
  );
  const pendingRate = readStatusRate(
    statusStats,
    ['pending_rate', 'pendingRate'],
    statusTotal > 0 ? (pendingCount / statusTotal) * 100 : null
  );
  const forecast = inferMonthlyForecast(
    asObject(data.forecast),
    monthEarnedGbp,
    monthlyGoalMinor,
    data.serverTime
  );

  const tile = (label, earned, pending) => `
    <div class="earning-tile">
      <div class="label">${label}</div>
      <div class="value">${fmtMulti(earned)}</div>
      ${
        pending && Object.keys(pending).length > 0
          ? `<div class="pending">+ ${fmtMulti(pending)} ausstehend</div>`
          : ''
      }
    </div>
  `;

  let html = '<div class="earnings-grid">';

  html += tile('Heute', today.earned, today.pending);
  html += tile('Diese Woche', week.earned, week.pending);
  html += tile('Dieser Monat', month.earned, month.pending);
  html += tile('Gesamt', allTime.earned, allTime.pending);
  html += tile('Auszahlbar', availableByCurrency);
  html += tile('In Prüfung', pendingByCurrency);
  html += '</div>';

  if (Object.keys(lastMonth.earned || {}).length) {
    html += `
      <div class="status-box">
        <h3>Vergleich</h3>
        <div class="status-row">
          <span class="key">Vormonat</span>
          <span class="value">${fmtMulti(lastMonth.earned)}</span>
        </div>
      </div>
    `;
  }

  html += renderGoalCard('Tagesziel', todayEarnedGbp, dailyGoalMinor);
  html += renderGoalCard('Monatsziel', monthEarnedGbp, monthlyGoalMinor);

  html += `
    <div class="status-box">
      <h3>Monatsprognose</h3>

      <div class="status-row">
        <span class="key">Aktuell</span>
        <span class="value">${fmtAmount(forecast.current, 'GBP')}</span>
      </div>

      <div class="status-row">
        <span class="key">Ø pro Tag</span>
        <span class="value">${fmtAmount(forecast.average, 'GBP')}</span>
      </div>

      <div class="status-row">
        <span class="key">Prognose Monatsende</span>
        <span class="value">${fmtAmount(forecast.projected, 'GBP')}</span>
      </div>

      <div class="status-row">
        <span class="key">Abweichung zum Ziel</span>
        <span class="value">${fmtSignedAmount(forecast.delta, 'GBP')}</span>
      </div>

      <div class="status-row">
        <span class="key">Einschätzung</span>
        <span class="value">${
          forecast.willReach == null
            ? DASH
            : forecast.willReach
              ? 'Ziel wird voraussichtlich erreicht'
              : 'Ziel wird voraussichtlich verfehlt'
        }</span>
      </div>
    </div>
  `;

  html += `
    <div class="status-box">
      <h3>Heute</h3>

      <div class="status-row">
        <span class="key">Verdient</span>
        <span class="value">${fmtMulti(todayStats.earned)}</span>
      </div>

      <div class="status-row">
        <span class="key">Ausstehend</span>
        <span class="value">${fmtMulti(todayStats.pending)}</span>
      </div>

      <div class="status-row">
        <span class="key">Teilnahmen</span>
        <span class="value">${fmtCount(todayStats.count)}</span>
      </div>

      <div class="status-row">
        <span class="key">Ø pro Teilnahme</span>
        <span class="value">${fmtMetricAmount(todayStats.average, 'GBP')}</span>
      </div>

      <div class="status-row">
        <span class="key">Effektiver Stundenlohn</span>
        <span class="value">${fmtMetricHourly(todayStats.hourly, 'GBP')}</span>
      </div>
    </div>
  `;

  html += `
    <div class="status-box">
      <h3>Pending-Übersicht</h3>

      <div class="status-row">
        <span class="key">Offene Teilnahmen</span>
        <span class="value">${fmtCount(pendingStats.count ?? (statusTotal > 0 ? pendingCount : null))}</span>
      </div>

      <div class="status-row">
        <span class="key">Gesamt pending</span>
        <span class="value">${fmtMulti(pendingStats.total)}</span>
      </div>

      <div class="status-row">
        <span class="key">Älteste offene Teilnahme</span>
        <span class="value">${pendingStats.oldestAt ? fmtTimeAgo(pendingStats.oldestAt) : DASH}</span>
      </div>

      <div class="status-row">
        <span class="key">Älter als 7 Tage</span>
        <span class="value">${fmtCount(pendingStats.olderThan7)}</span>
      </div>

      <div class="status-row">
        <span class="key">Älter als 14 Tage</span>
        <span class="value">${fmtCount(pendingStats.olderThan14)}</span>
      </div>
    </div>
  `;

  const statusRows = Object.entries(statusCounts)
    .sort(([a], [b]) => {
      const ai = statusSortKey(a);
      const bi = statusSortKey(b);

      if (ai !== bi) return ai - bi;

      return a.localeCompare(b);
    })
    .map(([status, count]) => `
      <div class="status-row">
        <span class="key">${renderStatusTag(status)}</span>
        <span class="value">${fmtCount(count)}</span>
      </div>
    `)
    .join('');

  html += `
    <div class="status-box">
      <h3>Status-Verteilung</h3>

      ${statusRows || `
        <div class="status-row">
          <span class="key">Status</span>
          <span class="value">${DASH}</span>
        </div>
      `}

      <div class="status-row">
        <span class="key">Approval-Rate</span>
        <span class="value">${fmtPercent(approvalRate)}</span>
      </div>

      <div class="status-row">
        <span class="key">Reject-Rate</span>
        <span class="value">${fmtPercent(rejectionRate)}</span>
      </div>

      <div class="status-row">
        <span class="key">Pending-Rate</span>
        <span class="value">${fmtPercent(pendingRate)}</span>
      </div>
    </div>
  `;

  html += `
    <div class="status-box">
      <h3>System-Status</h3>

      <div class="status-row">
        <span class="key">Aktive Studien</span>
        <span class="value">${data.activeCount ?? DASH}</span>
      </div>

      <div class="status-row">
        <span class="key">Letzter Sync</span>
        <span class="value">${data.lastSyncAt ? fmtTimeAgo(data.lastSyncAt) : DASH}</span>
      </div>
  `;

  if (data.submissionCounts) {
    const sc = data.submissionCounts;
    const total = Object.values(sc).reduce((a, b) => Number(a) + Number(b), 0);

    html += `
      <div class="status-row">
        <span class="key">Teilnahmen gesamt</span>
        <span class="value">${fmtCount(total)}</span>
      </div>
    `;
  }

  html += '</div>';

  return html;
}

function renderOverview(data) {
  return renderExpandedOverview(data);
}

// ---- Renderer: Studien ----

function renderStudies(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  let studies = data.studies || [];

  const filterEl = $('studiesFilter');
  const sortEl = $('studiesSort');

  const filter = filterEl ? filterEl.value : 'all';

  if (filter === 'active') {
    studies = studies.filter(s => s.is_active == 1);
  }

  if (filter === 'expired') {
    studies = studies.filter(s => s.expired == 1);
  }

  const sort = sortEl ? sortEl.value : 'firstSeenDesc';

  studies.sort((a, b) => {
    if (sort === 'firstSeenAsc') {
      return new Date(a.first_seen || 0) - new Date(b.first_seen || 0);
    }

    if (sort === 'rewardDesc') {
      return (b.reward_minor || 0) - (a.reward_minor || 0);
    }

    return new Date(b.first_seen || 0) - new Date(a.first_seen || 0);
  });

  if (studies.length === 0) {
    return '<div class="loading">Keine Studien.</div>';
  }

  return studies.map(s => {
    const tags = [];

    if (s.is_active == 1) {
      tags.push('<span class="tag tag-active">Aktiv</span>');
    } else if (s.expired == 1) {
      tags.push('<span class="tag tag-expired">⏱ Voll/Abgelaufen</span>');
    } else {
      tags.push('<span class="tag tag-inactive">Beendet</span>');
    }

    if ((s.times_notified || 0) > 1) {
      tags.push(`<span class="tag tag-times">${escapeHtml(s.times_notified)}× gesehen</span>`);
    }

    const meta = [];

    if (s.reward_minor != null) {
      meta.push(`<span class="reward">${fmtAmount(s.reward_minor, s.reward_currency)}</span>`);
    }

    if (s.estimated_minutes != null) {
      meta.push(`${escapeHtml(s.estimated_minutes)} Min`);
    }

    if (s.total_places != null) {
      meta.push(`${escapeHtml(s.total_places)} Plätze`);
    }

    if (s.reward_per_hour != null) {
      meta.push(`${fmtAmount(s.reward_per_hour, s.reward_currency)}/h`);
    }

    return `
      <div class="study-card">
        <a class="open-link"
           href="https://app.prolific.com/studies/${encodeURIComponent(s.id || '')}"
           target="_blank"
           rel="noopener"
           title="Auf Prolific öffnen">↗</a>

        <div class="name">${escapeHtml(s.name || '(ohne Namen)')}</div>
        <div class="meta">${meta.join(' · ')}</div>
        <div class="study-time">🕒 ${fmtTimestamp(s.first_seen)}</div>
        <div class="tags">${tags.join('')}</div>
      </div>
    `;
  }).join('');
}

// ---- Renderer: Submissions ----

function renderSubmissions(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  const subs = data.submissions || [];

  if (subs.length === 0) {
    return '<div class="loading">Keine Teilnahmen.</div>';
  }

  return subs.map(s => {
    const statusKey = (s.status || '')
      .replace(/[\s-]/g, '')
      .substring(0, 8)
      .toUpperCase();

    const statusClass = 'status-' + statusKey;
    const minutes = s.time_taken_seconds ? Math.round(s.time_taken_seconds / 60) : null;

    return `
      <div class="submission-card">
        <div class="name">${escapeHtml(s.study_name || '(ohne Namen)')}</div>

        <div class="meta">
          <span class="status ${escapeHtml(statusClass)}">${escapeHtml(s.status || '?')}</span>
          · <span class="reward">${fmtAmount(s.reward_amount_minor, s.reward_currency)}</span>
          ${minutes ? ` · ${escapeHtml(minutes)} Min` : ''}
        </div>

        <div class="study-time">
          ${s.started_at ? '🕒 Start: ' + fmtDateTime(s.started_at) : ''}
          ${s.completed_at ? ' · Ende: ' + fmtDateTime(s.completed_at) : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ---- Renderer: Events ----

function renderEvents(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  const events = data.events || [];

  if (events.length === 0) {
    return '<div class="loading">Keine Ereignisse.</div>';
  }

  return events.map(e => `
    <div class="event-card">
      <div>
        <div class="type">${escapeHtml(e.type)}</div>
        <div class="message">${escapeHtml(e.message || '')}</div>
      </div>

      <time>${fmtTimestamp(e.timestamp)}</time>
    </div>
  `).join('');
}

// ---- Tab-Logic ----

async function loadTab(tab) {
  const panel = $(`panel-${tab}`);

  if (!panel) return;

  const container = panel.querySelector(`#${tab}Content`);

  if (!container) return;

  try {
    const data = await fetchData(tab);

    if (!data) return;

    cachedData[tab] = data;

    let html = '';

    if (tab === 'overview') {
      html = renderOverview(data);
      updateSyncIndicator(data.lastSyncAt);
    } else if (tab === 'studies') {
      html = renderStudies(data);
    } else if (tab === 'submissions') {
      html = renderSubmissions(data);
    } else if (tab === 'events') {
      html = renderEvents(data);
    }

    container.innerHTML = html;
    container.classList.remove('loading');
  } catch (e) {
    container.innerHTML = `<div class="error">Fehler beim Laden: ${escapeHtml(e.message)}</div>`;
    container.classList.remove('loading');
  }
}

function activateTab(tab) {
  document.querySelectorAll('.tab').forEach(button => {
    button.classList.toggle('is-active', button.dataset.tab === tab);
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('is-active', panel.id === `panel-${tab}`);
  });

  loadTab(tab);
}

// ---- Init ----

document.querySelectorAll('.tab').forEach(button => {
  button.addEventListener('click', () => {
    activateTab(button.dataset.tab);
  });
});

const refreshBtn = $('refreshBtn');

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    const active = document.querySelector('.tab.is-active');

    if (active) {
      loadTab(active.dataset.tab);
    }
  });
}

['studiesSort', 'studiesFilter'].forEach(id => {
  const el = $(id);

  if (!el) return;

  el.addEventListener('change', () => {
    if (cachedData.studies) {
      const studiesContent = $('studiesContent');

      if (studiesContent) {
        studiesContent.innerHTML = renderStudies(cachedData.studies);
      }
    }
  });
});

activateTab('overview');

setInterval(() => {
  const active = document.querySelector('.tab.is-active');

  if (active) {
    loadTab(active.dataset.tab);
  }
}, 60000);
