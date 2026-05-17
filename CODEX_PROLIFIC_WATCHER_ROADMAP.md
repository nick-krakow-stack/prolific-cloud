# Prolific Watcher – Codex Entwicklungsbriefing

## Ziel

Dieses Projekt soll das bestehende **Prolific Watcher Dashboard** von einer reinen Datenanzeige zu einem professionellen persönlichen Prolific-Cockpit ausbauen.

Die Anwendung soll Einnahmen, offene Beträge, Studien, Teilnahmen, Trends, Effizienz, Monatsziele, Währungen, Pending-Risiko, Systemstatus und Auswertungen übersichtlich darstellen.

Der aktuelle Projektstand besteht aus:

```text
/
├── .htaccess
├── config.php
├── api/
│   ├── data.php
│   └── _common.php
└── dashboard/
    ├── index.php
    ├── app.php
    ├── logout.php
    ├── session.php
    └── assets/
        ├── app.js
        └── style.css
```

Die Domain `prolific-watcher.de/` soll intern das Dashboard laden, ohne dass `/dashboard/` oder `/app.php` sichtbar in der URL erscheint.

---

## Aktuelle wichtige Erkenntnisse

### 1. Balance-Struktur aus `/api/data.php?type=overview`

Die echte `balance`-Struktur sieht aktuell so aus:

```js
{
  approved_per_currency: { GBP: 1139, USD: 0 },
  fetchedAt: '2026-05-17T11:30:57.087Z',
  pending_per_currency: { GBP: 2435, USD: 1562 },
  total_gbp: 1139,
  total_pending_gbp: 3583
}
```

Wichtig:

- Werte sind **Minor Units**, also z. B. `1139` = `£11.39`.
- `approved_per_currency` = auszahlbares / bestätigtes Guthaben.
- `pending_per_currency` = Guthaben in Prüfung.
- `total_gbp` und `total_pending_gbp` sind Fallback-Summen in GBP.

Das Frontend muss diese Felder nativ unterstützen.

---

## Technische Grundregeln

### PHP

- Kein Framework verwenden.
- Bestehende Struktur erhalten.
- Bestehende Session-Logik respektieren.
- API-Antworten immer als JSON über vorhandene Helper wie `json_response()` ausgeben.
- Keine sensiblen Daten im Frontend ausgeben.
- SQL mit Prepared Statements schreiben.
- Keine unnötigen externen Dependencies.

### JavaScript

- Vanilla JavaScript verwenden.
- Keine Frameworks.
- Bestehende Tab-Logik beibehalten oder sauber erweitern.
- API-Basis immer absolut setzen:

```js
const API_BASE = '/api/data.php';
```

- API-Calls mit Credentials:

```js
fetch('/api/data.php?type=overview', { credentials: 'same-origin' })
```

- Bei `401` zurück auf `/` redirecten.

### CSS

- Bestehenden dunklen SaaS-Look beibehalten.
- Modern, ruhig, übersichtlich.
- Responsive Design für Desktop und Mobile.
- Keine überladenen Effekte.
- Cards, Progressbars, Tags, kleine Charts und Status-Indikatoren verwenden.

---

## Umsetzungsstrategie

Bitte das Projekt nicht chaotisch erweitern, sondern in klaren Modulen.

Empfohlene Reihenfolge:

1. API-Datenstruktur erweitern.
2. Frontend-Renderer erweitern.
3. CSS-Komponenten ergänzen.
4. Danach Charts, Ziele, Export und Detailansichten ergänzen.

Jede Erweiterung soll so gebaut werden, dass alte bestehende Funktionen weiterlaufen.

---

# Phase 1 – Dashboard-Fundament verbessern

## 1. Prolific-Konto erweitern

Der Bereich `Prolific-Konto` soll nicht nur zwei Zeilen zeigen, sondern eine eigene Card bekommen.

### Anzeigen

- Auszahlbar
- In Prüfung
- Gesamt offen
- Letztes Balance-Update
- Optional: Gesamt in EUR, wenn FX-Rates verfügbar sind

### Beispiel

```text
Prolific-Konto

Auszahlbar
£11,39

In Prüfung
£24,35 + $15,62

Gesamt offen
£35,74 + $15,62

Letztes Balance-Update
vor 2 Min
```

### Benötigte Logik

Frontend soll aus `balance` lesen:

```js
approved_per_currency
pending_per_currency
fetchedAt
total_gbp
total_pending_gbp
```

Falls weitere ältere Strukturen vorhanden sind, können sie als Fallback unterstützt werden.

---

## 2. Monatsziel und Tagesziel

Es soll eine einfache Ziel-Logik geben.

### Erstmal hart codiert oder über config.php

Beispiel:

```php
'goals' => [
    'daily_gbp_minor' => 500,
    'monthly_gbp_minor' => 15000,
]
```

