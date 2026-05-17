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
  stats: null,
  account: null,
  system: null,
  settings: null,
  events: null
};

// ---- Helpers ----

function $(id) {
  return document.getElementById(id);
}

function fmtAmount(minor, currency) {
  if (minor == null) return DASH;

  const safeCurrency = String(currency || '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 12);
  const sym =
    currency === 'USD' ? '$' :
    currency === 'EUR' ? '€' :
    currency === 'GBP' ? '£' :
    (safeCurrency || 'CUR') + ' ';

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

function fmtEur(minor) {
  const numeric = Number(minor);

  if (!Number.isFinite(numeric)) return '';

  return '≈ €' + (numeric / 100).toFixed(2).replace('.', ',');
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

function positiveCurrencyEntries(byCurrency) {
  return Object.entries(asObject(byCurrency))
    .map(([currency, value]) => [String(currency).toUpperCase(), Number(value)])
    .filter(([, value]) => Number.isFinite(value) && value > 0);
}

function readFxRates(fxRates) {
  const parsed = asObject(fxRates);
  const rates = asObject(parsed.rates || parsed);
  const base = String(parsed.base || 'GBP').toUpperCase();

  return { base, rates };
}

function fxRateFor(rates, currency) {
  const cur = String(currency || '').toUpperCase();
  const direct = rates[cur] ?? rates[cur.toLowerCase()];
  const numeric = Number(direct);

  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function convertToEur(byCurrency, fxRates) {
  const entries = positiveCurrencyEntries(byCurrency);

  if (entries.length === 0) return null;

  const fx = readFxRates(fxRates);
  const eurRate = fxRateFor(fx.rates, 'EUR');

  if (fx.base !== 'GBP' || !eurRate) {
    const onlyEur = entries.every(([currency]) => currency === 'EUR');

    if (!onlyEur) return null;
  }

  let eurMinor = 0;

  for (const [currency, minor] of entries) {
    if (currency === 'EUR') {
      eurMinor += Math.round(minor);
      continue;
    }

    if (currency === 'GBP') {
      if (!eurRate) return null;

      eurMinor += Math.round(minor * eurRate);
      continue;
    }

    const currencyRate = fxRateFor(fx.rates, currency);

    if (!currencyRate || !eurRate) return null;

    const gbpMinor = minor / currencyRate;
    eurMinor += Math.round(gbpMinor * eurRate);
  }

  return eurMinor > 0 ? eurMinor : null;
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

function fmtMonthLabel(value) {
  if (!value) return DASH;

  const raw = String(value).trim();
  const monthMatch = raw.match(/^(\d{4})-(\d{2})$/);

  if (monthMatch) {
    const month = Number(monthMatch[2]);

    if (month >= 1 && month <= 12) {
      const date = new Date(Number(monthMatch[1]), month - 1, 1);
      return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    }
  }

  const date = new Date(raw);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }

  return raw || DASH;
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

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(payload)
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

function readEfficiencyPeriod(source) {
  const period = asObject(source);
  const byCurrency = readCurrencyMetric(
    period,
    ['byCurrency', 'by_currency', 'hourly', 'hourlyByCurrency', 'hourly_by_currency'],
    ['gbp_minor', 'gbpMinor', 'hourly_gbp_minor', 'hourlyGbpMinor']
  );

  return {
    byCurrency,
    sampleCount: firstNumber(period, ['sampleCount', 'sample_count', 'count', 'samples']),
    secondsTotal: firstNumber(period, ['secondsTotal', 'seconds_total', 'timeTakenSeconds', 'time_taken_seconds'])
  };
}

function readEfficiencyStats(data) {
  const efficiency = asObject(data.efficiency);

  return {
    today: readEfficiencyPeriod(efficiency.today),
    week: readEfficiencyPeriod(efficiency.week),
    month: readEfficiencyPeriod(efficiency.month),
    allTime: readEfficiencyPeriod(efficiency.allTime || efficiency.all_time || efficiency.total)
  };
}

function normalizeTopStudy(itemRaw) {
  const item = asObject(itemRaw);

  return {
    studyId: firstDefined(item, ['studyId', 'study_id', 'id']),
    name: firstDefined(item, ['name', 'studyName', 'study_name', 'title']) || '(ohne Namen)',
    status: firstDefined(item, ['status', 'submissionStatus', 'submission_status']),
    rewardMinor: firstNumber(item, ['rewardMinor', 'reward_minor', 'rewardAmountMinor', 'reward_amount_minor']),
    rewardCurrency: firstDefined(item, ['rewardCurrency', 'reward_currency', 'currency']) || 'GBP',
    timeTakenSeconds: firstNumber(item, ['timeTakenSeconds', 'time_taken_seconds', 'seconds']),
    hourlyRateMinor: firstNumber(item, ['hourlyRateMinor', 'hourly_rate_minor', 'rewardPerHourMinor', 'reward_per_hour_minor']),
    completedAt: firstDefined(item, ['completedAt', 'completed_at', 'finishedAt', 'finished_at'])
  };
}

function normalizeTopStudyList(value) {
  const list = parseJsonMaybe(value);

  if (!Array.isArray(list)) return [];

  return list.map(normalizeTopStudy);
}

function readTopStudies(data) {
  const topStudies = asObject(data.topStudies);

  return {
    byReward: normalizeTopStudyList(firstDefined(topStudies, ['byReward', 'by_reward', 'reward'])),
    byHourly: normalizeTopStudyList(firstDefined(topStudies, ['byHourly', 'by_hourly', 'hourly']))
  };
}

function readDailyStats(data) {
  const raw = parseJsonMaybe(data.dailyStats || data.daily_stats || data.daily);

  if (!Array.isArray(raw)) return [];

  return raw
    .map(itemRaw => {
      const item = asObject(itemRaw);

      return {
        date: firstDefined(item, ['date', 'day']),
        earned: readCurrencyMetric(item, ['earned', 'earnedByCurrency', 'earned_by_currency'], ['earned_gbp_minor', 'earnedGbpMinor']),
        pending: readCurrencyMetric(item, ['pending', 'pendingByCurrency', 'pending_by_currency'], ['pending_gbp_minor', 'pendingGbpMinor'])
      };
    })
    .filter(item => item.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-30);
}

function readSystemHealth(data) {
  const system = asObject(data.system);
  const lastSyncLog = asObject(system.lastSyncLog || system.last_sync_log);
  const submissionCounts = asObject(data.submissionCounts);
  const submissionTotal = Object.values(submissionCounts).reduce((sum, value) => {
    const numeric = Number(value);

    return Number.isFinite(numeric) ? sum + numeric : sum;
  }, 0);
  const rawError =
    firstDefined(system, ['lastError', 'last_error', 'error']) ||
    firstDefined(lastSyncLog, ['error', 'lastError', 'last_error', 'message']);
  const errorObject = asObject(rawError);

  return {
    api: firstDefined(system, ['api', 'status']) || (data.ok ? 'ok' : null),
    lastSyncAt: firstDefined(system, ['lastSyncAt', 'last_sync_at']) || data.lastSyncAt,
    lastSyncLog: lastSyncLog,
    lastError: firstDefined(errorObject, ['message', 'error', 'detail']) || rawError,
    dbCounts: asObject(system.dbCounts || system.db_counts),
    activeCount: firstNumber(data, ['activeCount', 'active_count']),
    submissionTotal: submissionTotal > 0 ? submissionTotal : null,
    serverTime: firstDefined(system, ['serverTime', 'server_time']) || data.serverTime
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

function fmtDuration(seconds) {
  const numeric = Number(seconds);

  if (!Number.isFinite(numeric) || numeric <= 0) return DASH;

  const minutes = Math.round(numeric / 60);

  if (minutes < 60) return minutes + ' Min';

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours} Std ${rest} Min` : `${hours} Std`;
}

function totalPositiveMinor(byCurrency) {
  return positiveCurrencyEntries(byCurrency)
    .reduce((sum, [, value]) => sum + value, 0);
}

function chartValueMinor(byCurrency, fxRates) {
  return convertToEur(byCurrency, fxRates) ?? currencyMinor(byCurrency, 'GBP') ?? totalPositiveMinor(byCurrency);
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

function renderEfficiencyCard(efficiency) {
  const periods = [
    ['Heute', efficiency.today],
    ['Woche', efficiency.week],
    ['Monat', efficiency.month],
    ['Gesamt', efficiency.allTime]
  ];

  const rows = periods.map(([label, period]) => `
    <div class="status-row">
      <span class="key">${label}</span>
      <span class="value">${fmtMetricHourly(period.byCurrency, 'GBP')}</span>
    </div>
    <div class="status-row">
      <span class="key">Basis</span>
      <span class="value">${fmtCount(period.sampleCount)} Samples &middot; ${fmtDuration(period.secondsTotal)}</span>
    </div>
  `).join('');

  return `
    <div class="status-box">
      <h3>Effizienz / Stundenlohn</h3>
      ${rows}
    </div>
  `;
}

function renderTopStudyList(items, mode) {
  const list = items.slice(0, 5);

  if (list.length === 0) {
    return '<div class="loading">Keine Daten.</div>';
  }

  const rows = list.map((study, index) => {
    const reward = fmtAmount(study.rewardMinor, study.rewardCurrency);
    const hourly = study.hourlyRateMinor == null
      ? DASH
      : fmtAmount(study.hourlyRateMinor, study.rewardCurrency) + '/h';
    const primary = mode === 'hourly' ? hourly : reward;
    const secondary = mode === 'hourly' ? reward : hourly;
    const url = study.studyId
      ? `https://app.prolific.com/studies/${encodeURIComponent(study.studyId)}`
      : null;

    return `
      <li class="top-study-item">
        <div class="top-study-name">
          ${index + 1}. ${
            url
              ? `<a href="${url}" target="_blank" rel="noopener">${escapeHtml(study.name)}</a>`
              : escapeHtml(study.name)
          }
        </div>
        <div class="top-study-meta">
          <span>${primary}</span>
          <span>${secondary}</span>
          <span>${fmtDuration(study.timeTakenSeconds)}</span>
          <span>${study.completedAt ? fmtTimestamp(study.completedAt) : DASH}</span>
          ${study.status ? renderStatusTag(study.status) : ''}
        </div>
      </li>
    `;
  }).join('');

  return `<ul class="top-study-list">${rows}</ul>`;
}

function renderTopStudiesCard(topStudies) {
  return `
    <div class="status-box">
      <h3>Top-Studien</h3>
      <div class="status-row">
        <span class="key">Top nach Verg&uuml;tung</span>
        <span class="value"></span>
      </div>
      ${renderTopStudyList(topStudies.byReward, 'reward')}
      <div class="status-row">
        <span class="key">Top nach Stundenlohn</span>
        <span class="value"></span>
      </div>
      ${renderTopStudyList(topStudies.byHourly, 'hourly')}
    </div>
  `;
}

function renderDailyStatsCard(dailyStats, fxRates) {
  if (dailyStats.length === 0) {
    return `
      <div class="status-box">
        <h3>Einnahmen-Verlauf</h3>
        <div class="loading">Keine Tagesdaten.</div>
      </div>
    `;
  }

  const maxValue = Math.max(...dailyStats.map(day => chartValueMinor(day.earned, fxRates)), 0);
  const bars = dailyStats.map(day => {
    const value = chartValueMinor(day.earned, fxRates);
    const width = maxValue > 0 ? Math.max(2, (value / maxValue) * 100) : 0;
    const labelDate = new Date(day.date);
    const label = Number.isNaN(labelDate.getTime())
      ? String(day.date).slice(5)
      : labelDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const title = `${day.date}: verdient ${fmtMulti(day.earned)}, pending ${fmtMulti(day.pending)}`;

    return `
      <div class="daily-bar" title="${escapeHtml(title)}">
        <div class="daily-bar-label">${escapeHtml(label)}</div>
        <div class="daily-bar-fill" style="width:${width.toFixed(2)}%;"></div>
        <div class="daily-bar-value">${fmtMulti(day.earned)}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="status-box">
      <h3>Einnahmen-Verlauf</h3>
      <div class="daily-chart">${bars}</div>
    </div>
  `;
}

function renderSystemHealthCard(systemHealth) {
  const dbCounts = asObject(systemHealth.dbCounts);
  const countRows = ['studies', 'submissions', 'events', 'syncLog'].map(key => `
    <div class="health-item">
      <span>${escapeHtml(key)}</span>
      <span>${fmtCount(dbCounts[key])}</span>
    </div>
  `).join('');

  return `
    <div class="status-box">
      <h3>System-Health</h3>
      <div class="health-grid">
        <div class="health-item">
          <span>API</span>
          <span>${escapeHtml(String(systemHealth.api || DASH).toUpperCase())}</span>
        </div>
        <div class="health-item">
          <span>Letzter Sync</span>
          <span>${systemHealth.lastSyncAt ? fmtTimeAgo(systemHealth.lastSyncAt) : DASH}</span>
        </div>
        ${
          systemHealth.activeCount != null
            ? `<div class="health-item">
                <span>Aktive Studien</span>
                <span>${fmtCount(systemHealth.activeCount)}</span>
              </div>`
            : ''
        }
        ${
          systemHealth.submissionTotal != null
            ? `<div class="health-item">
                <span>Teilnahmen gesamt</span>
                <span>${fmtCount(systemHealth.submissionTotal)}</span>
              </div>`
            : ''
        }
        <div class="health-item">
          <span>Letzter Fehler</span>
          <span>${systemHealth.lastError ? escapeHtml(systemHealth.lastError) : 'keiner'}</span>
        </div>
        ${countRows}
        <div class="health-item">
          <span>Serverzeit</span>
          <span>${fmtDateTime(systemHealth.serverTime)}</span>
        </div>
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
  const efficiencyStats = readEfficiencyStats(data);
  const topStudies = readTopStudies(data);
  const dailyStats = readDailyStats(data);
  const systemHealth = readSystemHealth(data);
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
  const fxRates = data.fxRates || data.fx_rates;

  const tile = (label, earned, pending, subline) => `
    <div class="earning-tile">
      <div class="label">${label}</div>
      <div class="value">${fmtMulti(earned)}</div>
      ${
        pending && Object.keys(pending).length > 0
          ? `<div class="pending">+ ${fmtMulti(pending)} ausstehend</div>`
          : ''
      }
      ${subline ? `<div class="pending">${escapeHtml(subline)}</div>` : ''}
    </div>
  `;

  let html = '<div class="earnings-grid">';

  html += tile('Heute', today.earned, today.pending);
  html += tile('Diese Woche', week.earned, week.pending);
  html += tile('Dieser Monat', month.earned, month.pending);
  html += tile('Gesamt', allTime.earned, allTime.pending);
  html += tile('Auszahlbar', availableByCurrency, null, fmtEur(convertToEur(availableByCurrency, fxRates)));
  html += tile('In Prüfung', pendingByCurrency, null, fmtEur(convertToEur(pendingByCurrency, fxRates)));
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

  html += renderEfficiencyCard(efficiencyStats);
  html += renderTopStudiesCard(topStudies);
  html += renderDailyStatsCard(dailyStats, fxRates);
  html += renderSystemHealthCard(systemHealth);

  return html;
}

function renderOverview(data) {
  return renderExpandedOverview(data);
}

// ---- Renderer: Roadmap-Rest ----

function amountWithEur(byCurrency, fxRates) {
  const eur = convertToEur(byCurrency, fxRates);
  const suffix = eur == null ? '' : ` <span class="secondary">${fmtEur(eur)}</span>`;

  return `${fmtMulti(byCurrency)}${suffix}`;
}

function normalizeHeatmap(data) {
  const raw = parseJsonMaybe(data.heatmap || data.daily || data.dailyStats || []);

  if (!Array.isArray(raw)) return [];

  return raw
    .map(itemRaw => {
      const item = asObject(itemRaw);

      return {
        date: firstDefined(item, ['date', 'day']),
        earned: readCurrencyMetric(item, ['earned', 'earnedByCurrency', 'earned_by_currency'], ['earned_gbp_minor', 'earnedGbpMinor']),
        pending: readCurrencyMetric(item, ['pending', 'pendingByCurrency', 'pending_by_currency'], ['pending_gbp_minor', 'pendingGbpMinor'])
      };
    })
    .filter(item => item.date);
}

function parseDateKey(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

function monthReferenceDate(days, serverTime) {
  const serverDate = serverTime ? new Date(serverTime) : null;

  if (serverDate && !Number.isNaN(serverDate.getTime())) {
    return new Date(serverDate.getFullYear(), serverDate.getMonth(), serverDate.getDate());
  }

  const datedDays = days
    .map(day => parseDateKey(day.date))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());

  return datedDays[0] || new Date();
}

function buildMonthHeatmapDays(days, serverTime) {
  const reference = monthReferenceDate(days, serverTime);
  const today = monthReferenceDate([], serverTime);
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDate = new Map();

  days.forEach(day => {
    if (day.date) byDate.set(String(day.date).slice(0, 10), day);
  });

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1);
    const key = dateKey(date);
    const existing = byDate.get(key) || {};

    return {
      date: key,
      earned: asObject(existing.earned),
      pending: asObject(existing.pending),
      isFuture: date > today
    };
  });
}

function renderHeatmap(days, fxRates, serverTime) {
  if (!days.length && !serverTime) {
    return '<div class="loading">Keine Heatmap-Daten.</div>';
  }

  const monthDays = buildMonthHeatmapDays(days, serverTime);
  const maxValue = Math.max(...monthDays.map(day => chartValueMinor(day.earned, fxRates)), 0);

  return `
    <div class="heatmap">
      <div class="heatmap-grid">
      ${monthDays.map(day => {
        const value = chartValueMinor(day.earned, fxRates);
        const level = maxValue > 0 ? Math.min(4, Math.ceil((value / maxValue) * 4)) : 0;
        const date = parseDateKey(day.date);
        const label = date
          ? date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
          : String(day.date).slice(-2);
        const title = `${day.date}: ${fmtMulti(day.earned)}`;
        const empty = !hasCurrencyAmounts(day.earned);
        const classes = [
          'heatmap-day',
          `level-${level}`,
          empty ? 'is-empty' : '',
          day.isFuture ? 'is-future' : ''
        ].filter(Boolean).join(' ');

        return `
          <div class="${classes}" title="${escapeHtml(title)}">
            <span class="heatmap-date">${escapeHtml(label)}</span>
            <span class="heatmap-value">${day.isFuture ? '–' : fmtMulti(day.earned)}</span>
          </div>
        `;
      }).join('')}
      </div>
    </div>
  `;
}

function renderStats(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  const fxRates = data.fxRates || data.fx_rates;
  const comparison = asObject(data.monthlyComparison || data.monthly_comparison);
  const current = asObject(comparison.current);
  const previous = asObject(comparison.previous);
  const delta = asObject(comparison.delta);
  const requesters = parseJsonMaybe(data.requesterStats || data.requester_stats) || [];
  const report = asObject(data.monthlyReport || data.monthly_report);
  const reportMonth = firstDefined(report, ['month', 'label']);
  const reportHourly = asObject(report.hourlyRate || report.hourly_rate);
  const reportStatusCounts = normalizeStatusCounts(report.statusCounts || report.status_counts, {});

  const requesterRows = Array.isArray(requesters) && requesters.length
    ? requesters.slice(0, 10).map(itemRaw => {
        const item = asObject(itemRaw);
        const name = firstDefined(item, ['requester', 'requesterName', 'requester_name', 'name']) || DASH;
        const total = readCurrencyMetric(item, ['totalReward', 'total_reward', 'earned', 'reward'], ['total_reward_gbp_minor', 'totalRewardGbpMinor']);
        const hourly = readCurrencyMetric(item, ['averageHourlyRate', 'average_hourly_rate', 'hourlyRate', 'hourly_rate'], ['average_hourly_gbp_minor', 'averageHourlyGbpMinor']);
        const count = firstNumber(item, ['submissionsCount', 'submissions_count', 'count']);
        const approvalRate = firstNumeric(item, ['approvalRate', 'approval_rate']);

        return `
          <div class="requester-row">
            <span class="requester-name">${escapeHtml(name)}</span>
            <span class="requester-number" data-label="Anzahl">${fmtCount(count)}</span>
            <span class="requester-number" data-label="Verdienst">${fmtMulti(total)}</span>
            <span class="requester-number" data-label="Stundenlohn">${fmtMetricHourly(hourly, 'GBP')}</span>
            <span class="requester-number" data-label="Approval-Rate">${fmtPercent(approvalRate)}</span>
          </div>
        `;
      }).join('')
    : '<div class="loading">Keine Requester-Daten.</div>';

  const statusRows = Object.entries(reportStatusCounts)
    .map(([status, count]) => `
      <div class="status-row">
        <span class="key">${renderStatusTag(status)}</span>
        <span class="value">${fmtCount(count)}</span>
      </div>
    `)
    .join('');

  return `
    <div class="status-box">
      <h3>Kalender-Heatmap</h3>
      ${renderHeatmap(normalizeHeatmap(data), fxRates, data.serverTime || data.server_time)}
    </div>

    <div class="status-box">
      <h3>Monatsvergleich</h3>
      <div class="status-row">
        <span class="key">Dieser Monat</span>
        <span class="value">${amountWithEur(readCurrencyMetric(current, ['earned', 'earnedByCurrency', 'earned_by_currency'], ['earned_gbp_minor', 'earnedGbpMinor']), fxRates)}</span>
      </div>
      <div class="status-row">
        <span class="key">Vormonat</span>
        <span class="value">${amountWithEur(readCurrencyMetric(previous, ['earned', 'earnedByCurrency', 'earned_by_currency'], ['earned_gbp_minor', 'earnedGbpMinor']), fxRates)}</span>
      </div>
      <div class="status-row">
        <span class="key">Ver&auml;nderung</span>
        <span class="value">${fmtMulti(readCurrencyMetric(delta, ['earned', 'earnedByCurrency', 'earned_by_currency'], ['earned_gbp_minor', 'earnedGbpMinor']))} / ${fmtPercent(firstNumeric(delta, ['percent', 'percentage', 'earnedPercent', 'earned_percent']))}</span>
      </div>
      <div class="status-row">
        <span class="key">Teilnahmen</span>
        <span class="value">${fmtCount(firstNumber(current, ['submissionsCount', 'submissions_count', 'count']))} / ${fmtCount(firstNumber(previous, ['submissionsCount', 'submissions_count', 'count']))}</span>
      </div>
    </div>

    <div class="status-box">
      <h3>Requester-Analyse</h3>
      <div class="requester-table">
        <div class="requester-row requester-head">
          <span>Requester</span>
          <span>Anzahl</span>
          <span>Verdienst</span>
          <span>Stundenlohn</span>
          <span>Approval-Rate</span>
        </div>
        ${requesterRows}
      </div>
    </div>

    <div class="status-box">
      <h3>Monatsbericht</h3>
      <div class="status-row">
        <span class="key">Monat</span>
        <span class="value">${escapeHtml(fmtMonthLabel(reportMonth))}</span>
      </div>
      <div class="status-row">
        <span class="key">Verdient</span>
        <span class="value">${amountWithEur(readCurrencyMetric(report, ['earned', 'earnedByCurrency', 'earned_by_currency'], ['earned_gbp_minor', 'earnedGbpMinor']), fxRates)}</span>
      </div>
      <div class="status-row">
        <span class="key">Pending</span>
        <span class="value">${amountWithEur(readCurrencyMetric(report, ['pending', 'pendingByCurrency', 'pending_by_currency'], ['pending_gbp_minor', 'pendingGbpMinor']), fxRates)}</span>
      </div>
      <div class="status-row">
        <span class="key">Teilnahmen</span>
        <span class="value">${fmtCount(firstNumber(report, ['submissionsCount', 'submissions_count', 'count']))}</span>
      </div>
      <div class="status-row">
        <span class="key">Stundenlohn</span>
        <span class="value">${fmtMetricHourly(readCurrencyMetric(reportHourly, ['byCurrency', 'by_currency', 'hourly'], ['gbp_minor', 'gbpMinor']), 'GBP')} &middot; ${fmtCount(firstNumber(reportHourly, ['sampleCount', 'sample_count', 'count']))} Samples</span>
      </div>
      ${statusRows}
      ${renderTopStudyList(report.topStudies || report.top_studies, 'reward')}
      <div class="status-row">
        <span class="key">CSV Export</span>
        <span class="value"><a href="/api/export.php?type=submissions&amp;format=csv">Teilnahmen exportieren</a></span>
      </div>
    </div>
  `;
}

function renderAccount(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  const balance = asObject(data.balance);
  const fxRates = data.fxRates || data.fx_rates;
  const { availableByCurrency, pendingByCurrency } = extractProlificBalance(balance);
  const total = {};

  for (const [currency, value] of Object.entries(availableByCurrency)) {
    total[currency] = (total[currency] || 0) + value;
  }

  for (const [currency, value] of Object.entries(pendingByCurrency)) {
    total[currency] = (total[currency] || 0) + value;
  }

  const fx = readFxRates(fxRates);
  const fxStatus = fxRateFor(fx.rates, 'EUR')
    ? `aktiv (${escapeHtml(fx.base)} &rarr; EUR)`
    : 'nicht verf&uuml;gbar';

  return `
    <div class="earnings-grid">
      <div class="earning-tile">
        <div class="label">Auszahlbar</div>
        <div class="value">${amountWithEur(availableByCurrency, fxRates)}</div>
      </div>
      <div class="earning-tile">
        <div class="label">In Pr&uuml;fung</div>
        <div class="value">${amountWithEur(pendingByCurrency, fxRates)}</div>
      </div>
      <div class="earning-tile">
        <div class="label">Gesamt offen</div>
        <div class="value">${amountWithEur(total, fxRates)}</div>
      </div>
      <div class="earning-tile">
        <div class="label">Letztes Update</div>
        <div class="value">${fmtTimeAgo(balance.fetchedAt || balance.fetched_at || data.serverTime)}</div>
      </div>
    </div>

    <div class="status-box">
      <h3>W&auml;hrungen</h3>
      <div class="status-row">
        <span class="key">FX-Rates</span>
        <span class="value">${fxStatus}</span>
      </div>
      <div class="status-row">
        <span class="key">Serverzeit</span>
        <span class="value">${fmtDateTime(data.serverTime)}</span>
      </div>
      <div class="status-row">
        <span class="key">CSV Export</span>
        <span class="value"><a href="/api/export.php?type=submissions&amp;format=csv">Teilnahmen exportieren</a></span>
      </div>
    </div>
  `;
}

function renderSystem(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  const system = asObject(data.system || data);
  const dbCounts = asObject(system.dbCounts || system.db_counts);
  const lastSync = asObject(system.lastSync || system.last_sync || system.lastSyncLog || system.last_sync_log);
  const lastError = asObject(system.lastError || system.last_error);
  const fields = [
    ['API', firstDefined(system, ['api', 'status']) || (data.ok ? 'ok' : DASH)],
    ['Letzter Sync', fmtDateTime(firstDefined(system, ['lastSyncAt', 'last_sync_at']) || firstDefined(lastSync, ['timestamp', 'created_at', 'synced_at']))],
    ['Letzter erfolgreicher Sync', fmtDateTime(firstDefined(system, ['lastSuccessfulSyncAt', 'last_successful_sync_at']))],
    ['Letzter Fehler', firstDefined(lastError, ['message', 'error', 'detail']) || firstDefined(system, ['lastErrorMessage', 'last_error_message']) || 'keiner'],
    ['Cron', firstDefined(system, ['cron', 'cronStatus', 'cron_status']) || DASH],
    ['Studien in DB', firstNumber(dbCounts, ['studies', 'study_count', 'studyCount'])],
    ['Teilnahmen in DB', firstNumber(dbCounts, ['submissions', 'submission_count', 'submissionCount'])],
    ['Events in DB', firstNumber(dbCounts, ['events', 'event_count', 'eventCount'])],
    ['Serverzeit', fmtDateTime(firstDefined(system, ['serverTime', 'server_time']) || data.serverTime)]
  ];

  return `
    <div class="status-box">
      <h3>Systemstatus</h3>
      ${fields.map(([label, value]) => `
        <div class="status-row">
          <span class="key">${escapeHtml(label)}</span>
          <span class="value">${escapeHtml(value == null ? DASH : value)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function moneyMinorToInput(minor) {
  const numeric = Number(minor);

  if (!Number.isFinite(numeric)) return '';

  return (numeric / 100).toFixed(2);
}

function inputToMinor(value) {
  const numeric = Number(String(value || '').replace(',', '.'));

  return Number.isFinite(numeric) ? Math.round(numeric * 100) : null;
}

function renderSettingsControl(options) {
  const value = moneyMinorToInput(options.valueMinor);
  const numeric = Number(value || 0);
  const max = Math.max(options.max, Math.ceil(Math.max(numeric, 1) * 1.25));

  return `
    <label class="setting-control" for="${escapeHtml(options.id)}">
      <span class="setting-main">
        <span>
          <span class="setting-label">${escapeHtml(options.label)}</span>
          <span class="setting-hint">${escapeHtml(options.hint)}</span>
        </span>
        <span class="setting-value-field">
          <span class="setting-prefix">£</span>
          <input id="${escapeHtml(options.id)}" data-settings-input="${escapeHtml(options.field)}"
                 type="number" min="0" max="${escapeHtml(max)}" step="0.01"
                 value="${escapeHtml(value)}" inputmode="decimal">
        </span>
      </span>
      <input class="setting-range" data-settings-range="${escapeHtml(options.field)}"
             type="range" min="0" max="${escapeHtml(max)}" step="${escapeHtml(options.step)}"
             value="${escapeHtml(value)}">
    </label>
  `;
}

function renderSettings(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  const settings = asObject(data.settings);
  const goals = asObject(settings.goals);
  const thresholds = asObject(settings.thresholds);

  return `
    <form id="settingsForm" class="settings-form" novalidate>
      <div class="settings-header">
        <div>
          <h3>Einstellungen</h3>
          <p>Ziele und Qualitätsgrenzen werden automatisch gespeichert.</p>
        </div>
        <div id="settingsMessage" class="settings-save-state">Automatisch gespeichert</div>
      </div>
      <div class="settings-grid">
        ${renderSettingsControl({
          id: 'settingsDailyGoal',
          field: 'daily_gbp',
          label: 'Tagesziel',
          hint: 'Zielwert für die Tagesübersicht',
          valueMinor: goals.daily_gbp_minor,
          max: 50,
          step: 0.25
        })}
        ${renderSettingsControl({
          id: 'settingsMonthlyGoal',
          field: 'monthly_gbp',
          label: 'Monatsziel',
          hint: 'Zielwert für Prognose und Fortschritt',
          valueMinor: goals.monthly_gbp_minor,
          max: 1000,
          step: 1
        })}
        ${renderSettingsControl({
          id: 'settingsGreatHourly',
          field: 'great_hourly_gbp',
          label: 'Sehr guter Stundenlohn',
          hint: 'Ab hier bekommen Studien das Tag Sehr gut',
          valueMinor: thresholds.great_hourly_gbp_minor,
          max: 80,
          step: 0.5
        })}
        ${renderSettingsControl({
          id: 'settingsOkHourly',
          field: 'ok_hourly_gbp',
          label: 'Okay-Stundenlohn',
          hint: 'Unter diesem Wert gilt eine Studie als niedrig',
          valueMinor: thresholds.ok_hourly_gbp_minor,
          max: 50,
          step: 0.5
        })}
      </div>
    </form>
  `;
}

function bindSettingsForm() {
  const form = $('settingsForm');

  if (!form) return;

  const message = $('settingsMessage');
  let saveTimer = null;
  let saveToken = 0;

  const inputFor = field => form.querySelector(`[data-settings-input="${field}"]`);
  const rangeFor = field => form.querySelector(`[data-settings-range="${field}"]`);
  const settingInputs = Array.from(form.querySelectorAll('[data-settings-input]'));
  const settingRanges = Array.from(form.querySelectorAll('[data-settings-range]'));

  const collectPayload = () => {
    const payload = {
      settings: {
        goals: {
          daily_gbp_minor: inputToMinor(inputFor('daily_gbp')?.value),
          monthly_gbp_minor: inputToMinor(inputFor('monthly_gbp')?.value)
        },
        thresholds: {
          great_hourly_gbp_minor: inputToMinor(inputFor('great_hourly_gbp')?.value),
          ok_hourly_gbp_minor: inputToMinor(inputFor('ok_hourly_gbp')?.value)
        }
      }
    };

    return payload;
  };

  const setMessage = (text, state) => {
    if (!message) return;

    message.textContent = text;
    message.dataset.state = state || '';
  };

  const saveSettings = async token => {
    setMessage('Speichere...', 'saving');

    try {
      const data = await postJson(`${API_BASE}?type=settings`, collectPayload());

      if (token !== saveToken) return;

      if (data && data.ok) {
        cachedData.settings = data;
        setMessage('Automatisch gespeichert', 'saved');
      } else if (message) {
        setMessage('Speichern fehlgeschlagen', 'error');
      }
    } catch (e) {
      setMessage('Speichern fehlgeschlagen: ' + e.message, 'error');
    }
  };

  const scheduleSave = () => {
    const token = ++saveToken;

    setMessage('Ungespeicherte Änderungen', 'dirty');
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveSettings(token), 650);
  };

  const syncControl = (field, value, source) => {
    const input = inputFor(field);
    const range = rangeFor(field);

    if (input && source !== input) input.value = value;
    if (range && source !== range) range.value = value;
  };

  [...settingInputs, ...settingRanges].forEach(control => {
    const field = control.dataset.settingsInput || control.dataset.settingsRange;

    control.addEventListener('input', () => {
      syncControl(field, control.value, control);
      scheduleSave();
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
  });
}

function qualityThresholds() {
  const settings = asObject(asObject(cachedData.settings).settings);
  const thresholds = asObject(settings.thresholds);

  return {
    great: firstNumber(thresholds, ['great_hourly_gbp_minor', 'greatHourlyGbpMinor']) ?? 1200,
    ok: firstNumber(thresholds, ['ok_hourly_gbp_minor', 'okHourlyGbpMinor']) ?? 800
  };
}

function renderStudyQualityTag(study) {
  const hourly = Number(study.reward_per_hour);

  if (!Number.isFinite(hourly)) return '';

  const thresholds = qualityThresholds();

  if (hourly > thresholds.great) {
    return '<span class="tag tag-active">Sehr gut</span>';
  }

  if (hourly >= thresholds.ok) {
    return '<span class="tag tag-expired">Okay</span>';
  }

  return '<span class="tag tag-inactive">Niedrig</span>';
}

function renderStudyDetailTile(label, value, modifier) {
  if (value == null || value === '') return '';

  const className = modifier ? ` study-detail-${modifier}` : '';

  return `
    <div class="study-detail-tile${className}">
      <span class="study-detail-label">${escapeHtml(label)}</span>
      <span class="study-detail-value">${value}</span>
    </div>
  `;
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

    const qualityTag = renderStudyQualityTag(s);

    if (qualityTag) {
      tags.push(qualityTag);
    }

    const detailTiles = [];

    if (s.reward_minor != null) {
      detailTiles.push(renderStudyDetailTile('Vergütung', escapeHtml(fmtAmount(s.reward_minor, s.reward_currency)), 'reward'));
    }

    if (s.estimated_minutes != null) {
      detailTiles.push(renderStudyDetailTile('Dauer', `${escapeHtml(s.estimated_minutes)} Min`));
    }

    if (s.total_places != null) {
      detailTiles.push(renderStudyDetailTile('Plätze', escapeHtml(s.total_places)));
    }

    if (s.reward_per_hour != null) {
      detailTiles.push(renderStudyDetailTile('Stundenlohn', `${escapeHtml(fmtAmount(s.reward_per_hour, s.reward_currency))}/h`, 'hourly'));
    }

    detailTiles.push(renderStudyDetailTile('Gesehen', escapeHtml(fmtTimestamp(s.first_seen))));

    return `
      <div class="study-card">
        <a class="open-link"
           href="https://app.prolific.com/studies/${encodeURIComponent(s.id || '')}"
           target="_blank"
           rel="noopener"
           title="Auf Prolific öffnen">↗</a>

        <div class="name">${escapeHtml(s.name || '(ohne Namen)')}</div>
        <div class="study-detail-grid">${detailTiles.join('')}</div>
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
    return `
      <div class="status-box">
        <h3>Export</h3>
        <div class="status-row">
          <span class="key">CSV Export</span>
          <span class="value"><a href="/api/export.php?type=submissions&amp;format=csv">Teilnahmen exportieren</a></span>
        </div>
      </div>
      <div class="loading">Keine Teilnahmen.</div>
    `;
  }

  const rows = subs.map(s => {
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

  return `
    <div class="status-box">
      <h3>Export</h3>
      <div class="status-row">
        <span class="key">CSV Export</span>
        <span class="value"><a href="/api/export.php?type=submissions&amp;format=csv">Teilnahmen exportieren</a></span>
      </div>
    </div>
    ${rows}
  `;
}

// ---- Renderer: Events ----

function normalizeSyncRecord(record) {
  const obj = asObject(record);

  if (!Object.keys(obj).length) return null;

  return {
    status: firstDefined(obj, ['status', 'state']),
    type: firstDefined(obj, ['type', 'eventType', 'event_type']),
    message: firstDefined(obj, ['message', 'label']),
    timestamp: firstDefined(obj, ['timestamp', 'created_at', 'synced_at', 'at'])
  };
}

function syncRecordFromEvent(event) {
  const obj = asObject(event);
  const type = String(obj.type || '');

  if (!['sync_ok', 'sync_error'].includes(type)) return null;

  return normalizeSyncRecord({
    status: type === 'sync_error' ? 'error' : 'ok',
    type,
    message: obj.message,
    timestamp: obj.timestamp
  });
}

function syncStatusText(record) {
  if (!record) return 'Nie';

  const status = String(record.status || '').toLowerCase();
  const type = String(record.type || '').toLowerCase();

  if (status === 'error' || type === 'sync_error') return 'Fehlgeschlagen';
  if (status === 'ok' || type === 'sync_ok' || type === 'sync_log') return 'OK';

  return record.message || record.type || DASH;
}

function renderSyncState(record) {
  const label = syncStatusText(record);
  const className = label === 'OK' ? 'ok' : label === 'Fehlgeschlagen' ? 'error' : 'neutral';

  return `<span class="sync-state ${className}">${escapeHtml(label)}</span>`;
}

function renderEventCards(events) {
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

function renderEvents(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  const events = Array.isArray(data.events) ? data.events : [];
  const syncStatus = asObject(data.syncStatus || data.sync_status);
  const syncEvents = events
    .map(syncRecordFromEvent)
    .filter(Boolean);
  const fallbackLastSync = syncEvents[0] || null;
  const fallbackLastSuccess = syncEvents.find(event => event.type === 'sync_ok') || null;
  const fallbackLastFailure = syncEvents.find(event => event.type === 'sync_error') || null;
  const lastSync = normalizeSyncRecord(firstDefined(syncStatus, ['lastSync', 'last_sync'])) || fallbackLastSync;
  const lastSuccess = normalizeSyncRecord(firstDefined(syncStatus, ['lastSuccess', 'last_success'])) || fallbackLastSuccess;
  const lastFailure = normalizeSyncRecord(firstDefined(syncStatus, ['lastFailure', 'last_failure'])) || fallbackLastFailure;

  return `
    <div class="status-box sync-status-card">
      <h3>Sync-Status</h3>
      <div class="status-row">
        <span class="key">Letzter Sync</span>
        <span class="value">${renderSyncState(lastSync)}</span>
      </div>
      <div class="status-row">
        <span class="key">Letzter erfolgreicher Sync</span>
        <span class="value">${lastSuccess ? fmtTimestamp(lastSuccess.timestamp) : 'Nie'}</span>
      </div>
      <div class="status-row">
        <span class="key">Letzter Fehlschlag</span>
        <span class="value">${lastFailure ? fmtTimestamp(lastFailure.timestamp) : 'Nie'}</span>
      </div>
    </div>
    <details class="log-details">
      <summary>Log</summary>
      <div class="log-list">${renderEventCards(events)}</div>
    </details>
  `;
}

// ---- Tab-Logic ----

async function loadTab(tab) {
  const panel = $(`panel-${tab}`);

  if (!panel) return;

  const container = panel.querySelector(`#${tab}Content`);

  if (!container) return;

  const renderers = {
    overview: renderOverview,
    studies: renderStudies,
    submissions: renderSubmissions,
    stats: renderStats,
    account: renderAccount,
    system: renderSystem,
    settings: renderSettings,
    events: renderEvents
  };

  try {
    const data = await fetchData(tab);

    if (!data) return;

    cachedData[tab] = data;

    const renderer = renderers[tab];
    const html = renderer ? renderer(data) : '<div class="error">Unbekannter Tab.</div>';

    if (tab === 'overview') {
      updateSyncIndicator(data.lastSyncAt);
    }

    container.innerHTML = html;
    container.classList.remove('loading');

    if (tab === 'settings') {
      bindSettingsForm();
    }
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
