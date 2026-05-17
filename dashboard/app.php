<?php
declare(strict_types=1);

require_once __DIR__ . '/session.php';

require_login();
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Prolific Watcher Dashboard</title>

<link rel="stylesheet" href="/assets/style.css">
<link rel="icon" href="/favicon.ico" type="image/x-icon">

<meta name="theme-color" content="#1f2937">
</head>
<body>

<header class="topbar">
  <div class="topbar-content">
    <h1>🔬 Prolific Watcher</h1>
    <div class="topbar-actions">
      <span id="syncIndicator" class="sync-indicator" title="Letzter Sync"></span>
      <button id="refreshBtn" class="icon-btn" title="Aktualisieren" aria-label="Aktualisieren">
        <span class="icon-btn-symbol" aria-hidden="true">↻</span>
      </button>
      <a href="/logout.php" class="icon-btn" title="Abmelden">⎋</a>
    </div>
  </div>
</header>

<nav class="tabs">
  <button class="tab is-active" data-tab="overview">Übersicht</button>
  <button class="tab" data-tab="studies">Studien</button>
  <button class="tab" data-tab="submissions">Teilnahmen</button>
  <button class="tab" data-tab="stats">Statistiken</button>
  <button class="tab" data-tab="system">System</button>
  <button class="tab" data-tab="settings">Einstellungen</button>
</nav>

<main class="container">

  <!-- ÜBERSICHT -->
  <section class="tab-panel is-active" id="panel-overview">
    <div id="overviewContent" class="loading">Lade…</div>
  </section>

  <!-- STUDIEN -->
  <section class="tab-panel" id="panel-studies">
    <div class="filter-bar">
      <label>Sortierung:
        <select id="studiesSort">
          <option value="firstSeenDesc">Neueste zuerst</option>
          <option value="firstSeenAsc">Älteste zuerst</option>
          <option value="rewardDesc">Höchste Vergütung</option>
        </select>
      </label>

      <label>Filter:
        <select id="studiesFilter">
          <option value="all">Alle</option>
          <option value="active">Aktive</option>
          <option value="expired">Voll/Abgelaufen</option>
        </select>
      </label>

      <label>Anzeige:
        <select id="studiesPageSize">
          <option value="50" selected>50</option>
          <option value="all">Alle</option>
        </select>
      </label>

      <fieldset class="date-filter" aria-label="Zeitraum">
        <legend>Zeitraum:</legend>
        <label>Von
          <input id="studiesDateFrom" type="date">
        </label>
        <label>Bis
          <input id="studiesDateTo" type="date">
        </label>
        <button id="studiesDateReset" class="filter-reset" type="button">Zurücksetzen</button>
      </fieldset>
    </div>

    <div id="studiesContent" class="loading">Lade…</div>
  </section>

  <!-- TEILNAHMEN -->
  <section class="tab-panel" id="panel-submissions">
    <div class="filter-bar">
      <label>Sortierung:
        <select id="submissionsSort">
          <option value="completedDesc">Neueste zuerst</option>
          <option value="completedAsc">Älteste zuerst</option>
          <option value="rewardDesc">Höchste Vergütung</option>
        </select>
      </label>

      <label>
        <select id="submissionsFilter">
          <option value="all">Alle</option>
          <option value="APPROVED">Approved</option>
          <option value="AWAITING REVIEW">Awaiting Review</option>
          <option value="SCREENED OUT">Screened Out</option>
          <option value="RETURNED">Returned</option>
          <option value="TIMED-OUT">Timed-Out</option>
        </select>
      </label>

      <label>
        <select id="submissionsPageSize">
          <option value="50" selected>50</option>
          <option value="all">Alle</option>
        </select>
      </label>

      <fieldset class="date-filter" aria-label="Zeitraum">
        <legend>Zeitraum:</legend>
        <label>Von
          <input id="submissionsDateFrom" type="date">
        </label>
        <label>Bis
          <input id="submissionsDateTo" type="date">
        </label>
        <button id="submissionsDateReset" class="filter-reset" type="button">Zurücksetzen</button>
        <a class="filter-icon export-icon"
           href="/api/export.php?type=submissions&amp;format=csv"
           title="Teilnahmen als CSV exportieren"
           aria-label="Teilnahmen als CSV exportieren">&#8681;</a>
      </fieldset>
    </div>
    <div id="submissionsContent" class="loading">Lade…</div>
  </section>

  <!-- STATISTIKEN -->
  <section class="tab-panel" id="panel-stats">
    <div id="statsContent" class="loading">Lade…</div>
  </section>

  <!-- SYSTEM -->
  <section class="tab-panel" id="panel-system">
    <div id="systemContent" class="loading">Lade…</div>
  </section>

  <!-- EINSTELLUNGEN -->
  <section class="tab-panel" id="panel-settings">
    <div id="settingsContent" class="loading">Lade…</div>
  </section>

</main>

<script src="/assets/app.js"></script>
</body>
</html>