Später optional über eine Settings-Seite editierbar.

### Anzeigen

- Tagesziel
- Monatsziel
- Fortschritt als Prozent
- Restbetrag
- Progressbar

### Beispiel

```text
Tagesziel
£3,20 von £5,00
64 % erreicht
Noch £1,80 offen

Monatsziel
£122,98 von £150,00
82 % erreicht
Noch £27,02 offen
```

### Berechnung

- Tageswert aus `earnings.today.earned`
- Monatswert aus `earnings.month.earned`
- Für den ersten Schritt nur GBP verwenden.
- Später alle Währungen in GBP/EUR umrechnen.

---

## 3. Monatsprognose

Berechnung:

```text
Monatsprognose = aktueller Monatsverdienst / vergangene Monatstage * Tage im Monat
```

### Anzeigen

- Aktueller Monat
- Durchschnitt pro Tag
- Prognose Monatsende
- Unterschied zum Ziel

### Beispiel

```text
Monatsprognose
Aktuell: £122,98
Ø pro Tag: £7,68
Prognose: £238,08
Ziel wird voraussichtlich erreicht
```

---

## 4. Heute-Übersicht verbessern

Aktuell wird nur der Betrag angezeigt. Ergänzen:

- Heute verdient
- Heute ausstehend
- Anzahl Teilnahmen heute
- Durchschnitt pro Teilnahme heute
- Optional: effektiver Stundenlohn heute

Benötigt eventuell Backend-Erweiterung in `build_overview()`.

---

# Phase 2 – Pending- und Status-Analyse

## 5. Pending-Übersicht

Ziel: Erkennen, wie viel Geld noch in Prüfung ist und ob etwas ungewöhnlich lange offen ist.

### Anzeigen

- Anzahl offener Teilnahmen
- Gesamtbetrag pending
- Älteste offene Teilnahme
- Anzahl älter als 7 Tage
- Anzahl älter als 14 Tage

### Backend-Query-Idee

```sql
SELECT
  COUNT(*) AS count_pending,
  MIN(completed_at) AS oldest_pending_completed_at,
  SUM(reward_amount_minor) AS total_pending_minor,
  reward_currency
FROM submissions
WHERE status = 'AWAITING REVIEW'
GROUP BY reward_currency;
```

Für ältere offene Teilnahmen:

```sql
SELECT COUNT(*)
FROM submissions
WHERE status = 'AWAITING REVIEW'
AND completed_at < datetime('now', '-7 days');
```

Je nach Datenbank SQL-Dialekt anpassen.

---

## 6. Status-Verteilung

Anzeige aller Submission-Status:

- APPROVED
- AWAITING REVIEW
- REJECTED
- RETURNED
- SCREENED OUT / SCREENED-OUT
- sonstige

### Zusätzlich berechnen

- Approval-Rate
- Rejection-Rate
- Pending-Rate

### Beispiel

```text
Status-Verteilung
Approved: 74
Awaiting Review: 12
Rejected: 1
Screened Out: 5

Approval-Rate: 98,7 %
Reject-Rate: 1,3 %
```

---

# Phase 3 – Effizienz und Qualitätsbewertung

## 7. Effektiver Stundenlohn

Wenn `time_taken_seconds` vorhanden ist:

```text
Stundenlohn = reward_amount_minor / (time_taken_seconds / 3600)
```

### Anzeigen

- Heute
- Diese Woche
- Dieser Monat
- Gesamt

### Wichtig

Nur sinnvolle Datensätze berücksichtigen:

- `time_taken_seconds > 0`
- `reward_amount_minor > 0`
- Status bevorzugt `APPROVED` und ggf. `SCREENED OUT`

---

## 8. Beste Studien

Neue Card oder Tab-Bereich:

### Top-Listen

- Top 5 nach absoluter Vergütung
- Top 5 nach £/h
- Längste Studien
- Schlechteste Studien nach £/h

### Beispiel

```text
Top Studien nach Stundenlohn
1. Study XY — £8,50 — 12 Min — £42,50/h
2. Study ABC — £5,20 — 8 Min — £39,00/h
```

---

## 9. Studien-Qualitätsfilter

In der Studienliste Tags ergänzen:

- `🔥 Sehr gut` bei z. B. > £12/h
- `Okay` bei £8–12/h
- `⚠️ Niedrig` bei < £8/h

Schwellwerte später konfigurierbar machen.

Zusätzliche Filter:

- Nur Studien ab bestimmtem Stundenlohn
- Nur aktive Studien
- Nur Studien mit hoher Vergütung
- Nur Studien unter X Minuten

---

# Phase 4 – Charts und Verlauf

## 10. Einnahmen pro Tag

API-Endpunkt erweitern, z. B.:

