# Arbeitszeit-Tracking für Prolific Watcher

> **Zweck:** Ergänzt das Backend um Arbeitszeit-Statistiken auf Basis von
> `submissions.time_taken_seconds` (Prolific liefert das pro Submission, das
> Plugin synct es bereits seit längerem in die DB).
>
> **Plugin-Änderungen sind NICHT nötig.** Reine Backend- und Dashboard-Arbeit.
> Telegram-Bot-Status-/Earnings-Endpoints existieren bereits und müssen nur
> erweitert werden.

---

## 1. Was schon da ist

- Spalte `submissions.time_taken_seconds INT NULL` – wird vom Plugin gefüllt
- Im Dashboard wird die Zeit in der **Einzel-Submission-Anzeige** schon dargestellt
  (`dashboard/assets/app.js`, etwa `Math.round(s.time_taken_seconds / 60)`)
- Earnings-Aggregation pro Zeitfenster (Heute/Woche/Monat/Vormonat/Gesamt) in
  `api/data.php` → wird als Referenz-Pattern wiederverwendet
- Telegram-Bot mit Befehlen wie `/earnings`, `/balance` etc.

## 2. Was neu kommt

1. Eine **Aggregations-Funktion** für Arbeitszeit pro Zeitfenster
2. Eine **neue Sektion** im `/overview`-Endpoint mit den aggregierten Daten
3. **Dashboard-Kacheln** für Arbeitszeit + KPI "effektiver Stundenlohn"
4. Zwei **neue Telegram-Befehle**: `/worktime` und `/effective`

---

## 3. Datenregeln

### Status-Behandlung

`time_taken_seconds` wird **für alle Status** in die Aggregation einbezogen, aber
für die Anzeige in zwei Buckets gruppiert:

| Bucket | Status | Anzeige-Label |
|--------|--------|---------------|
| **bezahlt** | `APPROVED`, `AWAITING REVIEW`, `SCREENED OUT`, `SCREENED-OUT` | – |
| **unbezahlt** | `RETURNED`, `REJECTED`, `TIMED OUT`, `TIMED-OUT` | "ohne Vergütung" |

### Mindest-Fallback bei SCREENED OUT

Prolific liefert bei SCREENED OUT manchmal `time_taken < 60` oder `NULL` (das
Pre-Screening läuft sehr schnell). Realistisch hast du aber mindestens den Tab
geöffnet, das Briefing angelesen, ein paar Fragen beantwortet.

```php
function effective_time_seconds(array $sub): int {
    $raw = (int)($sub['time_taken_seconds'] ?? 0);
    $status = strtoupper(str_replace('-', ' ', $sub['status'] ?? ''));

    // SCREENED OUT mit ungenauer/fehlender Messung: mind. 60 Sek
    if ($status === 'SCREENED OUT') {
        return max($raw, 60);
    }
    return $raw;
}
```

### Zeitfilter

Filterfeld: `COALESCE(completed_at, started_at)`.
Grund: RETURNED/REJECTED haben oft kein `completed_at`, dann fällt der Eintrag
sonst aus dem Zeitfenster.

### Zeitfenster

Identisch zu den existierenden Earnings-Fenstern (heute, Woche ab Mo 00:00,
Monat ab dem 1., Vormonat, Gesamt). Code-Pattern aus `build_overview()` reuse.

---

## 4. Neue Funktion: `sum_worktime_by_period`

In dieselbe Datei wie die Earnings-Aggregation (`api/_earnings.php` falls schon
extrahiert, sonst `api/data.php`):

```php
/**
 * Summiert Arbeitszeit (Sekunden) für ein Zeitfenster.
 * Liefert getrennte Buckets für bezahlt/unbezahlt sowie Counts.
 */
function sum_worktime_by_period(PDO $pdo, ?DateTime $from, ?DateTime $to): array {
    $sql = "SELECT status, time_taken_seconds
            FROM submissions
            WHERE 1=1";
    $params = [];
    if ($from) {
        $sql .= " AND COALESCE(completed_at, started_at) >= ?";
        $params[] = $from->format('Y-m-d H:i:s');
    }
    if ($to) {
        $sql .= " AND COALESCE(completed_at, started_at) < ?";
        $params[] = $to->format('Y-m-d H:i:s');
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $result = [
        'paid_seconds'   => 0,
        'unpaid_seconds' => 0,
        'total_seconds'  => 0,
        'count_paid'     => 0,
        'count_unpaid'   => 0,
        'count_total'    => 0,
    ];

    $paidSet   = ['APPROVED', 'AWAITING REVIEW', 'SCREENED OUT'];
    $unpaidSet = ['RETURNED', 'REJECTED', 'TIMED OUT'];

    foreach ($stmt->fetchAll() as $row) {
        $sec = effective_time_seconds($row);
        $status = strtoupper(str_replace('-', ' ', $row['status'] ?? ''));

        $result['total_seconds'] += $sec;
        $result['count_total']++;

        if (in_array($status, $paidSet, true)) {
            $result['paid_seconds'] += $sec;
            $result['count_paid']++;
        } elseif (in_array($status, $unpaidSet, true)) {
            $result['unpaid_seconds'] += $sec;
            $result['count_unpaid']++;
        }
    }

    return $result;
}
```

---

## 5. `build_overview()` erweitern

In der bestehenden `build_overview()`-Funktion (api/data.php oder _earnings.php)
nach dem `'earnings' =>`-Block einen `'worktime' =>`-Block ergänzen, der dasselbe
Zeitfenster-Schema verwendet:

