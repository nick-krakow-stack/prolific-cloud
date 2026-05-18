# Telegram-Bot-Backend für Prolific Watcher

> **Zweck dieses Dokuments:** Vollständige Implementierungs-Spezifikation für die
> Telegram-Bot-Erweiterung des bestehenden Prolific-Watcher-Backends auf All-Inkl-
> Webspace. Geschrieben für Coding-Agents (Claude Code, Codex). Trifft konkrete
> Entscheidungen, damit nicht geraten werden muss.

---

## 0. Kontext: Was existiert bereits

Das Backend läuft auf All-Inkl-Webspace unter `https://prolific.nickkrakow.de/`.
Aktuelle Struktur:

```
prolific/
├── api/
│   ├── _common.php           # PDO, API-Key-Auth, Helpers, Settings-Storage
│   ├── sync.php              # POST: Plugin synct Studien/Submissions/Balance
│   └── data.php              # GET: Dashboard ruft Daten ab (Session-Auth)
├── dashboard/
│   ├── session.php           # Login/Session-Helpers
│   ├── index.php             # Login-Seite
│   ├── app.php               # Dashboard-UI
│   ├── logout.php
│   └── assets/{style.css, app.js}
├── config.php                # DB-Credentials, API-Key, Dashboard-Login
└── .htaccess                 # HTTPS-Erzwingung, Schutz von config.php
```

**Datenbank**: MariaDB 10.6. Vorhandene Tabellen:
- `studies` — Notification-Historie aller jemals gemeldeten Studien
- `submissions` — Alle Teilnahmen mit Verdienst
- `settings` — Key-Value-Store (JSON-serialisiert) für Balance, FX-Rates, Sync-Meta
- `events` — Append-only-Log
- `sync_log` — Wann hat das Plugin zuletzt gesynct

**Authentifizierungs-Pattern**:
- Plugin → Backend: API-Key im Header `X-API-Key`, geprüft in `_common.php` via `require_api_key()`
- Dashboard → Backend: Session-Cookie, geprüft via `require_login()` aus `dashboard/session.php`

**Plugin-Stand**: Version 1.7.0 sendet bereits **direkt** Telegram-Push aus dem
Chrome-Service-Worker. Dieses Backend-Modul ergänzt **eingehende Bot-Befehle**
(Webhook-Empfang), die das Plugin nicht abdecken kann.

---

## 1. Ziel des Telegram-Backend-Moduls

Der Telegram-Bot soll auf **eingehende Befehle** des Nutzers (Telegram-Chat) reagieren
und mit Daten aus der MySQL-Datenbank antworten. Das funktioniert auch dann, wenn
der PC und das Plugin offline sind – solange das Plugin in der Vergangenheit
mindestens einmal gesynct hat.

**Geplante Befehle (Mindestumfang):**

| Befehl | Funktion |
|--------|----------|
| `/start` | Begrüßung + kurze Hilfe |
| `/help` | Liste aller Befehle |
| `/status` | Aktueller Zustand: letzter Sync, aktive Studien, Auth-Status |
| `/earnings` | Verdienst-Übersicht: Heute / Woche / Monat / Vormonat / Gesamt |
| `/balance` | Aktueller Kontostand (auszahlbar + pending) |
| `/studies` | Liste aktuell aktiver Studien (mit Direktlinks) |
| `/quote` | Erfolgsquote + Verdienst-Quote (Logik s. Abschnitt 7) |
| `/today` | Was kam heute rein? (gemeldete Studien + Teilnahmen) |

**Nicht-Ziele:**
- Keine Auto-Reservierung von Studien (TOS-Verstoß)
- Kein "Sync auslösen"-Befehl (Plugin synct selbst per Push)
- Kein Konfigurieren des Plugins über Telegram (Plugin hat eigene UI)

---

## 2. Architektur-Entscheidung: Webhook (nicht Long-Polling)

Telegram bietet zwei Wege, Nachrichten zu empfangen:

1. **Long-Polling** (`getUpdates`): Der Bot fragt regelmäßig bei Telegram nach.
   Problem: Braucht einen Dauer-Prozess. Auf Shared-Hosting nicht praktikabel.