```text
/api/data.php?type=stats_daily
```

Oder in `overview` integrieren.

### Datenstruktur

```json
{
  "ok": true,
  "daily": [
    { "date": "2026-05-01", "earned": { "GBP": 420 }, "pending": { "GBP": 100 } },
    { "date": "2026-05-02", "earned": { "GBP": 0 }, "pending": {} }
  ]
}
```

### Frontend

- Erstmal als einfache Balken ohne externe Chart-Library.
- Optional später mit Canvas.

### Anzeige

- Letzte 7 Tage
- Letzte 30 Tage
- Monat bis heute

---

## 11. Kalender-Heatmap

Monatsansicht:

```text
Mai 2026
01 £4,20
02 £0,00
03 £7,50
...
```

Visuell als kleine Grid-Heatmap.

### Nutzen

Sofort sehen, welche Tage gut liefen und welche leer waren.

---

## 12. Monatsvergleich

Anzeige:

- Dieser Monat
- Vormonat
- Veränderung absolut
- Veränderung Prozent

### Beispiel

```text
Dieser Monat: £122,98
Vormonat: £13,17
Veränderung: +£109,81 / +833 %
```

---

# Phase 5 – Währungen und Euro-Umrechnung

## 13. FX-Umrechnung

`fxRates` ist bereits im Backend vorgesehen.

### Ziel

Alle Beträge optional zusätzlich in EUR anzeigen.

### Beispiel

```text
£11,39 ≈ 13,31 €
$15,62 ≈ 14,38 €
```

### Benötigte Helper

Frontend:

```js
function convertToEur(byCurrency, fxRates) {}
function fmtEur(minor) {}
```

Backend sollte sicherstellen, dass `fxRates` als echtes Objekt zurückkommt, nicht als JSON-String.

---

# Phase 6 – Export und Reports

## 14. CSV Export

Neue API-Route:

```text
/api/export.php?type=submissions&format=csv
```

Oder in `data.php` als `type=export_submissions_csv`, falls keine neue Datei gewünscht ist.

### Exportdaten

- Study Name
- Status
- Reward
- Currency
- Started At
- Completed At
- Time Taken
- Reward per Hour

---

## 15. Monatsbericht

Ziel: Ein automatisch generierter Monatsbericht als HTML oder später PDF.

### Inhalt

- Einnahmen gesamt
- Einnahmen nach Währung
- Optional EUR-Summe
- Anzahl Teilnahmen
- Approved/Pending/Rejected
- Durchschnittlicher Stundenlohn
- Beste Studien
- Pending am Monatsende

---

# Phase 7 – Erweiterte Studien- und Requester-Analyse

## 16. Persönliche Notizen pro Studie

Falls sinnvoll, neue Tabelle:

