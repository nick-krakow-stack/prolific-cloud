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
  extraIncome: null,
  events: null
};

let telegramCommandStatus = null;

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

function fmtEurAmount(minor) {
  return fmtAmount(minor, 'EUR');
}

function fmtCount(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return DASH;

  return Math.round(numeric).toLocaleString('de-DE');
}

function fmtStudyCount(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return DASH;

  const count = Math.round(numeric);

  return fmtCount(count) + ' ' + (count === 1 ? 'Studie' : 'Studien');
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

function fmtSvgNumber(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return '0';

  return (Math.round(numeric * 1000) / 1000).toString();
}

function progressPercent(currentMinor, targetMinor) {
  const current = Number(currentMinor);
  const target = Number(targetMinor);

  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return null;
  }

  return (current / target) * 100;
}

function goalProgressClass(percent) {
  const numeric = Number(percent);

  if (!Number.isFinite(numeric)) return 'is-neutral';
  if (numeric < 50) return 'is-danger';
  if (numeric < 95) return 'is-warn';

  return 'is-good';
}

function mixHexColor(fromHex, toHex, ratio) {
  const clamped = Math.max(0, Math.min(1, Number(ratio)));
  const from = fromHex.replace('#', '');
  const to = toHex.replace('#', '');
  const channels = [0, 2, 4].map(offset => {
    const start = parseInt(from.slice(offset, offset + 2), 16);
    const end = parseInt(to.slice(offset, offset + 2), 16);
    const mixed = Math.round(start + (end - start) * clamped);

    return mixed.toString(16).padStart(2, '0');
  });

  return `#${channels.join('')}`;
}

function goalProgressColor(percent) {
  const numeric = Number(percent);
  const red = '#ef4444';
  const yellow = '#facc15';
  const green = '#16a34a';

  if (!Number.isFinite(numeric)) return '#94a3b8';
  if (numeric <= 5) return red;
  if (numeric < 50) return mixHexColor(red, yellow, (numeric - 5) / 45);
  if (numeric < 98) return mixHexColor(yellow, green, (numeric - 50) / 48);

  return green;
}

function goalOverflowPercent(percent) {
  const numeric = Number(percent);

  if (!Number.isFinite(numeric) || numeric <= 100) return 0;

  return Math.max(0, Math.min(100, Math.round((numeric - 100) * 10) / 10));
}