2. **Webhook**: Telegram ruft eine vorher konfigurierte URL auf, sobald eine
   Nachricht eingeht. **Genau das richtige Modell für PHP/Shared-Hosting.**

**Entscheidung: Webhook.** Telegram sendet POST-Requests an
`https://prolific.nickkrakow.de/api/telegram-webhook.php`. Dieses Skript
verarbeitet die Befehle und antwortet direkt mit `sendMessage`-Calls.

Voraussetzungen für Webhook:
- HTTPS (✓ bereits durch Let's Encrypt)
- Öffentlich erreichbar (✓)
- Antwortet innerhalb 30 Sekunden (✓ – wir antworten in <1s)

---

## 3. Konfiguration: Erweiterung von `config.php`

Die bestehende `config.php` wird um einen `telegram`-Block erweitert. Dazu wird
auch `config.example.php` entsprechend ergänzt.

```php
// In config.php / config.example.php ergänzen:

'telegram' => [
    // Bot-Token vom @BotFather
    'bot_token' => 'HIER_TELEGRAM_BOT_TOKEN_EINFUEGEN',
    // Erlaubte Chat-ID (nur DIESE Chat-ID darf den Bot steuern!)
    // Andere Anfragen werden ignoriert (Schutz gegen Fremdzugriff).
    'allowed_chat_id' => 'HIER_DEINE_CHAT_ID_EINFUEGEN',
    // Webhook-Secret: zufälliger String, wird als Pfad-Suffix verwendet
    // (Telegram unterstützt secret_token-Header seit 2022, ALTERNATIV).
    // Verhindert, dass jemand die Webhook-URL errät und Befehle einschleust.
    'webhook_secret' => 'HIER_LANGER_ZUFALLSSTRING_MIN_32_ZEICHEN',
],
```

### Update für `hash-generator.php`

`hash-generator.php` muss zusätzlich **Wert (D) Webhook-Secret** ausgeben, analog
zu API-Key und Session-Secret (32-Byte-Hex, also `bin2hex(random_bytes(24))`).
Display-Logik:

- Box-Header: `(D) Webhook-Secret (für Telegram)`
- Erklärungstext: „Wird als geheimer Pfad-Bestandteil der Webhook-URL verwendet."
- Ziel: `'webhook_secret' => '...'`

`config.example.php` wird ergänzt um den `telegram`-Block (mit `HIER_…`-Platzhaltern
im selben Stil wie die anderen Felder).

---

## 4. Datenbank-Erweiterungen

### Neue Tabelle: `telegram_messages`

Append-only-Log aller eingehenden Telegram-Updates (für Audit, Debugging,
Anti-Replay-Schutz).

```sql
CREATE TABLE IF NOT EXISTS `telegram_messages` (
    `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `update_id`  BIGINT UNSIGNED NOT NULL UNIQUE,  -- Telegram update_id, gegen Replay
    `chat_id`    BIGINT,
    `from_user`  VARCHAR(255),
    `text`       TEXT,
    `command`    VARCHAR(64),
    `received_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `response_sent` TINYINT(1) DEFAULT 0,
    `response_error` VARCHAR(500),
    INDEX `idx_received_at` (`received_at`),
    INDEX `idx_chat_id` (`chat_id`),
    INDEX `idx_command` (`command`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Wichtig**: Das `update_id`-UNIQUE-Constraint verhindert doppelte Verarbeitung,
falls Telegram bei einem Server-Timeout dasselbe Update mehrfach schickt.

### Erweitern: `install.php`

Die neue Tabelle in das `$statements`-Array von `install.php` einbauen. Das
bestehende Script ist idempotent (`CREATE TABLE IF NOT EXISTS`), also schadet
ein erneuter Aufruf nicht.

Außerdem: Die HTML-Übersicht am Ende von `install.php` um den neuen Tabellennamen
erweitern.

---

## 5. Neue Datei: `api/telegram-webhook.php`

Der eigentliche Webhook-Endpoint. Wird von Telegram aufgerufen.

### URL-Schema

Die Webhook-URL enthält das `webhook_secret` als Pfad-Bestandteil:

```
https://prolific.nickkrakow.de/api/telegram-webhook.php?s={webhook_secret}
```

Skript prüft `$_GET['s']` gegen `config.telegram.webhook_secret` per `hash_equals`.
Bei Mismatch: HTTP 403, keine weitere Verarbeitung.

### Empfangs-Format

Telegram sendet POST mit JSON-Body. Mindestens benötigte Felder:

```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 42,
    "from": { "id": 12345, "username": "nick" },
    "chat": { "id": 12345, "type": "private" },
    "date": 1234567890,
    "text": "/status"
  }
}
```

Es gibt auch andere Update-Typen (`callback_query` für Inline-Button-Klicks,
`edited_message`, etc.). **Phase 1: Nur `message.text`-Updates verarbeiten.**
Andere Update-Typen werden ignoriert (200 OK zurückgeben, sonst sendet Telegram
nach).

### Verarbeitungs-Pipeline

```
1. Secret aus ?s prüfen → bei Fehler 403, Abbruch
2. JSON-Body lesen → bei Fehler 400, Abbruch
3. update_id extrahieren → wenn bereits in telegram_messages: 200 OK, Abbruch
4. message.chat.id extrahieren → wenn ≠ allowed_chat_id: 200 OK + log_event, Abbruch
5. message.text extrahieren → wenn nicht mit "/" beginnt: 200 OK, Abbruch
6. Befehl parsen → dispatch
7. Antwort via Telegram-API senden
8. Eintrag in telegram_messages anlegen (success/error)
9. 200 OK zurückgeben
```

**Wichtig zum Antwortzeitpunkt**: Telegram erwartet die HTTP-200-Antwort innerhalb
30 Sek. Wir senden die Bot-Nachricht via separatem cURL-Call an die Telegram-API
und antworten dann mit 200. Bei sehr langsamen DB-Queries notfalls erst 200 senden
(per `fastcgi_finish_request()`), dann verarbeiten.

### Befehls-Dispatcher

```php
function dispatch_command(string $command, array $args, int $chatId): void {
    switch ($command) {
        case '/start':    cmd_start($chatId);    break;
        case '/help':     cmd_help($chatId);     break;
        case '/status':   cmd_status($chatId);   break;
        case '/earnings': cmd_earnings($chatId); break;
        case '/balance':  cmd_balance($chatId);  break;
        case '/studies':  cmd_studies($chatId);  break;
        case '/quote':    cmd_quote($chatId);    break;
        case '/today':    cmd_today($chatId);    break;
        default:          cmd_unknown($command, $chatId); break;
    }
}
```

Jeder `cmd_*`-Handler:
1. Liest benötigte Daten aus der DB (mit Funktionen aus `_common.php` und neuen
   Helpers aus `api/data.php` — falls Code-Wiederverwendung sinnvoll, in
   `_common.php` extrahieren).
2. Formatiert die Antwort als MarkdownV2-String.
3. Ruft `send_telegram_message($chatId, $text, $options)` auf.

### Telegram-API-Helper

In `_common.php` ergänzen (oder eigene `api/_telegram.php`):

```php
/**
 * Sendet eine Telegram-Nachricht via Bot-API.
 * Gibt true zurück bei Erfolg.
 */
