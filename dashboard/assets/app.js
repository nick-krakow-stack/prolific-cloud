// ============================================================
// Prolific Watcher Dashboard - JavaScript
// Lädt Daten von /api/data.php und rendert sie in die Tabs.
// ============================================================

const API_BASE = '/api/data.php';

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
  if (minor == null) return '–';

  const sym =
    currency === 'USD' ? '$' :
    currency === 'EUR' ? '€' :
    currency === 'GBP' ? '£' :
    currency + ' ';

  return sym + (minor / 100).toFixed(2).replace('.', ',');
}

function fmtMulti(byCurrency) {
  if (!byCurrency || Object.keys(byCurrency).length === 0) return '–';

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

  return parts.length ? parts.join(' + ') : '–';
}

function fmtDateTime(iso) {
  if (!iso) return '–';

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return '–';

  return d.toLocaleString('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function fmtTimestamp(iso) {
  if (!iso) return '–';

  const then = new Date(iso);

  if (Number.isNaN(then.getTime())) return '–';

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
  if (!iso) return '–';

  const then = new Date(iso);

  if (Number.isNaN(then.getTime())) return '–';

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

function extractCurrencyMap(source) {
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

      addCurrencyAmount(result, currency, value, false);
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
        addCurrencyAmount(result, currency, value, false);
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

        addCurrencyAmount(result, nestedCurrency, nestedValue, false);
      }
    }
  }

  return result;
}

function mergeCurrencyMap(target, source) {
  const extracted = extractCurrencyMap(source);

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

  const availableCandidates = [
    // Deine echte aktuelle Struktur
    balance.approved_per_currency,

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

  const pendingCandidates = [
    // Deine echte aktuelle Struktur
    balance.pending_per_currency,

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
    el.title = 'Noch kein Sync';
    return;
  }

  const lastSyncDate = new Date(lastSyncAt);

  if (Number.isNaN(lastSyncDate.getTime())) {
    el.title = 'Letzter Sync unbekannt';
    return;
  }

  const ageMin = (new Date() - lastSyncDate) / 60000;

  el.title = 'Letzter Sync: ' + fmtTimeAgo(lastSyncAt);

  if (ageMin < 10) {
    el.classList.add('is-fresh');
  } else if (ageMin < 60) {
    el.classList.add('is-stale');
  } else {
    el.classList.add('is-old');
  }
}

// ---- Renderer: Übersicht ----

function renderOverview(data) {
  if (!data || !data.ok) {
    return '<div class="error">Daten konnten nicht geladen werden.</div>';
  }

  const e = data.earnings || {};

  const today = e.today || {};
  const week = e.week || {};
  const month = e.month || {};
  const lastMonth = e.lastMonth || {};
  const allTime = e.allTime || {};

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

  if (data.balance) {
    const { availableByCurrency, pendingByCurrency } = extractProlificBalance(data.balance);

    html += `
      <div class="status-box">
        <h3>Prolific-Konto</h3>

        <div class="status-row">
          <span class="key">Auszahlbar</span>
          <span class="value">${fmtMulti(availableByCurrency)}</span>
        </div>

        <div class="status-row">
          <span class="key">In Prüfung</span>
          <span class="value">${fmtMulti(pendingByCurrency)}</span>
        </div>
      </div>
    `;
  }

  html += `
    <div class="status-box">
      <h3>System-Status</h3>

      <div class="status-row">
        <span class="key">Aktive Studien</span>
        <span class="value">${data.activeCount ?? 0}</span>
      </div>

      <div class="status-row">
        <span class="key">Letzter Sync</span>
        <span class="value">${data.lastSyncAt ? fmtTimeAgo(data.lastSyncAt) : '–'}</span>
      </div>
  `;

  if (data.submissionCounts) {
    const sc = data.submissionCounts;
    const total = Object.values(sc).reduce((a, b) => Number(a) + Number(b), 0);

    html += `
      <div class="status-row">
        <span class="key">Teilnahmen gesamt</span>
        <span class="value">${total}</span>
      </div>
    `;
  }

  html += '</div>';

  return html;
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