```php
'worktime' => [
    'today'     => sum_worktime_by_period($pdo, $today,          null),
    'week'      => sum_worktime_by_period($pdo, $weekStart,      null),
    'month'     => sum_worktime_by_period($pdo, $monthStart,     null),
    'lastMonth' => sum_worktime_by_period($pdo, $lastMonthStart, $lastMonthEnd),
    'allTime'   => sum_worktime_by_period($pdo, null,            null),
],
```

---

## 6. Effektiver Stundenlohn (KPI)

Die wertvolle Zahl: **Verdienst geteilt durch tatsächliche Arbeitszeit.**

### Berechnungsregel

```
Effektiver £/h = (earned_gbp_minor / 100) / (paid_seconds / 3600)
```

**Wichtig**:
- Zähler: nur **bezahlte** Earnings (APPROVED + SCREENED OUT, NICHT pending –
  sonst schwankt die Zahl bis zum Approval)
- Nenner: `worktime.paid_seconds` (also auch APPROVED + AWAITING + SCREENED OUT)
- Falls `paid_seconds === 0`: anzeigen als "–" (keine Division durch 0)

### Wo berechnen

Frontend-seitig, im Dashboard-JS. Keine eigene Server-Funktion nötig, da Earnings
und Worktime im selben Overview-Response liegen.

---

## 7. Dashboard-UI

### Neue Kachel-Reihe

Direkt unter den existierenden Earnings-Kacheln eine zweite Reihe für Arbeitszeit.
Dieselben Zeitfenster, dieselbe optische Struktur (4 Kacheln nebeneinander).

Format pro Kachel:
```
ARBEITSZEIT HEUTE
2 h 35 min
(+ 12 min ohne Vergütung)
```

Wobei die Klammer-Zeile nur erscheint wenn `unpaid_seconds > 0`.

### Formatierungs-Helper (JS)

```javascript
function fmtWorktime(seconds) {
  if (!seconds || seconds < 60) return '–';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
```

### KPI-Kachel "Effektiver Stundenlohn"

Eigene Kachel, prominent platziert (z.B. neben den Earnings-Heute-Kacheln oder
unter den beiden Reihen als einzelne Highlight-Kachel).

Inhalt:
```
EFFEKTIVER STUNDENLOHN (gesamt)
£8,42 / h
£953,20 in 113 h 12 min
```

Zwei Varianten erwägen:
- **Gesamt** (basierend auf `allTime`) – die langfristige Wahrheit
- **Diesen Monat** (basierend auf `month`) – aktueller Trend

Beide nebeneinander wäre informativ.

### Dark-Mode

Bestehende CSS-Variablen wiederverwenden, keine Änderung nötig wenn das Pattern
der existierenden Earnings-Kacheln 1:1 übernommen wird.

---

## 8. Telegram-Bot: Neue Befehle

Im bestehenden Webhook-Dispatcher (`api/telegram-webhook.php`) zwei neue Befehle
ergänzen. Die Datenbeschaffung über die schon existierenden Aggregations-Funktionen
(falls in `_earnings.php` extrahiert: einfach einbinden).

### `/worktime`

```
⏱ *Arbeitszeit*

Heute        2h 35min  (+ 12min unbezahlt)
Diese Woche  14h 02min
Dieser Monat 47h 28min
Vormonat     58h 11min
Gesamt       113h 12min
```

Format-Hilfsfunktion (PHP):
```php
function fmt_worktime_de(int $seconds): string {
    if ($seconds < 60) return '0 min';
    $h = intdiv($seconds, 3600);
    $m = intdiv($seconds % 3600, 60);
    if ($h === 0) return "{$m}min";
    if ($m === 0) return "{$h}h";
    return "{$h}h {$m}min";
}
```

Erinnerung: MarkdownV2-Escape für dynamische Werte (`h`/`min` sind safe).

### `/effective`

```
💸 *Effektiver Stundenlohn*

Diesen Monat  £8,42 / h
              (£78,50 in 9h 19min)

Gesamt        £8,17 / h
              (£953,20 in 113h 12min)
```

Bei `paid_seconds === 0`: Antwort "Noch keine bezahlten Studien dieses Monat" o.ä.

### `/help` und `/start` aktualisieren

Die beiden neuen Befehle in die `/help`- und `/start`-Listen aufnehmen.

---

## 9. Umsetzungsreihenfolge

1. `effective_time_seconds()` + `sum_worktime_by_period()` in
   `_earnings.php` (oder `data.php`) ergänzen
2. `build_overview()` um `worktime`-Block erweitern
3. Dashboard-JS: `fmtWorktime()`-Helper + neue Kachelreihe rendern
4. Effektiv-Stundenlohn-KPI im Dashboard berechnen und anzeigen
5. Telegram-Befehle `/worktime` und `/effective` ergänzen
6. `/help` und `/start` um die neuen Befehle erweitern
7. Test: Dashboard öffnen, Werte plausibel? Telegram `/worktime` schicken,
   Antwort plausibel?

---

## 10. Sanity-Checks beim Testen

- Summe `paid_seconds` aus `allTime` sollte ≈ Summe der `time_taken`-Werte aus
  Prolifics Übersicht entsprechen (kleine Abweichungen durch SCREENED-OUT-Fallback)
- Effektiver Stundenlohn sollte **niedriger** als der theoretische sein
  (theoretischer £/h auf Studienseite ist optimistisch geschätzt)
- Falls effektiver £/h **deutlich höher** als theoretischer: Bug in der
  Zeit-Aggregation – wahrscheinlich `time_taken_seconds` als Sekunden statt
  Minuten interpretiert oder ähnlich