```sql
CREATE TABLE study_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  study_id TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Frontend:

- Notiz-Button bei Studie
- Inline-Textarea oder kleines Modal
- Speichern per API

---

## 17. Requester-Tracking

Falls in den Daten vorhanden:

- Requester Name / ID speichern
- Top Requester anzeigen
- Approval-Verhalten
- Durchschnittliche Bezahlung
- Durchschnittliche Review-Zeit

### Beispiel

```text
Top Requester
1. ABC Research — £42,80 gesamt — 100 % approved
2. University XYZ — £31,20 gesamt — Ø £18/h
```

---

# Phase 8 – Systemstatus und Health Check

## 18. System-Health-Card

Anzeigen:

- API erreichbar
- Letzter Sync
- Letzter erfolgreicher Sync
- Letzter Fehler
- Cron aktiv / vermutlich aktiv
- Anzahl Studien in DB
- Anzahl Submissions in DB

### Beispiel

```text
Systemstatus
API: OK
Letzter Sync: vor 1 Min
Letzter Fehler: keiner
Studien in DB: 248
Teilnahmen in DB: 91
```

---

## 19. „Was hat sich seit letztem Sync geändert?“

Ziel: Nach jedem Sync erkennen, was neu ist.

### Anzeigen

```text
Seit letztem Sync
+ 1 neue Studie
+ 2 neue Approvals
+ £1,80 neu auszahlbar
+ $0,50 neu in Prüfung
```

Dafür braucht es entweder:

- Diff-Speicherung beim Sync
- oder Auswertung des letzten Sync-Logs / Events

---

# Phase 9 – UI-Struktur

## Vorgeschlagene Tabs

Aktuell:

- Übersicht
- Studien
- Teilnahmen
- Log

Vorschlag:

- Übersicht
- Studien
- Teilnahmen
- Statistiken
- Konto
- Log
- System

Alternativ für weniger Komplexität:

- Übersicht
- Studien
- Teilnahmen
- Statistiken
- Log

Der Tab `Übersicht` soll die wichtigsten Cards zeigen:

1. Heute
2. Woche
3. Monat
4. Prolific-Konto
5. Ziel-Fortschritt
6. Pending-Risiko
7. Systemstatus klein

---

## Vorgeschlagene Card-Komponenten

CSS-Klassen:

```css
.dashboard-grid
.metric-card
.metric-card.highlight
.metric-title
.metric-value
.metric-subline
.progress-bar
.progress-fill
.status-pill
.status-pill.good
.status-pill.warn
.status-pill.danger
.mini-chart
.heatmap
```

---

# Backend-Erweiterungen – konkrete API-Idee

## `/api/data.php?type=overview`

Soll enthalten:

```json
{
  "ok": true,
  "earnings": {},
  "balance": {},
  "goals": {},
  "forecast": {},
  "pendingStats": {},
  "statusStats": {},
  "efficiency": {},
  "lastSyncAt": "...",
  "serverTime": "..."
}
```

## `/api/data.php?type=stats`

Für schwerere Auswertungen:

```json
{
  "ok": true,
  "daily": [],
  "monthly": [],
  "topStudies": [],
  "hourlyRate": {},
  "statusDistribution": {}
}
```

## `/api/data.php?type=system`

```json
{
  "ok": true,
  "lastSync": {},
  "lastError": {},
  "dbCounts": {},
  "serverTime": "..."
}
```

---

# Wichtige bestehende Bugs/Details, nicht wieder kaputt machen

## 1. Root-Schema

Das Dashboard wird über `/` geladen. Deshalb im Frontend immer absolute Pfade verwenden:

```html
<link rel="stylesheet" href="/assets/style.css">
<script src="/assets/app.js"></script>
<a href="/logout.php">Logout</a>
```

In JavaScript:

```js
const API_BASE = '/api/data.php';
```

## 2. Kein Redirect auf `app.php`

In `dashboard/index.php` darf nicht stehen:

```php
header('Location: app.php');
```

Stattdessen:

```php
if (is_logged_in()) {
    require __DIR__ . '/app.php';
    exit;
}
```

## 3. Balance-Mapping

Unbedingt unterstützen:

```js
balance.approved_per_currency
balance.pending_per_currency
balance.total_gbp
balance.total_pending_gbp
```

---

# Akzeptanzkriterien

Das Projekt gilt je Phase als sauber umgesetzt, wenn:

- Keine sichtbaren PHP-Warnings oder JS-Fehler auftreten.
- `/` lädt korrekt Login oder Dashboard.
- `/dashboard/` und `/app.php` müssen nicht sichtbar sein.
- `/api/data.php?type=overview` liefert valides JSON.
- Dashboard zeigt Prolific-Konto korrekt an.
- Mobile Ansicht bleibt benutzbar.
- Bestehende Tabs funktionieren weiterhin.
- Bei fehlenden Daten wird `–` angezeigt, nicht ein leerer Bereich oder JavaScript-Fehler.

---

# Priorisierte Umsetzungsliste

## Sofort umsetzen

1. Prolific-Konto-Card erweitern.
2. Tagesziel und Monatsziel.
3. Monatsprognose.
4. Pending-Übersicht.
5. Status-Verteilung.
6. Effektiver Stundenlohn.
7. Beste Studien.
8. Einnahmen der letzten 7/30 Tage.
9. Euro-Umrechnung.
10. System-Health-Card.

## Danach

11. Kalender-Heatmap.
12. Export CSV.
13. Monatsbericht.
14. Studien-Notizen.
15. Requester-Analyse.
16. Settings-Seite.

---

# Entwicklungsstil für Codex

Bitte bei jeder Änderung:

1. Kurz analysieren, welche Dateien betroffen sind.
2. Bestehende Logik respektieren.
3. Kleine, nachvollziehbare Module bauen.
4. Keine unnötige Komplett-Neuschreibung, wenn nicht nötig.
5. Danach konkrete Testschritte nennen.
6. Wenn Datenbankänderungen nötig sind, SQL-Migration separat ausgeben.
7. Bei unsicherer Datenstruktur Debug-Ausgabe nur temporär und nicht dauerhaft im UI lassen.

---

# Erster konkreter Auftrag an Codex

Starte mit **Phase 1 + Phase 2**:

1. Erweitere `/api/data.php?type=overview` um:
   - goals
   - forecast
   - pendingStats
   - statusStats
   - todayStats
2. Erweitere `dashboard/assets/app.js`, sodass die neuen Daten gerendert werden.
3. Erweitere `dashboard/assets/style.css` um moderne Cards, Progressbars und Status-Pills.
4. Bestehende Tabs und Funktionen dürfen nicht kaputtgehen.
5. Gib am Ende alle geänderten Dateien vollständig aus oder als Patch, je nachdem was in der Entwicklungsumgebung besser passt.