function goalStrokeOffset(percent) {
  const clamped = clampPercent(percent) ?? 0;
  const offset = Math.max(0, Math.min(100, 100 - clamped));
  const rounded = Math.round(offset * 10) / 10;

  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function monthComparisonPercent(currentEarned, previousEarned, fxRates) {
  const currentValue = convertToEur(currentEarned, fxRates) ?? currencyMinor(currentEarned, 'GBP');
  const previousValue = convertToEur(previousEarned, fxRates) ?? currencyMinor(previousEarned, 'GBP');

  if (currentValue == null || previousValue == null || previousValue <= 0) {
    return null;
  }

  return (currentValue / previousValue) * 100;
}

function comparisonPercentClass(percent) {
  const numeric = Number(percent);

  if (!Number.isFinite(numeric)) return 'is-neutral';
  if (numeric < 95) return 'is-danger';
  if (numeric <= 105) return 'is-warn';

  return 'is-good';
}

function fmtComparisonPercent(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return DASH;

  const percent = Math.abs(numeric) <= 1 && numeric !== 0 ? numeric * 100 : numeric;
  const rounded = Math.round(percent * 10) / 10;
  const sign = rounded < 100 ? '-' : rounded === 100 ? '=' : '+';
  const formatted = rounded.toLocaleString('de-DE', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
    maximumFractionDigits: 1
  });

  return `${sign} ${formatted} %`;
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

  if (value == null) return null;

  const numeric = Number(value);

  return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

function firstNumeric(source, keys) {
  const value = firstDefined(source, keys);

  if (value == null) return null;

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

function sumCurrencyMinor(currency, ...maps) {
  let found = false;
  let total = 0;

  for (const map of maps) {
    const value = currencyMinor(map, currency);

    if (value == null) continue;

    found = true;
    total += value;
  }

  return found ? total : null;
}

function sumCurrencyMaps(...maps) {
  const result = {};

  for (const map of maps) {
    for (const [currencyRaw, valueRaw] of Object.entries(asObject(map))) {
      const currency = String(currencyRaw || '').toUpperCase();
      const value = Number(valueRaw);

      if (!currency || !Number.isFinite(value)) continue;

      result[currency] = (result[currency] || 0) + Math.round(value);
    }
  }

  return result;
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

function convertGbpToEurMinor(minor, fxRates) {
  const numeric = Number(minor);

  if (!Number.isFinite(numeric)) return null;
  if (numeric === 0) return 0;

  return convertToEur({ GBP: Math.round(numeric) }, fxRates);
}

function convertEurToGbpMinor(minor, fxRates) {
  const numeric = Number(minor);
  const fx = readFxRates(fxRates);
  const eurRate = fxRateFor(fx.rates, 'EUR');

  if (!Number.isFinite(numeric) || fx.base !== 'GBP' || !eurRate) {
    return null;
  }

  return Math.round(numeric / eurRate);
}

function convertToGbpMinor(byCurrency, fxRates) {
  const entries = positiveCurrencyEntries(byCurrency);

  if (entries.length === 0) return null;

  const fx = readFxRates(fxRates);

  if (fx.base !== 'GBP') {
    return entries.every(([currency]) => currency === 'GBP')
      ? entries.reduce((sum, [, minor]) => sum + Math.round(minor), 0)
      : null;
  }

  let gbpMinor = 0;

  for (const [currency, minor] of entries) {
    if (currency === 'GBP') {
      gbpMinor += Math.round(minor);
      continue;
    }

    const currencyRate = fxRateFor(fx.rates, currency);

    if (!currencyRate) return null;

    gbpMinor += Math.round(minor / currencyRate);
  }

  return gbpMinor > 0 ? gbpMinor : null;
}

function canConvertGbpEur(fxRates) {
  return convertGbpToEurMinor(100, fxRates) != null;
}

function fmtGbpAsEur(minor, fxRates) {
  const eurMinor = convertGbpToEurMinor(minor, fxRates);

  return eurMinor == null ? fmtAmount(minor, 'GBP') : fmtAmount(eurMinor, 'EUR');
}

function fmtSignedGbpAsEur(minor, fxRates) {
  const numeric = Number(minor);

  if (!Number.isFinite(numeric)) return DASH;

  const sign = numeric > 0 ? '+' : numeric < 0 ? '-' : '';

  return sign + fmtGbpAsEur(Math.abs(Math.round(numeric)), fxRates);
}

function fmtMetricAmountEur(value, fxRates, currency = 'GBP') {
  const eurMinor = value && typeof value === 'object'
    ? convertToEur(value, fxRates)
    : convertToEur({ [currency]: value }, fxRates);

  return eurMinor == null ? fmtMetricAmount(value, currency) : fmtAmount(eurMinor, 'EUR');
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

function readGoalEurMinor(goals, period) {
  const keys = period === 'daily'
    ? ['daily_eur_minor', 'dailyGoalEurMinor']
    : ['monthly_eur_minor', 'monthlyGoalEurMinor'];
  const value = firstDefined(goals, keys);

  if (value == null) return null;

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

function readPeriodStats(periodStatsRaw, fallbackPeriod) {
  const periodStats = asObject(periodStatsRaw);
  const earned = readCurrencyMetric(
    periodStats,
    ['earned', 'earnedByCurrency', 'earned_by_currency'],
    ['earned_gbp_minor', 'earnedGbpMinor', 'earnedMinor']
  );
  const pending = readCurrencyMetric(
    periodStats,
    ['pending', 'pendingByCurrency', 'pending_by_currency'],
    ['pending_gbp_minor', 'pendingGbpMinor', 'pendingMinor']
  );

  const fallbackEarned = asObject(fallbackPeriod.earned);
  const fallbackPending = asObject(fallbackPeriod.pending);
  const finalEarned = Object.keys(earned).length ? earned : fallbackEarned;
  const finalPending = Object.keys(pending).length ? pending : fallbackPending;
  const count = firstNumber(periodStats, [
    'submission_count',
    'submissionCount',
    'submissions_count',
    'submissionsCount',
    'participations',
    'count'
  ]);
  const averageMap = readCurrencyMetric(
    asObject(periodStats.averageReward),
    ['byCurrency', 'by_currency', 'average', 'averageByCurrency', 'average_by_currency'],
    ['gbp_minor', 'gbpMinor', 'average_gbp_minor', 'averageGbpMinor']
  );
  const hourlyMap = readCurrencyMetric(
    asObject(periodStats.effectiveHourlyRate),
    ['byCurrency', 'by_currency', 'hourly', 'hourlyByCurrency', 'hourly_by_currency'],
    ['gbp_minor', 'gbpMinor', 'hourly_gbp_minor', 'hourlyGbpMinor']
  );
  const hourlySource = asObject(periodStats.effectiveHourlyRate);
  const hourlyRewardMap = readCurrencyMetric(
    hourlySource,
    ['rewardByCurrency', 'reward_by_currency', 'rewardTotal', 'reward_total', 'rewards'],
    ['reward_gbp_minor', 'rewardGbpMinor', 'reward_total_gbp_minor', 'rewardTotalGbpMinor']
  );
  const hourlySeconds = firstNumber(hourlySource, [
    'secondsTotal',
    'seconds_total',
    'timeTakenSeconds',
    'time_taken_seconds'
  ]);
  const average = Object.keys(averageMap).length ? averageMap : firstNumber(periodStats, [
    'average_reward_gbp_minor',
    'averageRewardGbpMinor',
    'average_reward_minor',
    'averageRewardMinor',
    'avg_gbp_minor',
    'avgMinor'
  ]);
  const hourly = Object.keys(hourlyMap).length ? hourlyMap : firstNumber(periodStats, [
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
    hourly,
    hourlyReward: hourlyRewardMap,
    hourlySeconds
  };
}

function readTodayStats(data, today) {
  return readPeriodStats(data.todayStats, today);
}

function readMonthStats(data, month) {
  return readPeriodStats(data.monthStats || data.month_stats, month);
}

function readEfficiencyPeriod(source) {
  const period = asObject(source);
  const byCurrency = readCurrencyMetric(
    period,
    ['byCurrency', 'by_currency', 'hourly', 'hourlyByCurrency', 'hourly_by_currency'],
    ['gbp_minor', 'gbpMinor', 'hourly_gbp_minor', 'hourlyGbpMinor']
  );
  const rewardByCurrency = readCurrencyMetric(
    period,
    ['rewardByCurrency', 'reward_by_currency', 'rewardTotal', 'reward_total', 'rewards'],
    ['reward_gbp_minor', 'rewardGbpMinor', 'reward_total_gbp_minor', 'rewardTotalGbpMinor']
  );

  return {
    byCurrency,
    rewardByCurrency,
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
  } else if (['SCREENED OUT', 'SCREENED-OUT'].includes(normalized)) {
    className = 'tag tag-paid';
  } else if (normalized === 'AWAITING REVIEW') {
    className = 'tag tag-expired';
  } else if (normalized === 'RETURNED') {
    className = 'tag tag-danger';
  } else if (['TIMED OUT', 'TIMED-OUT', 'TIMEDOUT'].includes(normalized)) {
    className = 'tag tag-danger-soft';
  } else if (normalized === 'REJECTED') {
    inline = ' style="background:var(--danger-bg);color:var(--danger);"';
  }

  return `<span class="${className}"${inline}>${escapeHtml(status)}</span>`;
}

function statusSortKey(status) {
  const order = [
    'APPROVED',
    'SCREENED OUT',
    'SCREENED-OUT',
    'AWAITING REVIEW',
    'REJECTED',
    'RETURNED',
    'TIMED OUT',
    'TIMED-OUT',
    'TIMEDOUT'
  ];
  const index = order.indexOf(String(status || '').toUpperCase());

  return index === -1 ? order.length : index;
}

function inferMonthlyForecast(forecast, monthEarnedMinor, monthlyGoalMinor, serverTime) {
  const combinedCurrent = Number(monthEarnedMinor);
  const fallbackCurrent = Number.isFinite(combinedCurrent) ? Math.round(combinedCurrent) : null;
  const sourceCurrent = firstNumber(forecast, [
    'current_month_gbp_minor',
    'currentMonthGbpMinor',
    'currentMonthMinor',
    'current_gbp_minor',
    'currentMinor'
  ]);
  const current = fallbackCurrent ?? sourceCurrent;
  const sourceMatchesCurrent = fallbackCurrent == null || sourceCurrent == null || sourceCurrent === fallbackCurrent;
  let average = sourceMatchesCurrent
    ? firstNumber(forecast, [
      'average_day_gbp_minor',
      'averagePerDayGbpMinor',
      'averagePerDayMinor',
      'daily_average_gbp_minor',
      'dailyAverageGbpMinor'
    ])
    : null;
  let projected = sourceMatchesCurrent
    ? firstNumber(forecast, [
      'projected_month_gbp_minor',
      'projectedMonthGbpMinor',
      'projectedMonthMinor',
      'forecast_gbp_minor',
      'forecastGbpMinor',
      'forecastMinor'
    ])
    : null;
  let delta = sourceMatchesCurrent
    ? firstNumber(forecast, [
      'target_delta_gbp_minor',
      'targetDeltaGbpMinor',
      'goal_delta_gbp_minor',
      'goalDeltaGbpMinor',
      'difference_to_goal_gbp_minor',
      'differenceToGoalGbpMinor'
    ])
    : null;
  let willReach = sourceMatchesCurrent
    ? firstBoolean(forecast, [
      'will_reach_goal',
      'willReachGoal',
      'targetWillBeReached',
      'goalWillBeReached'
    ])
    : null;

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

function singleCurrencyMap(byCurrency) {
  const entries = positiveCurrencyEntries(byCurrency);

  return entries.length === 1 ? { [entries[0][0]]: entries[0][1] } : null;
}

function effectiveHourlyEurMinor(stats, fxRates) {
  const seconds = Number(stats?.hourlySeconds);
  const reward = asObject(stats?.hourlyReward);

  if (Number.isFinite(seconds) && seconds > 0 && Object.keys(reward).length > 0) {
    const rewardEur = convertToEur(reward, fxRates);

    if (rewardEur != null) {
      return Math.round((rewardEur * 3600) / seconds);
    }
  }

  if (stats?.hourly && typeof stats.hourly === 'object') {
    const singleHourly = singleCurrencyMap(stats.hourly);

    return singleHourly ? convertToEur(singleHourly, fxRates) : null;
  }

  if (stats?.hourly != null) {
    return convertToEur({ GBP: stats.hourly }, fxRates);
  }

  return null;
}

function fmtEffectiveHourlyEur(stats, fxRates) {
  const eurMinor = effectiveHourlyEurMinor(stats, fxRates);

  return eurMinor == null ? DASH : fmtAmount(eurMinor, 'EUR') + '/h';
}

function fmtEfficiencyHourlyEur(period, fxRates) {
  return fmtEffectiveHourlyEur({
    hourly: period.byCurrency,
    hourlyReward: period.rewardByCurrency,
    hourlySeconds: period.secondsTotal
  }, fxRates);
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

function fmtWorktime(seconds) {
  const numeric = Number(seconds);

  if (!Number.isFinite(numeric) || numeric < 60) return DASH;

  const hours = Math.floor(numeric / 3600);
  const minutes = Math.floor((numeric % 3600) / 60);

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;

  return `${hours} h ${minutes} min`;
}

function centsValue(source, keys, fallback = null) {
  const value = firstNumber(source, keys);

  return value == null ? fallback : value;
}

function readExtraIncomeSummary(source) {
  const obj = asObject(source);
  const root = asObject(obj.extraIncome || obj.extra_income || obj);
  const summary = asObject(root.summary || root.overview || root);
  const current = asObject(root.current);
  const week = asObject(root.thisWeek || root.this_week || root.week);
  const today = asObject(root.today);
  const month = asObject(root.month);
  const openPayout = asObject(root.openPayout || root.open_payout);

  return {
    currentGrossCents: centsValue(current, ['grossCents', 'gross_cents'], centsValue(summary, ['currentGrossCents', 'current_gross_cents', 'grossCents', 'gross_cents'], 0)),
    currentNetCents: centsValue(current, ['netCents', 'net_cents'], centsValue(summary, ['currentNetCents', 'current_net_cents', 'netCents', 'net_cents'], null)),
    weekMessages: firstNumber(week, ['messageCount', 'message_count']) ?? firstNumber(summary, ['weekMessages', 'week_messages', 'currentWeekMessages', 'current_week_messages']) ?? 0,
    weekGrossCents: centsValue(week, ['grossCents', 'gross_cents'], centsValue(summary, ['weekGrossCents', 'week_gross_cents', 'currentWeekGrossCents', 'current_week_gross_cents'], 0)),
    weekHourlyCents: centsValue(week, ['hourlyGrossCents', 'hourly_gross_cents'], centsValue(summary, ['weekHourlyCents', 'week_hourly_cents', 'hourlyGrossCents', 'hourly_gross_cents'], null)),
    openGrossCents: centsValue(openPayout, ['grossCents', 'gross_cents'], centsValue(summary, ['openGrossCents', 'open_gross_cents', 'payoutGrossCents', 'payout_gross_cents'], 0)),
    openNetCents: centsValue(openPayout, ['netCents', 'net_cents'], centsValue(summary, ['openNetCents', 'open_net_cents', 'payoutNetCents', 'payout_net_cents'], 0)),
    payoutStatus: firstDefined(openPayout, ['payoutStatus', 'payout_status', 'status']) || firstDefined(summary, ['payoutStatus', 'payout_status', 'status']) || 'offen',
    todaySeconds: firstNumber(today, ['durationSeconds', 'duration_seconds']) ?? firstNumber(summary, ['todaySeconds', 'today_seconds', 'todayDurationSeconds', 'today_duration_seconds']) ?? 0,
    todayMessages: firstNumber(today, ['messageCount', 'message_count']) ?? firstNumber(summary, ['todayMessages', 'today_messages']) ?? 0,
    todayGrossCents: centsValue(today, ['grossCents', 'gross_cents'], centsValue(summary, ['todayGrossCents', 'today_gross_cents'], 0)),
    monthGrossCents: centsValue(month, ['grossCents', 'gross_cents'], centsValue(summary, ['monthGrossCents', 'month_gross_cents'], 0)),
    canMarkPaid: firstBoolean(openPayout, ['canMarkPaid', 'can_mark_paid', 'markPaidAllowed', 'mark_paid_allowed']) === true || firstBoolean(summary, ['canMarkPaid', 'can_mark_paid', 'markPaidAllowed', 'mark_paid_allowed']) === true
  };
}

function readExtraIncomeTimer(data) {
  const obj = asObject(data);
  const timer = asObject(obj.activeTimer || obj.active_timer || obj.timer || obj.active);
  const startedAt = firstDefined(timer, ['startedAt', 'started_at', 'start', 'created_at']);

  return startedAt ? { startedAt } : null;
}

function readExtraIncomeSessions(data) {
  const obj = asObject(data);
  const sessions = parseJsonMaybe(obj.sessions || obj.items || obj.recentSessions || obj.recent_sessions || []);

  return Array.isArray(sessions) ? sessions.map(asObject) : [];
}

function extraIncomeDateInputValue(value) {
  if (!value) return '';

  const date = new Date(String(value).replace(' ', 'T'));

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16).replace(' ', 'T');
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${y}-${m}-${d}T${h}:${min}`;
}

function extraIncomeStatusLabel(status) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'auszahlungsbereit') return 'Auszahlungsbereit';
  if (normalized === 'ausgezahlt') return 'Ausgezahlt';

  return 'Offen';
}

function renderExtraIncomeOverviewTile(extraIncome) {
  const summary = readExtraIncomeSummary(extraIncome);

  if (!extraIncome || Object.keys(asObject(extraIncome)).length === 0) {
    return '';
  }

  return `
    <div class="earning-tile">
      <div class="label">Zusatzverdienste</div>
      <div class="value">${fmtEurAmount(summary.openNetCents)}</div>
      <div class="secondary">Offen zur Auszahlung</div>
    </div>
  `;
}

function renderExtraIncomeGoalRow(amountCents) {
  const numeric = Number(amountCents);

  if (!Number.isFinite(numeric) || numeric <= 0) return '';

  return `
      <div class="status-row">
        <span class="key">Zusatzverdienste</span>
        <span class="value">${fmtEurAmount(numeric)}</span>
      </div>
  `;
}

function renderExtraIncomeTiles(data) {
  const summary = readExtraIncomeSummary(data);
  const net = summary.currentNetCents == null ? summary.openNetCents : summary.currentNetCents;
  const hourly = summary.weekHourlyCents == null ? DASH : `${fmtEurAmount(summary.weekHourlyCents)}/h`;

  return `
    <div class="earnings-grid extra-income-grid">
      <div class="earning-tile">
        <div class="label">Aktueller Verdienst</div>
        <div class="value">${fmtEurAmount(summary.currentGrossCents)}</div>
        <div class="secondary">${fmtEurAmount(net)} nach Gebühren</div>
      </div>
      <div class="earning-tile">
        <div class="label">Diese Woche</div>
        <div class="value">${fmtCount(summary.weekMessages)} Nachrichten</div>
        <div class="secondary">${fmtEurAmount(summary.weekGrossCents)} &middot; ${hourly}</div>
      </div>
      <div class="earning-tile">
        <div class="label">Offen zur Auszahlung</div>
        <div class="value">${fmtEurAmount(summary.openNetCents)}</div>
        <div class="secondary">${fmtEurAmount(summary.openGrossCents)} brutto &middot; ${escapeHtml(extraIncomeStatusLabel(summary.payoutStatus))}</div>
      </div>
      <div class="earning-tile">
        <div class="label">Heute</div>
        <div class="value">${fmtWorktime(summary.todaySeconds)}</div>
        <div class="secondary">${fmtCount(summary.todayMessages)} Nachrichten &middot; ${fmtEurAmount(summary.todayGrossCents)}</div>
      </div>
    </div>
  `;
}

function renderExtraIncomeTimer(data) {
  const timer = readExtraIncomeTimer(data);

  return `
    <div class="status-box extra-income-timer">
      <h3>Timer</h3>
      <div class="status-row">
        <span class="key">Status</span>
        <span class="value">${timer ? `Läuft seit ${escapeHtml(fmtDateTime(timer.startedAt))}` : 'Nicht gestartet'}</span>
      </div>
      <div class="form-actions">
        <button id="extraIncomeStartButton" class="filter-reset" type="button" ${timer ? 'disabled' : ''}>Start</button>
        <button id="extraIncomeStopButton" class="filter-reset" type="button" ${timer ? '' : 'disabled'}>Stop</button>
      </div>
    </div>
  `;
}

function renderExtraIncomeForm() {
  return `
    <form id="extraIncomeSessionForm" class="settings-form extra-income-form">
      <input id="extraIncomeSessionId" type="hidden" value="">
      <div class="extra-income-form-head">
        <h3>Session nachtragen</h3>
      </div>
      <div class="extra-income-field-grid">
        <label class="extra-income-field">
          <span>Start</span>
          <input id="extraIncomeStartedAt" name="started_at" type="datetime-local" required>
        </label>
        <label class="extra-income-field">
          <span>Ende</span>
          <input id="extraIncomeEndedAt" name="ended_at" type="datetime-local" required>
        </label>
        <label class="extra-income-field">
          <span>Bezahlte Nachrichten</span>
          <input id="extraIncomeMessageCount" name="message_count" type="number" min="0" step="1" required>
        </label>
        <label class="extra-income-field">
          <span>Bonusmodus</span>
          <select id="extraIncomeBonusMode" name="bonus_mode">
            <option value="none">Kein Bonus</option>
            <option value="fixed">Einmalig</option>
            <option value="per_message">Fortlaufend pro Nachricht</option>
          </select>
        </label>
        <label class="extra-income-field">
          <span>Mindestnachrichten</span>
          <input id="extraIncomeBonusThreshold" name="bonus_threshold_messages" type="number" min="0" step="1" value="0">
        </label>
        <label class="extra-income-field">
          <span>Bonusbetrag</span>
          <input id="extraIncomeBonusAmount" name="bonus_amount_eur" type="number" min="0" step="0.01" value="0">
        </label>
      </div>
      <label class="toggle-row extra-income-toggle">
        <input id="extraIncomeNightBonus" name="night_bonus_enabled" type="checkbox" checked>
        <span>Nachtbonus anwenden</span>
      </label>
      <div class="form-actions extra-income-actions">
        <button type="submit">Speichern</button>
        <button id="extraIncomeFormReset" class="filter-reset" type="button">Zurücksetzen</button>
      </div>
    </form>
  `;
}

function renderExtraIncomeSessions(data) {
  const sessions = readExtraIncomeSessions(data);

  if (sessions.length === 0) {
    return `
      <div class="status-box extra-income-session-list">
        <h3>Letzte Sessions</h3>
        <div class="loading">Keine Sessions.</div>
      </div>
    `;
  }

  const rows = sessions.slice(0, 20).map(session => {
    const id = firstDefined(session, ['id', 'sessionId', 'session_id']);
    const startedAt = firstDefined(session, ['startedAt', 'started_at']);
    const endedAt = firstDefined(session, ['endedAt', 'ended_at']);
    const messages = firstNumber(session, ['messageCount', 'message_count']) ?? 0;
    const gross = firstNumber(session, ['grossCents', 'gross_cents', 'totalGrossCents', 'total_gross_cents']);

    return `
      <div class="event-card extra-income-session" data-extra-income-session-id="${escapeHtml(id)}">
        <div>
          <div class="type">${escapeHtml(fmtDateTime(startedAt))} - ${escapeHtml(fmtDateTime(endedAt))}</div>
          <div class="message">${fmtCount(messages)} Nachrichten${gross == null ? '' : ` &middot; ${fmtEurAmount(gross)}`}</div>
        </div>
        <div class="form-actions">
          <button class="filter-reset" type="button" data-extra-income-edit="${escapeHtml(id)}">Bearbeiten</button>
          <button class="filter-reset" type="button" data-extra-income-delete="${escapeHtml(id)}">Löschen</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="status-box extra-income-session-list">
      <h3>Letzte Sessions</h3>
      <div class="log-list">${rows}</div>
    </div>
  `;
}

function renderExtraIncomePayout(data) {
  const summary = readExtraIncomeSummary(data);

  return `
    <div class="status-box extra-income-payout">
      <h3>Auszahlung</h3>
      <div class="status-row">
        <span class="key">Status</span>
        <span class="value">${escapeHtml(extraIncomeStatusLabel(summary.payoutStatus))}</span>
      </div>
      <div class="status-row">
        <span class="key">Offen brutto</span>
        <span class="value">${fmtEurAmount(summary.openGrossCents)}</span>
      </div>
      <div class="status-row">
        <span class="key">Offen netto</span>
        <span class="value">${fmtEurAmount(summary.openNetCents)}</span>
      </div>
      <div class="form-actions">
        <button id="extraIncomeMarkPaidButton" class="filter-reset" type="button" ${summary.canMarkPaid ? '' : 'disabled'}>Als ausgezahlt markieren</button>
      </div>
    </div>
  `;
}

function renderExtraIncome(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  return `
    ${renderExtraIncomeTiles(data)}
    <div class="overview-split">
      <div class="overview-stack">
        ${renderExtraIncomeTimer(data)}
        ${renderExtraIncomePayout(data)}
      </div>
      <div class="overview-stack">
        ${renderExtraIncomeForm(data)}
      </div>
    </div>
    ${renderExtraIncomeSessions(data)}
  `;
}

async function reloadExtraIncomeAfterWrite() {
  await loadExtraIncome({ showPageLoader: true });

  if (cachedData.overview) {
    await loadTab('overview');
  }
}

function extraIncomeFormPayload(form) {
  const data = new FormData(form);
  const payload = {
    started_at: data.get('started_at') || '',
    ended_at: data.get('ended_at') || '',
    message_count: Number(data.get('message_count') || 0),
    night_bonus_enabled: Boolean(data.get('night_bonus_enabled')),
    bonus_mode: data.get('bonus_mode') || 'none',
    bonus_threshold_messages: Number(data.get('bonus_threshold_messages') || 0),
    bonus_amount_cents: Math.round(Number(data.get('bonus_amount_eur') || 0) * 100)
  };
  const id = data.get('id') || $('extraIncomeSessionId')?.value;

  if (id) {
    payload.id = id;
  }

  return payload;
}

function ensureExtraIncomeOk(response) {
  if (!response) return false;

  if (response.ok === false) {
    throw new Error(response.error || response.message || 'Aktion fehlgeschlagen.');
  }

  return true;
}

async function startExtraIncomeTimer() {
  const response = await postJson(`${API_BASE}?type=extraIncomeStart`, {});

  if (ensureExtraIncomeOk(response)) {
    await reloadExtraIncomeAfterWrite();
  }
}

function openExtraIncomeStopModal() {
  closeExtraIncomeStopModal();

  const wrapper = document.createElement('div');
  wrapper.id = 'extraIncomeStopModal';
  wrapper.className = 'telegram-modal-backdrop extra-income-modal';
  wrapper.innerHTML = `
    <div class="telegram-modal" role="dialog" aria-modal="true" aria-labelledby="extraIncomeStopTitle">
      <div class="telegram-modal-head">
        <h3 id="extraIncomeStopTitle">Timer stoppen</h3>
        <button class="telegram-modal-close" type="button" data-extra-income-close aria-label="Schließen">&times;</button>
      </div>
      <form id="extraIncomeStopForm">
        <label class="telegram-modal-field">Bezahlte Nachrichten
          <input name="message_count" type="number" min="0" step="1" required>
        </label>
        <label class="toggle-row">
          <input name="night_bonus_enabled" type="checkbox" checked>
          <span>Nachtbonus anwenden</span>
        </label>
        <label class="telegram-modal-field">Bonusmodus
          <select name="bonus_mode">
            <option value="none">Kein Bonus</option>
            <option value="fixed">Einmalig</option>
            <option value="per_message">Fortlaufend pro Nachricht</option>
          </select>
        </label>
        <label class="telegram-modal-field">Mindestnachrichten
          <input name="bonus_threshold_messages" type="number" min="0" step="1" value="0">
        </label>
        <label class="telegram-modal-field">Bonusbetrag
          <input name="bonus_amount_eur" type="number" min="0" step="0.01" value="0">
        </label>
        <div class="telegram-modal-actions">
          <button type="submit">Speichern</button>
          <button class="filter-reset" type="button" data-extra-income-close>Abbrechen</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(wrapper);
  wrapper.querySelector('[name="message_count"]')?.focus();
  wrapper.querySelector('#extraIncomeStopForm')?.addEventListener('submit', submitExtraIncomeStop);
  wrapper.addEventListener('click', event => {
    const target = event.target;

    if (target === wrapper || target?.dataset?.extraIncomeClose != null) {
      closeExtraIncomeStopModal();
    }
  });
}

function closeExtraIncomeStopModal() {
  const modal = $('extraIncomeStopModal');

  if (modal) {
    modal.remove();
  }
}

async function submitExtraIncomeStop(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);
  const payload = {
    message_count: Number(data.get('message_count') || 0),
    night_bonus_enabled: Boolean(data.get('night_bonus_enabled')),
    bonus_mode: data.get('bonus_mode') || 'none',
    bonus_threshold_messages: Number(data.get('bonus_threshold_messages') || 0),
    bonus_amount_cents: Math.round(Number(data.get('bonus_amount_eur') || 0) * 100)
  };
  const response = await postJson(`${API_BASE}?type=extraIncomeStop`, payload);

  if (ensureExtraIncomeOk(response)) {
    closeExtraIncomeStopModal();
    await reloadExtraIncomeAfterWrite();
  }
}

async function submitExtraIncomeSession(event) {
  event.preventDefault();

  const response = await postJson(`${API_BASE}?type=extraIncomeSave`, extraIncomeFormPayload(event.currentTarget));

  if (ensureExtraIncomeOk(response)) {
    event.currentTarget.reset();
    const idField = $('extraIncomeSessionId');

    if (idField) {
      idField.value = '';
    }

    await reloadExtraIncomeAfterWrite();
  }
}

async function deleteExtraIncomeSession(id) {
  if (!id || !window.confirm('Diese Session wirklich löschen?')) return;

  const response = await postJson(`${API_BASE}?type=extraIncomeDelete`, { id });

  if (ensureExtraIncomeOk(response)) {
    await reloadExtraIncomeAfterWrite();
  }
}

async function markExtraIncomePaid() {
  if (!window.confirm('Abgeschlossene auszahlungsbereite Wochen als ausgezahlt markieren?')) return;

  const response = await postJson(`${API_BASE}?type=extraIncomeMarkPaid`, {});

  if (ensureExtraIncomeOk(response)) {
    await reloadExtraIncomeAfterWrite();
  }
}

function prefillExtraIncomeSessionForm(id) {
  const session = readExtraIncomeSessions(cachedData.extraIncome)
    .find(item => String(firstDefined(item, ['id', 'sessionId', 'session_id'])) === String(id));

  if (!session) return;

  const setValue = (fieldId, value) => {
    const field = $(fieldId);

    if (field) {
      field.value = value == null ? '' : String(value);
    }
  };

  setValue('extraIncomeSessionId', firstDefined(session, ['id', 'sessionId', 'session_id']));
  setValue('extraIncomeStartedAt', extraIncomeDateInputValue(firstDefined(session, ['startedAt', 'started_at'])));
  setValue('extraIncomeEndedAt', extraIncomeDateInputValue(firstDefined(session, ['endedAt', 'ended_at'])));
  setValue('extraIncomeMessageCount', firstNumber(session, ['messageCount', 'message_count']) ?? 0);
  setValue('extraIncomeBonusMode', firstDefined(session, ['bonusMode', 'bonus_mode']) || 'none');
  setValue('extraIncomeBonusThreshold', firstNumber(session, ['bonusThresholdMessages', 'bonus_threshold_messages']) ?? 0);
  setValue('extraIncomeBonusAmount', ((firstNumber(session, ['bonusAmountCents', 'bonus_amount_cents']) ?? 0) / 100).toFixed(2));

  const night = $('extraIncomeNightBonus');
  const nightEnabled = firstBoolean(session, ['nightBonusEnabled', 'night_bonus_enabled']);

  if (night) {
    night.checked = nightEnabled !== false;
  }
}

function resetExtraIncomeSessionForm() {
  const form = $('extraIncomeSessionForm');

  if (form) {
    form.reset();
  }

  const id = $('extraIncomeSessionId');

  if (id) {
    id.value = '';
  }
}

function bindExtraIncomeControls() {
  const root = $('extraIncomeContent');

  if (!root || root.dataset.bound === '1') return;

  root.dataset.bound = '1';
  root.addEventListener('submit', event => {
    if (event.target?.id === 'extraIncomeSessionForm') {
      submitExtraIncomeSession(event).catch(error => alert(error.message));
    }
  });
  root.addEventListener('click', event => {
    const target = event.target;

    if (!target) return;

    if (target.id === 'extraIncomeStartButton') {
      startExtraIncomeTimer().catch(error => alert(error.message));
      return;
    }

    if (target.id === 'extraIncomeStopButton') {
      openExtraIncomeStopModal();
      return;
    }

    if (target.id === 'extraIncomeMarkPaidButton') {
      markExtraIncomePaid().catch(error => alert(error.message));
      return;
    }

    if (target.id === 'extraIncomeFormReset') {
      resetExtraIncomeSessionForm();
      return;
    }

    const editButton = target.closest ? target.closest('[data-extra-income-edit]') : null;
    if (editButton) {
      prefillExtraIncomeSessionForm(editButton.dataset.extraIncomeEdit);
      return;
    }

    const deleteButton = target.closest ? target.closest('[data-extra-income-delete]') : null;
    if (deleteButton) {
      deleteExtraIncomeSession(deleteButton.dataset.extraIncomeDelete).catch(error => alert(error.message));
    }
  });
}

function totalPositiveMinor(byCurrency) {
  return positiveCurrencyEntries(byCurrency)
    .reduce((sum, [, value]) => sum + value, 0);
}

function chartValueMinor(byCurrency, fxRates) {
  return convertToEur(byCurrency, fxRates) ?? currencyMinor(byCurrency, 'GBP') ?? totalPositiveMinor(byCurrency);
}

function renderGoalDetailRows(stats, fxRates) {
  return `
      <div class="status-row">
        <span class="key">Teilnahmen</span>
        <span class="value">${fmtCount(stats.count)}</span>
      </div>

      <div class="status-row">
        <span class="key">Ø pro Teilnahme</span>
        <span class="value">${fmtMetricAmountEur(stats.average, fxRates, 'GBP')}</span>
      </div>

      <div class="status-row">
        <span class="key">Effektiver Stundenlohn</span>
        <span class="value">${fmtEffectiveHourlyEur(stats, fxRates)}</span>
      </div>
  `;
}

function renderGoalCard(label, currentMinor, targetMinor, fxRates, extraRows = '', display = {}) {
  const rawTargetEurMinor = display.targetEurMinor;
  const targetEurMinor = rawTargetEurMinor == null ? null : Number(rawTargetEurMinor);
  const hasEurTarget = Number.isFinite(targetEurMinor);
  const currentEurMinor = Number.isFinite(Number(display.currentEurMinor))
    ? Math.round(Number(display.currentEurMinor))
    : convertGbpToEurMinor(currentMinor, fxRates);
  const percentCurrent = hasEurTarget && currentEurMinor != null ? currentEurMinor : currentMinor;
  const percentTarget = hasEurTarget ? Math.round(targetEurMinor) : targetMinor;
  const percent = progressPercent(percentCurrent, percentTarget);
  const innerPercent = clampPercent(percent) ?? 0;
  const overflowPercent = goalOverflowPercent(percent);
  const progressOffset = goalStrokeOffset(innerPercent);
  const overflowOffset = goalStrokeOffset(overflowPercent);
  const progressColor = goalProgressColor(percent);
  const remaining =
    Number.isFinite(Number(percentCurrent)) && Number.isFinite(Number(percentTarget))
      ? Math.max(0, Number(percentTarget) - Number(percentCurrent))
      : null;
  const progressValue = hasEurTarget && currentEurMinor != null
    ? `${fmtAmount(currentEurMinor, 'EUR')} von ${fmtAmount(Math.round(targetEurMinor), 'EUR')}`
    : `${fmtGbpAsEur(currentMinor, fxRates)} von ${fmtGbpAsEur(targetMinor, fxRates)}`;
  const remainingValue = hasEurTarget && currentEurMinor != null
    ? fmtAmount(remaining, 'EUR')
    : fmtGbpAsEur(remaining, fxRates);
  const overflowRing = overflowPercent > 0
    ? `
          <circle
            class="goal-ring-overflow"
            cx="50"
            cy="50"
            r="46"
            pathLength="100"
            stroke="var(--primary)"
            style="stroke: var(--primary);"
            stroke-dasharray="100"
            stroke-dashoffset="${overflowOffset}"
          ></circle>`
    : '';

  return `
    <div class="status-box goal-card">
      <div class="goal-card-head">
        <h3>${label}</h3>
        <div
          class="goal-ring-wrap${overflowPercent > 0 ? ' has-overflow' : ''}"
          aria-label="${escapeHtml(label)}: ${escapeHtml(fmtPercent(percent))} erreicht"
        >
          <svg class="goal-ring-svg ${goalProgressClass(percent)}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <circle class="goal-ring-track" cx="50" cy="50" r="36"></circle>
            <circle
              class="goal-ring-progress"
              cx="50"
              cy="50"
              r="36"
              pathLength="100"
              stroke="${progressColor}"
              style="stroke: ${progressColor};"
              stroke-dasharray="100"
              stroke-dashoffset="${progressOffset}"
            ></circle>
            ${overflowRing}
          </svg>
          <span class="goal-ring-value">${fmtPercent(percent)}</span>
        </div>
      </div>

      <div class="status-row">
        <span class="key">Fortschritt</span>
        <span class="value">${progressValue}</span>
      </div>

      <div class="status-row">
        <span class="key">Erreicht</span>
        <span class="value">${fmtPercent(percent)}</span>
      </div>
      <div class="status-row">
        <span class="key">Noch offen</span>
        <span class="value">${remainingValue}</span>
      </div>
      ${extraRows}
    </div>
  `;
}

function renderEfficiencyCard(efficiency, fxRates) {
  const periods = [
    ['Heute', efficiency.today],
    ['Woche', efficiency.week],
    ['Monat', efficiency.month],
    ['Gesamt', efficiency.allTime]
  ];

  const tiles = periods.map(([label, period]) => `
    <div class="efficiency-tile">
      <div class="efficiency-label">${label}</div>
      <div class="efficiency-value">${fmtEfficiencyHourlyEur(period, fxRates)}</div>
      <div class="efficiency-basis">
        ${fmtStudyCount(period.sampleCount)} &middot; ${fmtDuration(period.secondsTotal)}
      </div>
    </div>
  `).join('');

  return `
    <div class="status-box">
      <h3>Effizienz / Stundenlohn</h3>
      <div class="efficiency-grid">
        ${tiles}
      </div>
    </div>
  `;
}

function readWorktimePeriod(period) {
  return {
    paidSeconds: firstNumber(period, ['paid_seconds', 'paidSeconds']) ?? 0,
    unpaidSeconds: firstNumber(period, ['unpaid_seconds', 'unpaidSeconds']) ?? 0,
    totalSeconds: firstNumber(period, ['total_seconds', 'totalSeconds']) ?? 0,
    countPaid: firstNumber(period, ['count_paid', 'countPaid']) ?? 0,
    countUnpaid: firstNumber(period, ['count_unpaid', 'countUnpaid']) ?? 0,
    countTotal: firstNumber(period, ['count_total', 'countTotal']) ?? 0
  };
}

function readWorktimeStats(data) {
  const worktime = asObject(data.worktime || data.workTime);

  return {
    today: readWorktimePeriod(worktime.today),
    week: readWorktimePeriod(worktime.week),
    month: readWorktimePeriod(worktime.month),
    lastMonth: readWorktimePeriod(worktime.lastMonth || worktime.last_month),
    allTime: readWorktimePeriod(worktime.allTime || worktime.all_time)
  };
}

function renderWorktimeCards(worktime) {
  const periods = [
    ['ARBEITSZEIT HEUTE', worktime.today],
    ['ARBEITSZEIT DIESE WOCHE', worktime.week],
    ['ARBEITSZEIT DIESER MONAT', worktime.month],
    ['ARBEITSZEIT GESAMT', worktime.allTime]
  ];

  const tiles = periods.map(([label, period]) => {
    const unpaid = fmtWorktime(period.unpaidSeconds);
    const unpaidLine = period.unpaidSeconds > 0 && unpaid !== DASH
      ? `<div class="pending">Davon ${unpaid} unbezahlt</div>`
      : '';

    return `
      <div class="earning-tile">
        <div class="label">${label}</div>
        <div class="value">${fmtWorktime(period.paidSeconds)}</div>
        ${unpaidLine}
      </div>
    `;
  }).join('');

  return `<div class="earnings-grid worktime-grid">${tiles}</div>`;
}

function fmtEffectiveHourlyKpi(earningsPeriod, worktimePeriod, fxRates) {
  const paidSeconds = Number(readWorktimePeriod(worktimePeriod).paidSeconds);

  if (!Number.isFinite(paidSeconds) || paidSeconds <= 0) {
    return { rate: DASH, basis: DASH };
  }

  const earned = asObject(earningsPeriod?.earned);
  const eurMinor = convertToEur(earned, fxRates);

  if (eurMinor != null) {
    return {
      rate: fmtAmount(Math.round((eurMinor * 3600) / paidSeconds), 'EUR') + '/h',
      basis: `${fmtAmount(eurMinor, 'EUR')} in ${fmtWorktime(paidSeconds)}`
    };
  }

  const gbpMinor = currencyMinor(earned, 'GBP');

  if (gbpMinor == null) {
    return { rate: DASH, basis: DASH };
  }

  return {
    rate: fmtAmount(Math.round((gbpMinor * 3600) / paidSeconds), 'GBP') + '/h',
    basis: `${fmtAmount(gbpMinor, 'GBP')} in ${fmtWorktime(paidSeconds)}`
  };
}

function renderEffectiveHourlyKpis(earnings, worktime, fxRates) {
  const monthKpi = fmtEffectiveHourlyKpi(earnings.month, worktime.month, fxRates);
  const allTimeKpi = fmtEffectiveHourlyKpi(earnings.allTime, worktime.allTime, fxRates);

  return `
    <div class="effective-hourly-grid">
      <div class="earning-tile">
        <div class="label">EFFEKTIVER STUNDENLOHN MONAT</div>
        <div class="value">${monthKpi.rate}</div>
        <div class="secondary">${monthKpi.basis}</div>
      </div>
      <div class="earning-tile">
        <div class="label">EFFEKTIVER STUNDENLOHN GESAMT</div>
        <div class="value">${allTimeKpi.rate}</div>
        <div class="secondary">${allTimeKpi.basis}</div>
      </div>
    </div>
  `;
}

function fmtStudyRewardEur(study, fxRates) {
  const eurMinor = convertToEur({ [study.rewardCurrency || 'GBP']: study.rewardMinor }, fxRates);

  return eurMinor == null ? fmtAmount(study.rewardMinor, study.rewardCurrency) : fmtAmount(eurMinor, 'EUR');
}

function fmtStudyHourlyEur(study, fxRates) {
  if (study.hourlyRateMinor == null) return DASH;

  const eurMinor = convertToEur({ [study.rewardCurrency || 'GBP']: study.hourlyRateMinor }, fxRates);

  return (eurMinor == null ? fmtAmount(study.hourlyRateMinor, study.rewardCurrency) : fmtAmount(eurMinor, 'EUR')) + '/h';
}

function renderTopStudyList(items, mode, fxRates) {
  const list = items.slice(0, 5);

  if (list.length === 0) {
    return '<div class="loading">Keine Daten.</div>';
  }

  const rows = list.map((study, index) => {
    const reward = fmtStudyRewardEur(study, fxRates);
    const hourly = fmtStudyHourlyEur(study, fxRates);
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

function renderTopStudiesCard(topStudies, fxRates) {
  return `
    <div class="top-studies-grid">
      <div class="status-box">
        <h3>Top-Studien nach Gesamtvergütung</h3>
        ${renderTopStudyList(topStudies.byReward, 'reward', fxRates)}
      </div>
      <div class="status-box">
        <h3>Top-Studien nach Stundenlohn</h3>
        ${renderTopStudyList(topStudies.byHourly, 'hourly', fxRates)}
      </div>
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
  const countLabels = {
    studies: 'Studien',
    submissions: 'Teilnahmen',
    events: 'Ereignisse',
    syncLog: 'Sync-Log'
  };
  const countRows = ['studies', 'submissions', 'events', 'syncLog'].map(key => `
    <div class="health-item">
      <span>${escapeHtml(countLabels[key] || key)}</span>
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
  const fxRates = data.fxRates || data.fx_rates;
  const goals = asObject(data.goals);
  const dailyGoalMinor = readGoalMinor(goals, 'daily');
  const monthlyGoalMinor = readGoalMinor(goals, 'monthly');
  const dailyGoalEurMinor = readGoalEurMinor(goals, 'daily');
  const monthlyGoalEurMinor = readGoalEurMinor(goals, 'monthly');
  const todayGoalByCurrency = sumCurrencyMaps(today.earned, today.pending);
  const monthGoalByCurrency = sumCurrencyMaps(month.earned, month.pending);
  const todayGoalGbp = convertToGbpMinor(todayGoalByCurrency, fxRates) ?? sumCurrencyMinor('GBP', today.earned, today.pending);
  const monthGoalGbp = convertToGbpMinor(monthGoalByCurrency, fxRates) ?? sumCurrencyMinor('GBP', month.earned, month.pending);
  const todayGoalEur = convertToEur(todayGoalByCurrency, fxRates);
  const monthGoalEur = convertToEur(monthGoalByCurrency, fxRates);
  const balance = asObject(data.balance);
  const { availableByCurrency, pendingByCurrency } = extractProlificBalance(balance);
  const todayStats = readTodayStats(data, today);
  const monthStats = readMonthStats(data, month);
  const pendingStats = readPendingStats(data, allTime.pending, pendingByCurrency);
  const worktimeStats = readWorktimeStats(data);
  const efficiencyStats = readEfficiencyStats(data);
  const topStudies = readTopStudies(data);
  const statusCounts = normalizeStatusCounts(data.statusStats, data.submissionCounts);
  const statusTotal = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);
  const approvedCount = statusCount(statusCounts, ['APPROVED']);
  const rejectedCount = statusCount(statusCounts, ['REJECTED']) + statusCount(statusCounts, ['RETURNED']);
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
  const forecastEurCurrent = convertToEur(monthGoalByCurrency, fxRates);
  const forecastEurGoal = monthlyGoalEurMinor ?? convertGbpToEurMinor(monthlyGoalMinor, fxRates);
  const forecast = forecastEurCurrent != null
    ? {
      ...inferMonthlyForecast(
        {},
        forecastEurCurrent,
        forecastEurGoal,
        data.serverTime
      ),
      currency: 'EUR'
    }
    : {
      ...inferMonthlyForecast(
        asObject(data.forecast),
        monthGoalGbp,
        monthlyGoalMinor,
        data.serverTime
      ),
      currency: 'GBP'
    };
  const fmtForecast = (minor) => forecast.currency === 'EUR'
    ? fmtAmount(minor, 'EUR')
    : fmtGbpAsEur(minor, fxRates);
  const fmtSignedForecast = (minor) => forecast.currency === 'EUR'
    ? fmtSignedAmount(minor, 'EUR')
    : fmtSignedGbpAsEur(minor, fxRates);

  const tile = (label, earned, pending, subline, options = {}) => {
    const displayValue = options.includePending ? sumCurrencyMaps(earned, pending) : earned;

    return `
      <div class="earning-tile">
        <div class="label">${label}</div>
        <div class="value">${fmtMulti(displayValue)}</div>
        ${
          pending && Object.keys(pending).length > 0
            ? `<div class="pending">${options.includePending ? 'Davon ' : '+ '}${fmtMulti(pending)} ausstehend</div>`
            : ''
        }
        ${subline ? `<div class="pending">${escapeHtml(subline)}</div>` : ''}
      </div>
    `;
  };
  const comparisonTile = () => {
    const percent = monthComparisonPercent(month.earned, lastMonth.earned, fxRates);

    return `
      <div class="earning-tile comparison-tile">
        <div class="label">Entwicklung zum Vormonat</div>
        <div class="value comparison-value ${comparisonPercentClass(percent)}">${fmtComparisonPercent(percent)}</div>
        <div class="secondary">${fmtMulti(lastMonth.earned)}</div>
      </div>
    `;
  };

  let html = '<div class="earnings-grid">';

  html += tile('Heute', today.earned, today.pending, null, { includePending: true });
  html += tile('Diese Woche', week.earned, week.pending, null, { includePending: true });
  html += tile('Dieser Monat', month.earned, month.pending, null, { includePending: true });
  html += tile('Gesamt', allTime.earned, allTime.pending, null, { includePending: true });
  html += tile('Auszahlbar', availableByCurrency, null, fmtEur(convertToEur(availableByCurrency, fxRates)));
  html += tile('In Prüfung', pendingByCurrency, null, fmtEur(convertToEur(pendingByCurrency, fxRates)));
  html += renderExtraIncomeOverviewTile(data.extraIncome || data.extra_income);
  if (Object.keys(lastMonth.earned || {}).length) {
    html += comparisonTile();
  }
  html += '</div>';
  html += renderWorktimeCards(worktimeStats);
  html += renderEffectiveHourlyKpis(e, worktimeStats, fxRates);

  const extraIncomeSummary = readExtraIncomeSummary(data.extraIncome || data.extra_income);
  const todayDetailRows = renderGoalDetailRows(todayStats, fxRates) + renderExtraIncomeGoalRow(extraIncomeSummary.todayGrossCents);
  const monthDetailRows = renderGoalDetailRows(monthStats, fxRates) + renderExtraIncomeGoalRow(extraIncomeSummary.monthGrossCents);

  html += `
    <div class="goal-card-grid">
      ${renderGoalCard('Heute', todayGoalGbp, dailyGoalMinor, fxRates, todayDetailRows, { currentEurMinor: todayGoalEur, targetEurMinor: dailyGoalEurMinor })}
      ${renderGoalCard('Aktueller Monat', monthGoalGbp, monthlyGoalMinor, fxRates, monthDetailRows, { currentEurMinor: monthGoalEur, targetEurMinor: monthlyGoalEurMinor })}
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
    <div class="forecast-status-grid">
      <div class="status-box">
        <h3>Monatsprognose</h3>

        <div class="status-row">
          <span class="key">Aktuell</span>
          <span class="value">${fmtForecast(forecast.current)}</span>
        </div>

        <div class="status-row">
          <span class="key">Ø pro Tag</span>
          <span class="value">${fmtForecast(forecast.average)}</span>
        </div>

        <div class="status-row">
          <span class="key">Prognose Monatsende</span>
          <span class="value">${fmtForecast(forecast.projected)}</span>
        </div>

        <div class="status-row">
          <span class="key">Abweichung zum Ziel</span>
          <span class="value">${fmtSignedForecast(forecast.delta)}</span>
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
        <span class="key">Offene Summen</span>
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

  html += renderEfficiencyCard(efficiencyStats, fxRates);
  html += renderTopStudiesCard(topStudies, fxRates);

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

let statsHeatmapMonth = null;

function monthKeyFromDate(date) {
  if (!date || Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthKey(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})$/);

  if (!match) return null;

  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  const date = new Date(Number(match[1]), month - 1, 1);

  return Number.isNaN(date.getTime()) ? null : date;
}

function currentHeatmapMonthKey(serverTime) {
  const serverDate = serverTime ? new Date(serverTime) : null;

  if (serverDate && !Number.isNaN(serverDate.getTime())) {
    return monthKeyFromDate(serverDate);
  }

  return monthKeyFromDate(new Date());
}

function shiftMonthKey(value, offset) {
  const date = parseMonthKey(value);

  if (!date) return currentHeatmapMonthKey();

  date.setMonth(date.getMonth() + offset);

  return monthKeyFromDate(date);
}

function compareMonthKeys(a, b) {
  const dateA = parseMonthKey(a);
  const dateB = parseMonthKey(b);

  if (!dateA || !dateB) return 0;

  return dateA.getTime() - dateB.getTime();
}

function monthReferenceDate(days, serverTime, selectedMonthKey = null) {
  const selectedMonth = parseMonthKey(selectedMonthKey);

  if (selectedMonth) {
    return selectedMonth;
  }

  const serverDate = serverTime ? new Date(serverTime) : null;

  if (serverDate && !Number.isNaN(serverDate.getTime())) {
    return new Date(serverDate.getFullYear(), serverDate.getMonth(), 1);
  }

  const datedDays = days
    .map(day => parseDateKey(day.date))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());

  return datedDays[0] || new Date();
}

function heatmapTodayDate(serverTime) {
  const serverDate = serverTime ? new Date(serverTime) : null;

  if (serverDate && !Number.isNaN(serverDate.getTime())) {
    return new Date(serverDate.getFullYear(), serverDate.getMonth(), serverDate.getDate());
  }

  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function buildMonthHeatmapDays(days, serverTime, selectedMonthKey = null) {
  const reference = monthReferenceDate(days, serverTime, selectedMonthKey);
  const today = heatmapTodayDate(serverTime);
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

function renderHeatmap(days, fxRates, serverTime, selectedMonthKey = null) {
  if (!days.length && !serverTime) {
    return '<div class="loading">Keine Heatmap-Daten.</div>';
  }

  const currentMonthKey = currentHeatmapMonthKey(serverTime);
  const activeMonthKey = selectedMonthKey || statsHeatmapMonth || currentMonthKey;
  const monthDays = buildMonthHeatmapDays(days, serverTime, activeMonthKey);
  const maxValue = Math.max(...monthDays.map(day => chartValueMinor(day.earned, fxRates)), 0);
  const canGoNext = compareMonthKeys(activeMonthKey, currentMonthKey) < 0;

  return `
    <div class="heatmap">
      <div class="heatmap-header">
        <h3>Kalender-Heatmap</h3>
        <div class="heatmap-controls" aria-label="Monat ausw&auml;hlen">
          <button class="filter-icon heatmap-nav-btn" type="button" data-heatmap-nav="prev" aria-label="Vorheriger Monat">&lt;</button>
          <span class="heatmap-month-label">${escapeHtml(fmtMonthLabel(activeMonthKey))}</span>
          <button class="filter-icon heatmap-nav-btn" type="button" data-heatmap-nav="next" ${canGoNext ? '' : 'disabled'} aria-label="N&auml;chster Monat">&gt;</button>
          <button class="filter-reset heatmap-today-btn" type="button" data-heatmap-nav="today">Heute</button>
        </div>
      </div>
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

function renderStatsStudiesSection(studiesData, showAll = statsShowAllStudies) {
  if (!studiesData || !studiesData.ok) {
    return `
      <div class="status-box stats-studies-section">
        <h3>Studien</h3>
        <div class="loading">Studien konnten nicht geladen werden.</div>
      </div>
    `;
  }

  const activeStudies = renderStudies(studiesData, {
    filter: 'active',
    showPagination: false,
    emptyText: 'Keine aktiven Studien.'
  });
  const toggleButton = `<button id="statsShowAllStudies" class="filter-reset studies-show-all" type="button">${showAll ? 'Studien ausblenden' : 'Alle Studien anzeigen'}</button>`;
  const allStudies = showAll
    ? `
      <div class="stats-all-studies">
        ${renderStudiesFilterBar()}
        <div id="studiesContent">${renderStudies(studiesData)}</div>
      </div>
    `
    : '';

  return `
    <div class="status-box stats-studies-section">
      <h3>Studien</h3>
      <div class="stats-active-studies">
        ${activeStudies}
      </div>
      ${toggleButton}
      ${allStudies}
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
  const reportEfficiency = readEfficiencyPeriod(reportHourly);
  const reportStatusCounts = normalizeStatusCounts(report.statusCounts || report.status_counts, {});
  const dailyStats = readDailyStats(data);
  const studiesData = data.studiesData || data.studies_data || cachedData.studies;

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
        <span class="value">${fmtEfficiencyHourlyEur(reportEfficiency, fxRates)}</span>
      </div>
      <div class="status-row">
        <span class="key">Studien</span>
        <span class="value">${fmtStudyCount(reportEfficiency.sampleCount)}</span>
      </div>
      <div class="status-row">
        <span class="key">Arbeitszeit</span>
        <span class="value">${fmtDuration(reportEfficiency.secondsTotal)}</span>
      </div>
      ${statusRows}
      ${renderTopStudyList(report.topStudies || report.top_studies, 'reward')}
      <div class="status-row">
        <span class="key">CSV Export</span>
        <span class="value"><a href="/api/export.php?type=submissions&amp;format=csv">Teilnahmen exportieren</a></span>
      </div>
    </div>

    ${renderDailyStatsCard(dailyStats, fxRates)}

    ${renderStatsStudiesSection(studiesData)}
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
  `;
}

function renderCurrencySettingsCard(data) {
  const fxRates = data.fxRates || data.fx_rates;
  const fx = readFxRates(fxRates);
  const fxStatus = fxRateFor(fx.rates, 'EUR')
    ? `aktiv (${escapeHtml(fx.base)} &rarr; EUR)`
    : 'nicht verf&uuml;gbar';

  return `
    <div class="status-box">
      <h3>W&auml;hrungen</h3>
      <div class="status-row">
        <span class="key">FX-Rates</span>
        <span class="value">${fxStatus}</span>
      </div>
      <div class="status-row">
        <span class="key">Serverzeit</span>
        <span class="value">${fmtDateTime(data.serverTime || data.server_time || firstDefined(asObject(data.system), ['serverTime', 'server_time']))}</span>
      </div>
      <div class="status-row">
        <span class="key">CSV Export</span>
        <span class="value"><a href="/api/export.php?type=submissions&amp;format=csv">Teilnahmen exportieren</a></span>
      </div>
    </div>
  `;
}

function renderTelegramBotCard(telegram) {
  const bot = asObject(telegram);
  const commands = Array.isArray(bot.commands) ? bot.commands : [];
  const lastCommand = asObject(firstDefined(bot, ['lastCommand', 'last_command']));
  const webhookOk = firstBoolean(bot, ['webhookOk', 'webhook_ok']) === true;
  const configured = firstBoolean(bot, ['configured']) === true;
  const lastError = firstDefined(bot, ['lastErrorMessage', 'last_error_message', 'error']);
  const isActive = configured && webhookOk && !lastError;
  const statusLabel = isActive ? 'aktiv' : configured ? 'prüfen' : 'nicht eingerichtet';
  const lastCommandName = firstDefined(lastCommand, ['command', 'text']) || DASH;
  const lastCommandAt = firstDefined(lastCommand, ['received_at', 'receivedAt']);
  let commandItems = commands.map(commandRaw => {
    const command = asObject(commandRaw);
    const name = firstDefined(command, ['command', 'name']) || DASH;
    const description = firstDefined(command, ['description', 'label']) || '';
    const inputMode = firstDefined(command, ['input', 'inputMode', 'input_mode']) || 'none';
    const fields = Array.isArray(command.fields) ? command.fields : [];
    const needsInput = inputMode !== 'none' || fields.length > 0 || name === '/delete_logs';

    return `
      <button type="button"
              class="telegram-command-item"
              data-telegram-command="${escapeHtml(name)}"
              data-telegram-input="${escapeHtml(inputMode)}"
              aria-haspopup="${needsInput ? 'dialog' : 'false'}">
        <span class="telegram-command-name">${escapeHtml(name)}</span>
        <span>${escapeHtml(description)}</span>
      </button>
    `;
  }).join('');
  const statusHtml = telegramCommandStatus
    ? `<div class="telegram-command-status ${telegramCommandStatus.ok ? 'is-ok' : 'is-error'}">${escapeHtml(telegramCommandStatus.message)}</div>`
    : '';

  if (statusHtml) {
    commandItems += statusHtml;
  }

  return `
    <div class="status-box telegram-bot-card">
      <h3>Telegram-Bot</h3>
      <div class="health-grid">
        <div class="health-item">
          <span>Bot aktiv</span>
          <span class="${isActive ? 'status-good' : 'status-warn'}">${escapeHtml(statusLabel)}</span>
        </div>
        <div class="health-item">
          <span>Webhook</span>
          <span>${webhookOk ? 'OK' : 'prüfen'}</span>
        </div>
        <div class="health-item">
          <span>Updates offen</span>
          <span>${fmtCount(firstNumber(bot, ['pendingUpdateCount', 'pending_update_count']))}</span>
        </div>
        <div class="health-item">
          <span>Befehle 24h</span>
          <span>${fmtCount(firstNumber(bot, ['commandCount24h', 'command_count_24h']))}</span>
        </div>
        <div class="health-item">
          <span>Letzter Befehl</span>
          <span>${escapeHtml(lastCommandName)}</span>
        </div>
        <div class="health-item">
          <span>Empfangen</span>
          <span>${lastCommandAt ? fmtTimestamp(lastCommandAt) : DASH}</span>
        </div>
        <div class="health-item telegram-health-wide">
          <span>Letzter Fehler</span>
          <span>${lastError ? escapeHtml(lastError) : 'keiner'}</span>
        </div>
      </div>
      <div class="telegram-command-list" aria-label="Telegram-Befehle">
        <div class="telegram-command-list-title">Befehle</div>
        ${commandItems || '<div class="loading">Keine Befehle verfügbar.</div>'}
      </div>
    </div>
  `;
}

function telegramCommandDefinitions() {
  const telegram = asObject(asObject(cachedData.system).telegram || asObject(cachedData.system).telegram_bot);
  return Array.isArray(telegram.commands) ? telegram.commands.map(asObject) : [];
}

function findTelegramCommandDefinition(commandName) {
  return telegramCommandDefinitions().find(command => (
    firstDefined(command, ['command', 'name']) === commandName
  )) || { command: commandName };
}

function inferTelegramCommandFields(commandName) {
  if (commandName === '/setgoal') {
    return [
      {
        name: 'target',
        label: 'Ziel',
        type: 'select',
        options: [
          { value: 'day', label: 'Tagesziel' },
          { value: 'month', label: 'Monatsziel' }
        ]
      },
      { name: 'amount', label: 'Betrag', type: 'number', min: 0, step: '0.01', suffix: 'EUR' }
    ];
  }

  if (commandName === '/sethourly') {
    return [
      {
        name: 'level',
        label: 'Grenze',
        type: 'select',
        options: [
          { value: 'good', label: 'Sehr gut' },
          { value: 'ok', label: 'Okay' }
        ]
      },
      { name: 'amount', label: 'Betrag', type: 'number', min: 0, step: '0.01', suffix: 'EUR/h' }
    ];
  }

  if (commandName === '/report') {
    return [
      {
        name: 'mode',
        label: 'Modus',
        type: 'select',
        options: [
          { value: 'on', label: 'Aktivieren' },
          { value: 'off', label: 'Deaktivieren' }
        ]
      },
      { name: 'time', label: 'Uhrzeit', type: 'time', optionalWhen: { mode: 'off' } }
    ];
  }

  if (commandName === '/mute') {
    return [
      {
        name: 'duration',
        label: 'Dauer',
        type: 'select',
        options: [
          { value: '30m', label: '30 Minuten' },
          { value: '1h', label: '1 Stunde' },
          { value: '2h', label: '2 Stunden' },
          { value: '4h', label: '4 Stunden' },
          { value: 'today', label: 'Bis Tagesende' }
        ]
      }
    ];
  }

  return [];
}

function telegramCommandFields(definition) {
  const fields = Array.isArray(definition.fields) ? definition.fields : [];

  if (fields.length > 0) {
    return fields.map(asObject);
  }

  return inferTelegramCommandFields(firstDefined(definition, ['command', 'name']) || '');
}

function telegramCommandNeedsModal(definition) {
  const commandName = firstDefined(definition, ['command', 'name']) || '';
  const inputMode = firstDefined(definition, ['input', 'inputMode', 'input_mode']) || 'none';

  return commandName === '/delete_logs' || inputMode !== 'none' || telegramCommandFields(definition).length > 0;
}

function renderTelegramCommandField(field) {
  const type = firstDefined(field, ['type']) || 'text';
  const name = firstDefined(field, ['name']) || '';
  const label = firstDefined(field, ['label']) || name;
  const suffix = firstDefined(field, ['suffix']) || '';
  const options = Array.isArray(field.options) ? field.options : [];

  if (type === 'select') {
    return `
      <label class="telegram-modal-field">
        <span>${escapeHtml(label)}</span>
        <select name="${escapeHtml(name)}">
          ${options.map(optionRaw => {
            const option = typeof optionRaw === 'string' ? { value: optionRaw, label: optionRaw } : asObject(optionRaw);
            const value = firstDefined(option, ['value']) || '';
            const optionLabel = firstDefined(option, ['label']) || value;

            return `<option value="${escapeHtml(value)}">${escapeHtml(optionLabel)}</option>`;
          }).join('')}
        </select>
      </label>
    `;
  }

  const inputType = type === 'time' || type === 'number' ? type : 'text';
  const min = firstDefined(field, ['min']);
  const step = firstDefined(field, ['step']) || (inputType === 'number' ? '0.01' : null);

  return `
    <label class="telegram-modal-field">
      <span>${escapeHtml(label)}</span>
      <span class="telegram-input-wrap">
        <input name="${escapeHtml(name)}"
               type="${escapeHtml(inputType)}"
               ${min != null ? `min="${escapeHtml(min)}"` : ''}
               ${step != null ? `step="${escapeHtml(step)}"` : ''}>
        ${suffix ? `<span>${escapeHtml(suffix)}</span>` : ''}
      </span>
    </label>
  `;
}

function composeTelegramCommandText(commandName, values) {
  if (commandName === '/setgoal') {
    return `${commandName} ${values.scope || values.target || 'day'} ${values.amount || ''}`.trim();
  }

  if (commandName === '/sethourly') {
    return `${commandName} ${values.scope || values.level || 'ok'} ${values.amount || ''}`.trim();
  }

  if (commandName === '/report') {
    return values.mode === 'off'
      ? `${commandName} off`
      : `${commandName} on ${values.time || ''}`.trim();
  }

  if (commandName === '/mute') {
    return `${commandName} ${values.duration || '1h'}`.trim();
  }

  return commandName;
}

function closeTelegramCommandModal() {
  const modal = $('telegramCommandModal');

  if (modal) {
    modal.remove();
  }
}

function setTelegramCommandStatus(ok, message) {
  telegramCommandStatus = { ok, message };
  const status = document.querySelector('.telegram-command-status');

  if (status) {
    status.className = `telegram-command-status ${ok ? 'is-ok' : 'is-error'}`;
    status.textContent = message;
    return;
  }

  const commandList = document.querySelector('.telegram-command-list');

  if (commandList) {
    commandList.insertAdjacentHTML(
      'beforeend',
      `<div class="telegram-command-status ${ok ? 'is-ok' : 'is-error'}">${escapeHtml(message)}</div>`
    );
  }
}

async function sendTelegramCommand(commandName, values = {}) {
  const text = composeTelegramCommandText(commandName, values);
  setTelegramCommandStatus(true, `${text} wird gesendet ...`);

  try {
    const result = await postJson(`${API_BASE}?type=telegramCommand`, {
      command: commandName,
      values,
      text
    });

    if (!result || result.ok === false) {
      throw new Error(firstDefined(asObject(result), ['error', 'message']) || 'Befehl konnte nicht gesendet werden.');
    }

    setTelegramCommandStatus(true, `${text} wurde an Telegram gesendet.`);

    if (cachedData.system) {
      cachedData.system.telegram = {
        ...asObject(cachedData.system.telegram || cachedData.system.telegram_bot),
        lastCommand: { command: text, received_at: new Date().toISOString() }
      };
    }

    return result;
  } catch (error) {
    setTelegramCommandStatus(false, error.message || 'Befehl konnte nicht gesendet werden.');
    throw error;
  }
}

function openTelegramCommandModal(definition) {
  const commandName = firstDefined(definition, ['command', 'name']) || '';
  const fields = telegramCommandFields(definition);
  const isConfirm = commandName === '/delete_logs'
    || firstDefined(definition, ['input', 'inputMode', 'input_mode']) === 'confirm';

  closeTelegramCommandModal();

  const modal = document.createElement('div');
  modal.id = 'telegramCommandModal';
  modal.className = 'telegram-modal-backdrop';
  modal.innerHTML = `
    <div class="telegram-modal" role="dialog" aria-modal="true" aria-labelledby="telegramCommandModalTitle">
      <div class="telegram-modal-head">
        <h3 id="telegramCommandModalTitle">${escapeHtml(commandName)}</h3>
        <button type="button" class="telegram-modal-close" data-telegram-modal-close aria-label="Schliessen">x</button>
      </div>
      <form id="telegramCommandForm">
        ${isConfirm ? '<p class="telegram-modal-copy">Diesen Befehl wirklich an Telegram senden?</p>' : ''}
        ${fields.map(renderTelegramCommandField).join('')}
        <div class="telegram-modal-actions">
          <button type="button" class="secondary-btn" data-telegram-modal-close>Abbrechen</button>
          <button type="submit" class="primary-btn">Senden</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const firstInput = modal.querySelector('select, input, button[type="submit"]');
  if (firstInput) firstInput.focus();

  modal.addEventListener('click', event => {
    if (event.target === modal || event.target.closest('[data-telegram-modal-close]')) {
      closeTelegramCommandModal();
    }
  });

  const form = $('telegramCommandForm');
  form.addEventListener('submit', async event => {
    event.preventDefault();

    const values = {};
    fields.forEach(fieldRaw => {
      const field = asObject(fieldRaw);
      const name = firstDefined(field, ['name']);
      const input = name ? form.elements[name] : null;

      if (input) {
        values[name] = input.value;
      }
    });

    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;

    try {
      await sendTelegramCommand(commandName, values);
      closeTelegramCommandModal();
    } catch (error) {
      if (submit) submit.disabled = false;
    }
  });
}

function bindTelegramCommandControls() {
  const systemContent = $('systemContent');

  if (!systemContent || systemContent.dataset.telegramBound === '1') return;

  systemContent.dataset.telegramBound = '1';
  systemContent.addEventListener('click', event => {
    const button = event.target && event.target.closest
      ? event.target.closest('[data-telegram-command]')
      : null;

    if (!button) return;

    const commandName = button.dataset.telegramCommand;
    const definition = findTelegramCommandDefinition(commandName);

    if (telegramCommandNeedsModal(definition)) {
      openTelegramCommandModal(definition);
      return;
    }

    button.disabled = true;
    sendTelegramCommand(commandName)
      .catch(() => {})
      .finally(() => {
        button.disabled = false;
      });
  });
}

function renderSystem(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  const system = asObject(data.system || data);
  const systemHealth = readSystemHealth(data.system ? data : { ...data, system });
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
    ['Ereignisse in DB', firstNumber(dbCounts, ['events', 'event_count', 'eventCount'])],
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
    ${renderTelegramBotCard(data.telegram || data.telegram_bot)}
    ${renderCurrencySettingsCard(data)}
    ${renderSystemHealthCard(systemHealth)}
    ${renderEvents(data)}
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
  const prefix = options.prefix || '£';

  return `
    <label class="setting-control" for="${escapeHtml(options.id)}">
      <span class="setting-main">
        <span>
          <span class="setting-label">${escapeHtml(options.label)}</span>
          <span class="setting-hint">${escapeHtml(options.hint)}</span>
        </span>
        <span class="setting-value-field">
          <span class="setting-prefix">${escapeHtml(prefix)}</span>
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
  const fxRates = data.fxRates || data.fx_rates;
  const useEurSettings = canConvertGbpEur(fxRates);
  const settingsPrefix = useEurSettings ? '€' : '£';
  const settingsMinor = (group, gbpKey, eurKey) => {
    const gbpMinor = firstNumber(group, [gbpKey]);

    if (!useEurSettings) return gbpMinor;

    return firstNumber(group, [eurKey]) ?? convertGbpToEurMinor(gbpMinor, fxRates);
  };

  return `
    <div class="settings-stack">
    <form id="settingsForm" class="settings-form" data-settings-currency="${useEurSettings ? 'EUR' : 'GBP'}" novalidate>
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
          valueMinor: settingsMinor(goals, 'daily_gbp_minor', 'daily_eur_minor'),
          prefix: settingsPrefix,
          max: useEurSettings ? 60 : 50,
          step: 0.25
        })}
        ${renderSettingsControl({
          id: 'settingsMonthlyGoal',
          field: 'monthly_gbp',
          label: 'Monatsziel',
          hint: 'Zielwert für Prognose und Fortschritt',
          valueMinor: settingsMinor(goals, 'monthly_gbp_minor', 'monthly_eur_minor'),
          prefix: settingsPrefix,
          max: useEurSettings ? 1200 : 1000,
          step: 1
        })}
        ${renderSettingsControl({
          id: 'settingsGreatHourly',
          field: 'great_hourly_gbp',
          label: 'Sehr guter Stundenlohn',
          hint: 'Ab hier bekommen Studien das Tag Sehr gut',
          valueMinor: settingsMinor(thresholds, 'great_hourly_gbp_minor', 'great_hourly_eur_minor'),
          prefix: settingsPrefix,
          max: useEurSettings ? 100 : 80,
          step: 0.5
        })}
        ${renderSettingsControl({
          id: 'settingsOkHourly',
          field: 'ok_hourly_gbp',
          label: 'Okay-Stundenlohn',
          hint: 'Unter diesem Wert gilt eine Studie als niedrig',
          valueMinor: settingsMinor(thresholds, 'ok_hourly_gbp_minor', 'ok_hourly_eur_minor'),
          prefix: settingsPrefix,
          max: useEurSettings ? 60 : 50,
          step: 0.5
        })}
      </div>
    </form>
    </div>
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
  const settingsFxRates = cachedData.settings?.fxRates || cachedData.settings?.fx_rates;
  const settingsUseEur = form.dataset.settingsCurrency === 'EUR';
  const inputToStoredMinor = value => {
    const minor = inputToMinor(value);

    if (!settingsUseEur) return minor;

    return convertEurToGbpMinor(minor, settingsFxRates) ?? minor;
  };
  const inputToDisplayMinor = value => settingsUseEur ? inputToMinor(value) : null;

  const collectPayload = () => {
    const payload = {
      currency: settingsUseEur ? 'EUR' : 'GBP',
      settings: {
        goals: {
          daily_gbp_minor: inputToStoredMinor(inputFor('daily_gbp')?.value),
          monthly_gbp_minor: inputToStoredMinor(inputFor('monthly_gbp')?.value),
          daily_eur_minor: inputToDisplayMinor(inputFor('daily_gbp')?.value),
          monthly_eur_minor: inputToDisplayMinor(inputFor('monthly_gbp')?.value)
        },
        thresholds: {
          great_hourly_gbp_minor: inputToStoredMinor(inputFor('great_hourly_gbp')?.value),
          ok_hourly_gbp_minor: inputToStoredMinor(inputFor('ok_hourly_gbp')?.value),
          great_hourly_eur_minor: inputToDisplayMinor(inputFor('great_hourly_gbp')?.value),
          ok_hourly_eur_minor: inputToDisplayMinor(inputFor('ok_hourly_gbp')?.value)
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

function studyDatePart(value) {
  const raw = String(value || '');
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);

  return match ? match[1] : '';
}

function normalizedStudyDateRange(from, to) {
  let start = studyDatePart(from);
  let end = studyDatePart(to);

  if (start && end && start > end) {
    [start, end] = [end, start];
  }

  return { start, end };
}

function studyInDateRange(study, from, to) {
  const { start, end } = normalizedStudyDateRange(from, to);

  if (!start && !end) return true;

  const date = studyDatePart(study?.first_seen || study?.firstSeen || study?.created_at || study?.createdAt);

  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;

  return true;
}

const STUDIES_PAGE_SIZE = 50;
let studiesVisibleLimit = STUDIES_PAGE_SIZE;
let statsShowAllStudies = false;

function resolveStudiesPageSize(value, total) {
  if (value === 'all') {
    return Math.max(0, Number(total) || 0);
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) && numeric > 0
    ? Math.round(numeric)
    : STUDIES_PAGE_SIZE;
}

function studiesPageSizeValue() {
  const el = $('studiesPageSize');

  return el ? el.value : String(STUDIES_PAGE_SIZE);
}

function currentStudiesVisibleLimit(total) {
  const value = studiesPageSizeValue();
  const pageSize = resolveStudiesPageSize(value, total);

  if (value === 'all') {
    return total;
  }

  return Math.min(total, Math.max(pageSize, studiesVisibleLimit || pageSize));
}

function resetStudiesPagination() {
  studiesVisibleLimit = STUDIES_PAGE_SIZE;
}

function renderStudiesPagination(visible, total) {
  if (total <= visible) {
    return `
      <div class="study-pagination">
        <span>${fmtCount(total)} von ${fmtCount(total)} Studien</span>
      </div>
    `;
  }

  const remaining = total - visible;
  const next = Math.min(STUDIES_PAGE_SIZE, remaining);

  return `
    <div class="study-pagination">
      <span>${fmtCount(visible)} von ${fmtCount(total)} Studien</span>
      <button id="studiesLoadMore" class="filter-reset" type="button">Weitere ${fmtCount(next)} laden</button>
    </div>
  `;
}

function renderStudiesFilterBar() {
  return `
    <div class="filter-bar studies-filter-bar">
      <label>Sortierung:
        <select id="studiesSort">
          <option value="firstSeenDesc">Neueste zuerst</option>
          <option value="firstSeenAsc">&Auml;lteste zuerst</option>
          <option value="rewardDesc">H&ouml;chste Verg&uuml;tung</option>
        </select>
      </label>

      <label>
        <select id="studiesFilter">
          <option value="all">Alle</option>
          <option value="active">Aktive</option>
          <option value="expired">Voll/Abgelaufen</option>
        </select>
      </label>

      <label>
        <select id="studiesPageSize">
          <option value="50" selected>50</option>
          <option value="all">Alle</option>
        </select>
      </label>

      <fieldset class="date-filter date-filter-popover" aria-label="Zeitraum">
        <legend>Zeitraum</legend>
        <button id="studiesDateToggle"
                class="filter-icon date-filter-toggle"
                type="button"
                aria-label="Zeitraum auswaehlen"
                aria-expanded="false"
                aria-controls="studiesDatePanel">&#128197;</button>
        <div id="studiesDatePanel" class="date-filter-panel" hidden>
          <label>Von
            <input id="studiesDateFrom" type="date">
          </label>
          <label>Bis
            <input id="studiesDateTo" type="date">
          </label>
          <button id="studiesDateReset" class="filter-reset" type="button">Zur&uuml;cksetzen</button>
        </div>
      </fieldset>
    </div>
  `;
}

function isStudyCurrentlyActive(study) {
  return study?.is_active == 1 && study?.expired != 1;
}

// ---- Renderer: Studien ----

function renderStudies(data, options = {}) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  let studies = [...(data.studies || [])];

  const filterEl = $('studiesFilter');
  const sortEl = $('studiesSort');
  const dateFromEl = $('studiesDateFrom');
  const dateToEl = $('studiesDateTo');

  const filter = options.filter || (filterEl ? filterEl.value : 'all');

  if (filter === 'active') {
    studies = studies.filter(isStudyCurrentlyActive);
  }

  if (filter === 'expired') {
    studies = studies.filter(s => s.expired == 1);
  }

  const dateFrom = dateFromEl ? dateFromEl.value : '';
  const dateTo = dateToEl ? dateToEl.value : '';

  if (dateFrom || dateTo) {
    studies = studies.filter(s => studyInDateRange(s, dateFrom, dateTo));
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
    return `<div class="loading">${escapeHtml(options.emptyText || 'Keine Studien.')}</div>`;
  }

  const totalCount = studies.length;
  const visibleLimit = options.showPagination === false
    ? totalCount
    : currentStudiesVisibleLimit(totalCount);
  const visibleStudies = studies.slice(0, visibleLimit);

  const studyCards = visibleStudies.map(s => {
    const tags = [];
    if ((s.times_notified || 0) > 1) {
      tags.push(`<span class="tag tag-times">${escapeHtml(s.times_notified)}× gesehen</span>`);
    }

    const qualityTag = renderStudyQualityTag(s);

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

        <div class="study-title">
          <div class="name">${escapeHtml(s.name || '(ohne Namen)')}</div>
          ${qualityTag}
        </div>
        <div class="study-detail-grid">${detailTiles.join('')}</div>
        ${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}
      </div>
    `;
  }).join('');

  return studyCards + (options.showPagination === false ? '' : renderStudiesPagination(visibleStudies.length, totalCount));
}

// ---- Renderer: Submissions ----

const SUBMISSIONS_PAGE_SIZE = 50;
let submissionsVisibleLimit = SUBMISSIONS_PAGE_SIZE;

function submissionDatePart(submission) {
  return studyDatePart(
    submission?.completed_at ||
    submission?.completedAt ||
    submission?.started_at ||
    submission?.startedAt ||
    submission?.created_at ||
    submission?.createdAt
  );
}

function submissionInDateRange(submission, from, to) {
  const { start, end } = normalizedStudyDateRange(from, to);

  if (!start && !end) return true;

  const date = submissionDatePart(submission);

  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;

  return true;
}

function normalizedSubmissionStatus(status) {
  return String(status || '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function submissionRewardMinor(submission) {
  return firstNumber(submission, [
    'effective_reward_amount_minor',
    'effectiveRewardAmountMinor',
    'reward_amount_minor',
    'rewardAmountMinor'
  ]) || 0;
}

function submissionsPageSizeValue() {
  const el = $('submissionsPageSize');

  return el ? el.value : String(SUBMISSIONS_PAGE_SIZE);
}

function currentSubmissionsVisibleLimit(total) {
  const value = submissionsPageSizeValue();
  const pageSize = resolveStudiesPageSize(value, total);

  if (value === 'all') {
    return total;
  }

  return Math.min(total, Math.max(pageSize, submissionsVisibleLimit || pageSize));
}

function resetSubmissionsPagination() {
  submissionsVisibleLimit = SUBMISSIONS_PAGE_SIZE;
}

function renderSubmissionsPagination(visible, total) {
  if (total <= visible) {
    return `
      <div class="study-pagination">
        <span>${fmtCount(total)} von ${fmtCount(total)} Teilnahmen</span>
      </div>
    `;
  }

  const remaining = total - visible;
  const next = Math.min(SUBMISSIONS_PAGE_SIZE, remaining);

  return `
    <div class="study-pagination">
      <span>${fmtCount(visible)} von ${fmtCount(total)} Teilnahmen</span>
      <button id="submissionsLoadMore" class="filter-reset" type="button">Weitere ${fmtCount(next)} laden</button>
    </div>
  `;
}

function submissionSummaryBuckets(submissions) {
  const buckets = [
    { key: 'approved', label: 'Approved', className: 'approved', count: 0, statuses: ['APPROVED'] },
    { key: 'pending', label: 'In Prüfung', className: 'pending', count: 0, statuses: ['AWAITING REVIEW', 'PENDING'] },
    { key: 'screened', label: 'Screened Out', className: 'screened', count: 0, statuses: ['SCREENED OUT'] },
    { key: 'returned', label: 'Returned / Timed-Out', className: 'returned', count: 0, statuses: ['RETURNED', 'REJECTED', 'TIMED OUT', 'TIMEDOUT'] }
  ];

  for (const submission of submissions) {
    const status = normalizedSubmissionStatus(submission.status);
    const bucket = buckets.find(item => item.statuses.includes(status));

    if (bucket) {
      bucket.count++;
    }
  }

  return buckets;
}

function renderSubmissionSummary(submissions) {
  const total = submissions.length;
  const buckets = submissionSummaryBuckets(submissions);
  let offset = 0;
  const colorMap = {
    approved: 'var(--success)',
    pending: 'var(--warn)',
    screened: '#22c55e',
    returned: 'var(--danger)'
  };

  const segments = buckets
    .filter(bucket => bucket.count > 0)
    .map(bucket => {
      const start = offset;
      const end = offset + (bucket.count / total) * 100;
      const size = Math.max(0, end - start);

      offset = end;

      return `
        <circle
          class="submission-pie-segment ${bucket.className}"
          cx="50"
          cy="50"
          r="36"
          pathLength="100"
          stroke="${colorMap[bucket.key]}"
          stroke-dasharray="${fmtSvgNumber(size)} ${fmtSvgNumber(100 - size)}"
          stroke-dashoffset="${fmtSvgNumber(-start)}"
        ></circle>
      `;
    });

  const tiles = buckets.map(bucket => {
    const percent = total > 0 ? (bucket.count / total) * 100 : 0;

    return `
      <div class="submission-summary-tile ${bucket.className}">
        <span class="summary-label">${escapeHtml(bucket.label)}</span>
        <strong>${fmtCount(bucket.count)}</strong>
        <span class="summary-share">${fmtPercent(percent)}</span>
      </div>
    `;
  }).join('');

  const legend = buckets.map(bucket => `
    <div class="submission-pie-legend-item ${bucket.className}">
      <span class="legend-dot"></span>
      <span>${escapeHtml(bucket.label)}</span>
      <strong>${fmtCount(bucket.count)}</strong>
    </div>
  `).join('');

  return `
    <div class="submission-summary-block">
      <div class="submission-summary-grid">
        ${tiles}
        <div class="submission-chart-card summary-wide">
          <div class="submission-pie" aria-label="Status-Verteilung der Teilnahmen">
            <svg class="submission-pie-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
              <circle class="submission-pie-track" cx="50" cy="50" r="36"></circle>
              ${segments.join('')}
            </svg>
            <span>${fmtCount(total)}</span>
          </div>
          <div class="submission-pie-legend">${legend}</div>
        </div>
      </div>
    </div>
  `;
}

function renderSubmissions(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  let subs = [...(data.submissions || [])];

  const filterEl = $('submissionsFilter');
  const sortEl = $('submissionsSort');
  const dateFromEl = $('submissionsDateFrom');
  const dateToEl = $('submissionsDateTo');
  const filter = filterEl ? filterEl.value : 'all';

  if (filter !== 'all') {
    const wantedStatus = normalizedSubmissionStatus(filter);
    subs = subs.filter(submission => normalizedSubmissionStatus(submission.status) === wantedStatus);
  }

  const dateFrom = dateFromEl ? dateFromEl.value : '';
  const dateTo = dateToEl ? dateToEl.value : '';

  if (dateFrom || dateTo) {
    subs = subs.filter(submission => submissionInDateRange(submission, dateFrom, dateTo));
  }

  const sort = sortEl ? sortEl.value : 'completedDesc';

  subs.sort((a, b) => {
    if (sort === 'completedAsc') {
      return new Date(a.completed_at || a.started_at || 0) - new Date(b.completed_at || b.started_at || 0);
    }

    if (sort === 'rewardDesc') {
      return submissionRewardMinor(b) - submissionRewardMinor(a);
    }

    return new Date(b.completed_at || b.started_at || 0) - new Date(a.completed_at || a.started_at || 0);
  });

  if (subs.length === 0) {
    return '<div class="loading">Keine Teilnahmen.</div>';
  }

  const totalCount = subs.length;
  const visibleLimit = currentSubmissionsVisibleLimit(totalCount);
  const visibleSubs = subs.slice(0, visibleLimit);

  const rows = visibleSubs.map(s => {
    const statusKey = (s.status || '')
      .replace(/[\s-]/g, '')
      .substring(0, 8)
      .toUpperCase();

    const statusClass = 'status-' + statusKey;
    const minutes = s.time_taken_seconds ? Math.round(s.time_taken_seconds / 60) : null;
    const rewardMinor = firstNumber(s, [
      'effective_reward_amount_minor',
      'effectiveRewardAmountMinor',
      'reward_amount_minor',
      'rewardAmountMinor'
    ]);

    return `
      <div class="submission-card">
        <div class="name">${escapeHtml(s.study_name || '(ohne Namen)')}</div>

        <div class="meta">
          <span class="status ${escapeHtml(statusClass)}">${escapeHtml(s.status || '?')}</span>
          · <span class="reward">${fmtAmount(rewardMinor, s.reward_currency)}</span>
          ${minutes ? ` · ${escapeHtml(minutes)} Min` : ''}
        </div>

        <div class="study-time">
          ${s.started_at ? '🕒 Start: ' + fmtDateTime(s.started_at) : ''}
          ${s.completed_at ? ' · Ende: ' + fmtDateTime(s.completed_at) : ''}
        </div>
      </div>
    `;
  }).join('');

  return renderSubmissionSummary(subs) + rows + renderSubmissionsPagination(visibleSubs.length, totalCount);
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

  return events.slice(0, 10).map(e => `
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

function setPanelLoading(panel, isLoading) {
  if (!panel) return;

  panel.classList.toggle('is-loading', Boolean(isLoading));
  panel.setAttribute('aria-busy', isLoading ? 'true' : 'false');
}

function setRefreshButtonLoading(isLoading) {
  const button = $('refreshBtn');

  if (!button) return;

  button.classList.toggle('is-refreshing', Boolean(isLoading));
  button.disabled = Boolean(isLoading);
  button.setAttribute('aria-busy', isLoading ? 'true' : 'false');
}

async function loadExtraIncome(options = {}) {
  const panel = $('panel-extra-income');
  const container = $('extraIncomeContent');

  if (!container) return;

  if (options.showPageLoader) {
    setPanelLoading(panel, true);
  }

  try {
    const data = await fetchData('extraIncome');

    if (!data) return;

    cachedData.extraIncome = data;
    container.innerHTML = renderExtraIncome(data);
    container.classList.remove('loading');
    bindExtraIncomeControls();
  } catch (e) {
    container.innerHTML = `<div class="error">Fehler beim Laden: ${escapeHtml(e.message)}</div>`;
    container.classList.remove('loading');
  } finally {
    if (options.showPageLoader) {
      setPanelLoading(panel, false);
    }
  }
}

async function loadTab(tab, options = {}) {
  const panel = $(`panel-${tab}`);

  if (!panel) return;

  const contentIds = {
    'extra-income': 'extraIncomeContent'
  };
  const container = panel.querySelector(`#${contentIds[tab] || `${tab}Content`}`);

  if (!container) return;

  if (tab === 'extra-income') {
    await loadExtraIncome(options);
    return;
  }

  const renderers = {
    overview: renderOverview,
    studies: renderStudies,
    submissions: renderSubmissions,
    stats: renderStats,
    account: renderAccount,
    system: renderSystem,
    settings: renderSettings,
    'extra-income': renderExtraIncome
  };

  if (options.showPageLoader) {
    setPanelLoading(panel, true);
  }

  try {
    const data = await fetchData(tab);

    if (!data) {
      return;
    }

    if (tab === 'stats') {
      const studiesData = await fetchData('studies');
      data.studiesData = studiesData;
      cachedData.studies = studiesData;
    }

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

    if (tab === 'system') {
      bindTelegramCommandControls();
    }

    if (tab === 'stats') {
      bindStudiesControls();
    }
  } catch (e) {
    container.innerHTML = `<div class="error">Fehler beim Laden: ${escapeHtml(e.message)}</div>`;
    container.classList.remove('loading');
  } finally {
    if (options.showPageLoader) {
      setPanelLoading(panel, false);
    }
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
  refreshBtn.addEventListener('click', async () => {
    const active = document.querySelector('.tab.is-active');

    if (active) {
      setRefreshButtonLoading(true);
      try {
        await loadTab(active.dataset.tab, { showPageLoader: true });
      } finally {
        setRefreshButtonLoading(false);
      }
    }
  });
}

function refreshStudiesList(options = {}) {
  if (options.resetPage) {
    resetStudiesPagination();
  }

  if (cachedData.studies) {
    const studiesContent = $('studiesContent');

    if (studiesContent) {
      studiesContent.innerHTML = renderStudies(cachedData.studies);
    }
  }
}

function setStudiesDatePanelOpen(isOpen) {
  const studiesDateToggle = $('studiesDateToggle');
  const studiesDatePanel = $('studiesDatePanel');

  if (!studiesDateToggle || !studiesDatePanel) return;

  studiesDatePanel.hidden = !isOpen;

  if (isOpen) {
    studiesDateToggle.setAttribute('aria-expanded', 'true');
  } else {
    studiesDateToggle.setAttribute('aria-expanded', 'false');
  }
}

function rerenderStatsContent() {
  const statsContent = $('statsContent');

  if (statsContent && cachedData.stats) {
    statsContent.innerHTML = renderStats(cachedData.stats);
    bindStudiesControls();
  }
}

function bindStudiesControls() {
  ['studiesSort', 'studiesFilter', 'studiesPageSize', 'studiesDateFrom', 'studiesDateTo'].forEach(id => {
    const el = $(id);

    if (!el || el.dataset.bound === '1') return;

    el.dataset.bound = '1';
    el.addEventListener('change', () => refreshStudiesList({ resetPage: true }));
    el.addEventListener('input', () => refreshStudiesList({ resetPage: true }));
  });

  const studiesDateToggle = $('studiesDateToggle');
  const studiesDatePanel = $('studiesDatePanel');

  if (studiesDateToggle && studiesDatePanel && studiesDateToggle.dataset.bound !== '1') {
    studiesDateToggle.dataset.bound = '1';
    studiesDateToggle.addEventListener('click', event => {
      event.stopPropagation();

      const shouldOpen = studiesDatePanel.hidden;
      setStudiesDatePanelOpen(shouldOpen);

      if (shouldOpen) {
        const studiesDateFrom = $('studiesDateFrom');

        if (studiesDateFrom && typeof studiesDateFrom.showPicker === 'function') {
          try {
            studiesDateFrom.showPicker();
          } catch (error) {
            studiesDateFrom.focus();
          }
        } else if (studiesDateFrom) {
          studiesDateFrom.focus();
        }
      }
    });
  }

  if (studiesDatePanel && studiesDatePanel.dataset.bound !== '1') {
    studiesDatePanel.dataset.bound = '1';
    studiesDatePanel.addEventListener('click', event => {
      event.stopPropagation();
    });
  }

  const studiesDateReset = $('studiesDateReset');

  if (studiesDateReset && studiesDateReset.dataset.bound !== '1') {
    studiesDateReset.dataset.bound = '1';
    studiesDateReset.addEventListener('click', () => {
      const from = $('studiesDateFrom');
      const to = $('studiesDateTo');

      if (from) from.value = '';
      if (to) to.value = '';

      refreshStudiesList({ resetPage: true });
    });
  }

  const statsContent = $('statsContent');

  if (statsContent && statsContent.dataset.studiesBound !== '1') {
    statsContent.dataset.studiesBound = '1';
    statsContent.addEventListener('click', event => {
      const target = event.target;

      if (!target) return;

      const directHeatmapNav = target.dataset ? target.dataset.heatmapNav : null;
      const heatmapButton = directHeatmapNav ? target : (target.closest ? target.closest('[data-heatmap-nav]') : null);
      if (heatmapButton && heatmapButton.dataset.heatmapNav) {
        if (heatmapButton.disabled) return;

        const currentMonth = currentHeatmapMonthKey(cachedData.stats?.serverTime || cachedData.stats?.server_time);
        const activeMonth = statsHeatmapMonth || currentMonth;

        if (heatmapButton.dataset.heatmapNav === 'prev') {
          statsHeatmapMonth = shiftMonthKey(activeMonth, -1);
        } else if (heatmapButton.dataset.heatmapNav === 'next') {
          const nextMonth = shiftMonthKey(activeMonth, 1);
          statsHeatmapMonth = compareMonthKeys(nextMonth, currentMonth) > 0 ? currentMonth : nextMonth;
        } else if (heatmapButton.dataset.heatmapNav === 'today') {
          statsHeatmapMonth = currentHeatmapMonthKey(cachedData.stats?.serverTime || cachedData.stats?.server_time);
        }

        rerenderStatsContent();
        return;
      }

      if (target.id === 'statsShowAllStudies') {
        statsShowAllStudies = !statsShowAllStudies;
        resetStudiesPagination();
        rerenderStatsContent();
        return;
      }

      if (target.id === 'studiesLoadMore') {
        studiesVisibleLimit += STUDIES_PAGE_SIZE;
        refreshStudiesList();
      }
    });
  }
}

document.addEventListener('click', () => setStudiesDatePanelOpen(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    setStudiesDatePanelOpen(false);
    closeTelegramCommandModal();
    closeExtraIncomeStopModal();
  }
});

function refreshSubmissionsList(options = {}) {
  if (options.resetPage) {
    resetSubmissionsPagination();
  }

  if (cachedData.submissions) {
    const submissionsContent = $('submissionsContent');

    if (submissionsContent) {
      submissionsContent.innerHTML = renderSubmissions(cachedData.submissions);
    }
  }
}

['submissionsSort', 'submissionsFilter', 'submissionsPageSize', 'submissionsDateFrom', 'submissionsDateTo'].forEach(id => {
  const el = $(id);

  if (!el) return;

  el.addEventListener('change', () => refreshSubmissionsList({ resetPage: true }));
  el.addEventListener('input', () => refreshSubmissionsList({ resetPage: true }));
});

const submissionsDateToggle = $('submissionsDateToggle');
const submissionsDatePanel = $('submissionsDatePanel');

function setSubmissionsDatePanelOpen(isOpen) {
  if (!submissionsDateToggle || !submissionsDatePanel) return;

  submissionsDatePanel.hidden = !isOpen;

  if (isOpen) {
    submissionsDateToggle.setAttribute('aria-expanded', 'true');
  } else {
    submissionsDateToggle.setAttribute('aria-expanded', 'false');
  }
}

if (submissionsDateToggle && submissionsDatePanel) {
  submissionsDateToggle.addEventListener('click', event => {
    event.stopPropagation();

    const shouldOpen = submissionsDatePanel.hidden;
    setSubmissionsDatePanelOpen(shouldOpen);

    if (shouldOpen) {
      const submissionsDateFrom = $('submissionsDateFrom');

      if (submissionsDateFrom && typeof submissionsDateFrom.showPicker === 'function') {
        try {
          submissionsDateFrom.showPicker();
        } catch (error) {
          submissionsDateFrom.focus();
        }
      } else if (submissionsDateFrom) {
        submissionsDateFrom.focus();
      }
    }
  });

  submissionsDatePanel.addEventListener('click', event => {
    event.stopPropagation();
  });

  document.addEventListener('click', () => setSubmissionsDatePanelOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      setSubmissionsDatePanelOpen(false);
    }
  });
}

const submissionsDateReset = $('submissionsDateReset');

if (submissionsDateReset) {
  submissionsDateReset.addEventListener('click', () => {
    const from = $('submissionsDateFrom');
    const to = $('submissionsDateTo');

    if (from) from.value = '';
    if (to) to.value = '';

    refreshSubmissionsList({ resetPage: true });
  });
}

const submissionsContent = $('submissionsContent');

if (submissionsContent) {
  submissionsContent.addEventListener('click', event => {
    const target = event.target;

    if (!target || target.id !== 'submissionsLoadMore') return;

    submissionsVisibleLimit += SUBMISSIONS_PAGE_SIZE;
    refreshSubmissionsList();
  });
}

activateTab('overview');

setInterval(() => {
  const active = document.querySelector('.tab.is-active');

  if (active) {
    loadTab(active.dataset.tab);
  }
}, 60000);