function send_telegram_message(int $chatId, string $text, array $options = []): bool {
    global $config;
    $token = $config['telegram']['bot_token'] ?? '';
    if (empty($token)) return false;

    $url = "https://api.telegram.org/bot{$token}/sendMessage";
    $body = [
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => $options['parse_mode'] ?? 'MarkdownV2',
        'disable_web_page_preview' => $options['disable_preview'] ?? true,
    ];
    if (!empty($options['reply_markup'])) {
        $body['reply_markup'] = json_encode($options['reply_markup']);
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_POSTFIELDS => http_build_query($body),
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $httpCode === 200;
}

/**
 * MarkdownV2-Escape (Telegram braucht das für bestimmte Zeichen).
 */
function tg_escape(string $text): string {
    return preg_replace('/([_*\[\]()~`>#+\-=|{}.!\\\\])/', '\\\\$1', $text);
}
```

---

## 6. Befehls-Implementierungen (Detail)

Alle Antworten in **deutscher Sprache**, MarkdownV2-formatiert. Konsequente
Beträge-Formatierung: `£12,34` mit Komma als Dezimaltrenner.

### `/start`

```
👋 Willkommen beim *Prolific Watcher*

Verfügbare Befehle:
/status     – aktueller Zustand
/earnings   – Verdienst-Übersicht
/balance    – Kontostand
/studies    – aktive Studien
/quote      – Erfolgs- und Verdienst-Quote
/today      – heutige Aktivität
/help       – Hilfe
```

### `/help`

Dieselbe Liste wie `/start`, ohne Begrüßung.

### `/status`

```
📊 *Status*

🟢 Aktive Studien: 2
⏱ Letzter Sync: vor 3 Min
🔐 Auth: OK
📡 Plugin-Version: 1.7.0
```

Datenquellen:
- Aktive Studien: `SELECT COUNT(*) FROM studies WHERE is_active = 1`
- Letzter Sync: `get_setting('lastSyncAt')` → Zeit-Diff zu jetzt
- Plugin-Version: `get_setting('lastSyncMeta')` → `extensionVersion`

**Fallback**: Wenn `lastSyncAt` älter als 30 Min ist, Warnhinweis „⚠️ Plugin
synct nicht – PC vermutlich aus oder Sync deaktiviert."

### `/earnings`

```
💰 *Verdienst-Übersicht*

📅 Heute        £4,80 (+ £1,20 ausstehend)
📅 Diese Woche  £24,30 (+ £3,40 ausstehend)
📅 Dieser Monat £78,50
📅 Vormonat     £156,80
🏁 Gesamt       £953,20
```

Datenquellen: Genau dieselbe Logik wie in `api/data.php` → `build_overview()` →
`sum_by_period()`. **Wiederverwendung erwünscht**: Extrahiere diese Funktionen
ggf. in `_common.php` oder eine neue `_earnings.php`, damit Webhook und Dashboard
denselben Code nutzen.

Mehrwährungs-Beträge wie im Plugin: `£10,00 + $2,50` (pro Währung getrennt).

### `/balance`

```
🏦 *Prolific-Konto*

Auszahlbar:  £9,53
In Prüfung:  £24,35 + $15,62
```

Datenquelle: `get_setting('balance')` → liefert
`{ approved_per_currency: {...}, pending_per_currency: {...} }`.

### `/studies`

```
🟢 *Aktive Studien (2)*

1. Memory & Decision Making
   £2,50 · 15 Min · 10 Plätze · £10,00/h
   🖥📱 · 🎤
   🔗 https://app.prolific.com/studies/abc123…

2. Social Media Survey
   £1,80 · 8 Min · 25 Plätze · £13,50/h
   📱
   🔗 https://app.prolific.com/studies/def456…
```

Datenquelle: `SELECT * FROM studies WHERE is_active = 1 ORDER BY first_seen DESC`.
Max. 10 Studien anzeigen, sonst „+ N weitere".

Falls keine aktiven Studien: `🌙 Keine aktiven Studien gerade.`

### `/quote`

Logik **identisch** zur Plugin-Quote (s. `popup.js` → `renderQuote()`):
- Erfolgsquote: angenommen / (angenommen + verpasst), letzte 30 Tage, nur Studien
  mit bekanntem Reward
- Verdienst-Quote: tatsächlich verdient / möglicher Verdienst (in GBP-Äquivalent)
- Sanity-Check: bei >200% → „Daten inkonsistent"

```
🎯 *Quoten (letzte 30 Tage)*

Erfolgsquote:   38%
18/48 Studien angenommen
(+ 2 zurückgegeben)

Verdienst-Quote: 76%
£48,74 von £64,30 möglich
```

### `/today`

```
📅 *Heute*

🟢 Neue Studien: 7
✅ Teilgenommen: 3
💰 Verdient: £6,80 (+ £1,20 ausstehend)
```

Datenquellen:
- Neue Studien heute: `studies WHERE first_seen >= today_start`
- Teilgenommen: `submissions WHERE started_at >= today_start AND status IN (...)`
- Verdienst: Earnings-Logik mit Tagesfenster

### `/unknown` / Default

```
🤔 Unbekannter Befehl: `/foobar`

Tippe /help für eine Liste verfügbarer Befehle.
```

---

## 7. Verdienst-Quote: Detailspezifikation

Diese Logik ist im Plugin **verifiziert** und muss exakt portiert werden.

### Status-Klassifikation

- `APPROVED`, `SCREENED OUT`, `SCREENED-OUT` → **Earned**
- `AWAITING REVIEW` → **Pending**
- `RETURNED`, `REJECTED`, `TIMED OUT`, `TIMED-OUT` → nicht gezählt

### Erfolgsquote

```
Filter: studies WHERE first_seen >= NOW() - 30 Tage
        AND reward_minor > 0
        AND reward_minor IS NOT NULL

Für jede gefilterte Studie:
  Match in submissions per study_id, jeweils bester Status
  (Priorität: APPROVED > AWAITING > SCREENED OUT > RETURNED)

  Wenn Submission existiert UND Status ∈ {APPROVED, AWAITING, SCREENED}:
    → "angenommen"
  Wenn Submission existiert UND Status = RETURNED:
    → "zurückgegeben" (zählt separat)
  Wenn keine Submission:
    → "verpasst"

Erfolgsquote = angenommen / (angenommen + verpasst) × 100
```

### Verdienst-Quote

```
Für jede gefilterte Studie:
  Möglicher Verdienst = study.reward_minor (in Studien-Währung)
  Tatsächlicher Verdienst = submission.reward_amount_minor (falls vorhanden)

  Sonderfall SCREENED OUT:
    Möglicher Verdienst = tatsächlicher Verdienst (kein "verpasstes Potenzial")

Summen pro Währung getrennt
Umrechnung in GBP via FX-Rates aus settings.fxRates

Verdienst-Quote = actualGBP / possibleGBP × 100
Wenn actualGBP > possibleGBP × 2 → "Daten inkonsistent"
```

FX-Rates aus `get_setting('fxRates')` → `{ rates: { EUR: 1.18, USD: 1.27 } }`.
Umrechnung: USD-Minor / fxRates.rates.USD = GBP-Minor.

---

## 8. Telegram-Webhook bei Telegram registrieren

Einmaliger Setup-Schritt (nach Deployment des Webhook-Skripts):

```bash
curl -X POST "https://api.telegram.org/bot{BOT_TOKEN}/setWebhook" \
  -d "url=https://prolific.nickkrakow.de/api/telegram-webhook.php?s={WEBHOOK_SECRET}" \
  -d "allowed_updates=[\"message\"]" \
  -d "drop_pending_updates=true"
```

**Empfehlung**: Ein Setup-PHP-Script `api/telegram-setup.php` schreiben, das diesen
Call aus den Werten in `config.php` baut und ausführt. Nach erfolgreichem Setup
das Script genauso wie `install.php` per FTP löschen.

Layout für `telegram-setup.php`:
- Aufruf: `https://prolific.nickkrakow.de/api/telegram-setup.php`
- Lädt `config.php`
- Baut Webhook-URL aus `webhook_secret`
- Ruft Telegram-API auf
- Zeigt HTML-Erfolgsseite mit Bestätigung + Anleitung zum Löschen
- Bietet auch einen `?delete=1`-Modus, der den Webhook bei Telegram wieder
  entfernt (für Debugging)

---

## 9. Dashboard-Erweiterung (optional, niedrige Prio)

Im Dashboard einen neuen Tab "🤖 Bot" hinzufügen mit:
- Anzahl Befehle (letzte 24h / 7 Tage)
- Letzte 20 Befehle (aus `telegram_messages`)
- Status: Webhook aktiv? (per Telegram-API `getWebhookInfo` abfragen)

**Phase 1 ohne Dashboard-Tab erlaubt** – kann später ergänzt werden.

---

## 10. Sicherheitshinweise

1. **Webhook-Secret prüfen**: Bei jedem Request mit `hash_equals` (gegen
   Timing-Angriffe). Bei Mismatch HTTP 403.

2. **Chat-ID-Whitelist**: Nur die in `config.telegram.allowed_chat_id` eingetragene
   ID darf den Bot steuern. Fremde Anfragen werden geloggt (Event-Log + ggf.
   verdächtige Telegram-User-IDs), aber nicht beantwortet.

3. **Token niemals loggen**: Bei Fehlern in Logs niemals den vollen Bot-Token
   ausgeben (z.B. nur `$token[:8] . '...'`).

4. **Prepared Statements**: Bei allen DB-Queries (nicht eskalieren, weil die Daten
   nur lesend sind, aber gute Praxis).

5. **Rate-Limit**: Telegram limitiert Bot-Sends auf 30 Msg/Sek. Bei langen
   Listen ggf. zusammenfassen statt mehrere Einzel-Nachrichten.

6. **MarkdownV2-Escape**: ALLE dynamischen Strings vor dem Einfügen in
   Telegram-Nachrichten durch `tg_escape()` jagen. Sonst antwortet Telegram mit
   `Bad Request: can't parse entities`.

---

## 11. Testen

### Lokaler Test ohne Telegram

`api/telegram-webhook.php` kann mit einem präparierten cURL-Call lokal getestet
werden:

```bash
curl -X POST "https://prolific.nickkrakow.de/api/telegram-webhook.php?s={SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 999999,
    "message": {
      "message_id": 1,
      "from": { "id": 12345 },
      "chat": { "id": 12345, "type": "private" },
      "date": 1700000000,
      "text": "/status"
    }
  }'
```

Wichtig: `chat.id` auf die echte `allowed_chat_id` setzen, sonst lehnt das Skript
ab. `update_id` bei jedem Test ändern (UNIQUE-Constraint).

### Echter Test in Telegram

1. Setup-Skript aufrufen (siehe Abschnitt 8)
2. Im Telegram-Chat mit dem Bot `/start` schreiben
3. Erwarte sofortige Antwort
4. Optional: `telegram_messages`-Tabelle checken – Einträge sollten erscheinen

---

## 12. Datei-Liste (Deliverables)

Neue Dateien:
- `api/telegram-webhook.php` – Webhook-Empfänger + Dispatcher
- `api/telegram-setup.php` – Einmaliger Webhook-Registrierungs-Helper
- ggf. `api/_telegram.php` oder Ergänzung von `api/_common.php`

Geänderte Dateien:
- `config.example.php` – neuer `telegram`-Block (Platzhalter)
- `hash-generator.php` – neuer Output (D) Webhook-Secret
- `install.php` – neue Tabelle `telegram_messages` + Übersichts-Update
- `README.md` – Setup-Schritte für Telegram-Bot

---

## 13. Umsetzungsreihenfolge

1. `install.php` um neue Tabelle erweitern, einmal lokal/auf Server aufrufen
2. `config.example.php` und `hash-generator.php` für Webhook-Secret aktualisieren
3. `_common.php` (oder `_telegram.php`) um Telegram-API-Helper ergänzen
4. `api/telegram-webhook.php` bauen – mit Minimal-Dispatcher (nur `/start`,
   `/help`, `/status`)
5. `api/telegram-setup.php` bauen
6. Lokal mit cURL gegen den eigenen Server testen
7. Setup-Skript aufrufen, in Telegram `/start` testen
8. Weitere Befehle (`/earnings`, `/balance`, `/studies`, `/quote`, `/today`)
   einzeln ergänzen, jeweils testen
9. Setup-Skript per FTP löschen
10. Optional: Dashboard-Tab "Bot"

---

## 14. Offene Punkte (zu klären während der Umsetzung)

- **Earnings-Logik wiederverwenden**: Soll `build_overview()` aus `data.php` in
  `_common.php` extrahiert werden? Empfehlung: Ja, in eine neue `_earnings.php`,
  beide Dateien laden sie. Vermeidet Code-Duplikation.
- **Mehrere User?**: Nein, Single-User. Die `allowed_chat_id` ist ein einzelner
  Wert.
- **Inline-Buttons in Antworten?**: Phase 1: Nur Text + URLs. Inline-Buttons
  (`/studies` → Button "Öffnen") wären sinnvoll, aber später.
- **Tagesbericht automatisch?**: Cron auf Shared-Hosting ist umständlich (kein
  Long-Running). Falls gewünscht: All-Inkl bietet im KAS Cronjobs an, dann ein
  separates `cron-daily-report.php` schreiben. Nicht Teil von Phase 1.

---

## 15. Backlog: weitere sinnvolle Bot-Befehle

Diese Befehle sind nicht Teil der ersten drei Telegram-Phasen, aber als naechste
Ausbaustufe zur Umsetzung freigegeben. `/requester` und `/study` werden bewusst
nicht umgesetzt, weil die aktuelle Dashboard-Auswertung diese Detailabfragen
ausreichend abdeckt.

| Befehl | Zweck |
|--------|-------|
| `/pending` | Offene Teilnahmen, offene Summen, aelteste offene Teilnahme, aelter als 7/14 Tage |
| `/month` | Aktueller Monat kompakt: verdient, pending, Zielerreichung, Prognose Monatsende |
| `/goals` | Tagesziel und Monatsziel: erreicht, offen, Prozent |
| `/top` | Top-Studien nach Gesamtverguetung und Stundenlohn |
| `/stats` | Status-Verteilung: Approved, Awaiting Review, Screened Out, Returned, Timed-Out plus Raten |
| `/sync` | Technischer Sync-Status: letzter Sync, letzter erfolgreicher Sync, letzter Fehler, Webhook-Status |
| `/export` | Link zum CSV-Export, ohne Dateiuebertragung ueber Telegram |
| `/active` | Kurzform von `/studies`: Anzahl und beste drei aktive Studien |
| `/last` | Letzte Teilnahmen mit Status, Betrag und Zeitpunkt |
| `/compare` | Entwicklung aktueller Monat gegen Vormonat |
| `/heatmap` | Tagesuebersicht fuer den aktuellen Monat |
| `/week` | Aktuelle Woche kompakt: verdient, pending, Teilnahmen |
| `/setgoal day <betrag>` | Tagesziel in EUR setzen |
| `/setgoal month <betrag>` | Monatsziel in EUR setzen |
| `/sethourly good <betrag>` | Grenze fuer sehr guten Stundenlohn in EUR setzen |
| `/sethourly ok <betrag>` | Grenze fuer Okay-Stundenlohn in EUR setzen |
| `/report on <HH:MM>` | Tagesbericht als Telegram-Praeferenz aktivieren |
| `/report off` | Tagesbericht als Telegram-Praeferenz deaktivieren |
| `/mute <dauer>` | Telegram-Meldungen fuer eine Dauer pausieren |
| `/unmute` | Telegram-Pause aufheben |
| `/delete_logs` | Telegram-Nachrichtenlog loeschen |

### Dashboard-Ausloesung der Telegram-Befehle

Die Befehle werden im System-Tab in der Telegram-Bot-Card als anklickbare
Buttons angezeigt:

- Befehle ohne Variablen senden die entsprechende Nachricht direkt an Telegram.
- Befehle mit Variablen oeffnen ein kleines Modal mit Befehlsname, Dropdowns bzw.
  Eingabefeldern und Senden-Button.
- `/delete_logs` oeffnet ein Bestaetigungsmodal.
- Dashboard-Requests laufen ueber einen sessiongeschuetzten POST-Endpunkt in
  `api/data.php` und verwenden denselben Dispatcher wie der Telegram-Webhook.
- Secrets aus `config.php` werden weder im Dashboard noch in Antworten
  ausgegeben.
