<?php
/**
 * Prolific Watcher - Installations-Skript
 *
 * EINMALIG nach dem Hochladen aufrufen:
 *   https://prolific.nickkrakow.de/install.php
 *
 * Prüft die DB-Verbindung, legt alle Tabellen an.
 * Nach erfolgreicher Installation: Datei vom Server LÖSCHEN!
 */

declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '1');

header('Content-Type: text/html; charset=utf-8');

// Config laden
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    die_html('Fehler: <code>config.php</code> nicht gefunden. Bitte zuerst <code>config.example.php</code> nach <code>config.php</code> kopieren und ausfüllen.');
}
$config = require $configFile;

// Plausibilitätscheck
if (strpos($config['db']['password'] ?? '', 'HIER_DEIN_DB_PASSWORT') !== false) {
    die_html('Fehler: Bitte zuerst das DB-Passwort in <code>config.php</code> eintragen.');
}
if (strpos($config['api_key'] ?? '', 'HIER_LANGER') !== false) {
    die_html('Fehler: Bitte zuerst einen API-Key in <code>config.php</code> eintragen.');
}

// DB-Verbindung testen
try {
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['db']['host'],
        $config['db']['name'],
        $config['db']['charset']
    );
    $pdo = new PDO($dsn, $config['db']['user'], $config['db']['password'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    die_html('Fehler: DB-Verbindung fehlgeschlagen.<br><pre>' . htmlspecialchars($e->getMessage()) . '</pre>');
}

// Tabellen-Schema
// Hinweis: ENGINE=InnoDB für saubere Transaktionen, utf8mb4 für volle Unicode-Unterstützung.
$statements = [

// === studies: alle gemeldeten Studien (Notification-Historie) ===
"CREATE TABLE IF NOT EXISTS `studies` (
    `id`                VARCHAR(64) NOT NULL PRIMARY KEY,
    `name`              VARCHAR(500),
    `researcher_name`   VARCHAR(255),
    `reward_minor`      INT,
    `reward_currency`   VARCHAR(8),
    `estimated_minutes` INT,
    `total_places`      INT,
    `reward_per_hour`   INT,
    `first_seen`        DATETIME,
    `last_seen`         DATETIME,
    `is_active`         TINYINT(1) DEFAULT 1,
    `expired`           TINYINT(1) DEFAULT 0,
    `expired_at`        DATETIME NULL,
    `times_notified`    INT DEFAULT 1,
    `notified`          TINYINT(1) DEFAULT 0,
    `dismissed`         TINYINT(1) DEFAULT 0,
    `verified_by`       VARCHAR(32),
    `updated_at`        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_first_seen` (`first_seen`),
    INDEX `idx_is_active` (`is_active`),
    INDEX `idx_expired` (`expired`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

// === submissions: alle Teilnahmen mit Verdienst ===
"CREATE TABLE IF NOT EXISTS `submissions` (
    `id`                        VARCHAR(64) NOT NULL PRIMARY KEY,
    `study_id`                  VARCHAR(64),
    `study_name`                VARCHAR(500),
    `researcher_name`           VARCHAR(255),
    `researcher_country`        VARCHAR(100),
    `institution`               VARCHAR(255),
    `status`                    VARCHAR(32),
    `base_reward_minor`         INT,
    `adjustment_amount_minor`   INT DEFAULT 0,
    `adjustment_type`           VARCHAR(16) NULL,
    `bonus_amount_minor`        INT DEFAULT 0,
    `screened_out_amount_minor` INT DEFAULT 0,
    `reward_amount_minor`       INT,
    `reward_currency`           VARCHAR(8),
    `started_at`                DATETIME NULL,
    `completed_at`              DATETIME NULL,
    `time_taken_seconds`        INT NULL,
    `provider`                  VARCHAR(32) DEFAULT 'prolific',
    `updated_at`                DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_study_id` (`study_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_started_at` (`started_at`),
    INDEX `idx_completed_at` (`completed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

// === settings: Key-Value-Store für Plugin-State (Balance, FX-Rates etc.) ===
"CREATE TABLE IF NOT EXISTS `settings` (
    `key`        VARCHAR(64) NOT NULL PRIMARY KEY,
    `value`      TEXT,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

// === events: Append-Only-Log für Audit & Debugging ===
"CREATE TABLE IF NOT EXISTS `events` (
    `id`        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `type`      VARCHAR(64),
    `message`   VARCHAR(500),
    `data_json` TEXT NULL,
    INDEX `idx_timestamp` (`timestamp`),
    INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

// === sync_log: Wann hat das Plugin zuletzt gesynct ===
"CREATE TABLE IF NOT EXISTS `sync_log` (
    `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `timestamp`    DATETIME DEFAULT CURRENT_TIMESTAMP,
    `studies_count` INT DEFAULT 0,
    `submissions_count` INT DEFAULT 0,
    `client_ip`    VARCHAR(45),
    `user_agent`   VARCHAR(255),
    INDEX `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

// === telegram_messages: eingehende Telegram-Updates und Replay-Schutz ===
"CREATE TABLE IF NOT EXISTS `telegram_messages` (
    `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `update_id`      BIGINT UNSIGNED NOT NULL UNIQUE,
    `chat_id`        BIGINT,
    `from_user`      VARCHAR(255),
    `text`           TEXT,
    `command`        VARCHAR(64),
    `received_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
    `response_sent`  TINYINT(1) DEFAULT 0,
    `response_error` VARCHAR(500),
    INDEX `idx_received_at` (`received_at`),
    INDEX `idx_chat_id` (`chat_id`),
    INDEX `idx_command` (`command`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

// === extra_income_sessions: manuell erfasste Chatmoderator-Arbeitszeiten ===
"CREATE TABLE IF NOT EXISTS `extra_income_sessions` (
    `id`                       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `started_at`               DATETIME NOT NULL,
    `ended_at`                 DATETIME NOT NULL,
    `message_count`            INT NOT NULL DEFAULT 0,
    `night_bonus_enabled`      TINYINT(1) NOT NULL DEFAULT 1,
    `bonus_mode`               VARCHAR(20) NOT NULL DEFAULT 'none',
    `bonus_threshold_messages` INT NOT NULL DEFAULT 0,
    `bonus_amount_cents`       INT NOT NULL DEFAULT 0,
    `created_at`               DATETIME NOT NULL,
    `updated_at`               DATETIME NOT NULL,
    INDEX `idx_extra_income_sessions_started_at` (`started_at`),
    INDEX `idx_extra_income_sessions_ended_at` (`ended_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

// === extra_income_timer: aktuell laufende Zusatzeinkommen-Session ===
"CREATE TABLE IF NOT EXISTS `extra_income_timer` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `singleton_key` TINYINT NOT NULL DEFAULT 1,
    `started_at`    DATETIME NOT NULL,
    `created_at`    DATETIME NOT NULL,
    UNIQUE KEY `uq_extra_income_timer_singleton` (`singleton_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

// === extra_income_payouts: als ausgezahlt markierte Abrechnungszeiträume ===
"CREATE TABLE IF NOT EXISTS `extra_income_payouts` (
    `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `period_start`   DATE NOT NULL,
    `period_end`     DATE NOT NULL,
    `gross_cents`    INT NOT NULL DEFAULT 0,
    `fee_cents`      INT NOT NULL DEFAULT 0,
    `net_cents`      INT NOT NULL DEFAULT 0,
    `marked_paid_at` DATETIME NOT NULL,
    `created_at`     DATETIME NOT NULL,
    INDEX `idx_extra_income_payouts_period` (`period_start`, `period_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

$created = [];
$errors = [];
foreach ($statements as $sql) {
    try {
        $pdo->exec($sql);
        // Tabellennamen aus dem CREATE-Statement extrahieren
        if (preg_match('/CREATE TABLE IF NOT EXISTS `(\w+)`/', $sql, $m)) {
            $created[] = $m[1];
        }
    } catch (PDOException $e) {
        $errors[] = $e->getMessage();
    }
}

// Existieren die Tabellen jetzt wirklich?
$existing = [];
$stmt = $pdo->query("SHOW TABLES");
while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
    $existing[] = $row[0];
}

?><!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Prolific Watcher - Installation</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 700px; margin: 40px auto;
         padding: 0 20px; background: #f5f6f7; color: #1a1a1a; }
  .box { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
         margin-bottom: 16px; }
  h1 { margin-top: 0; }
  .ok { color: #166534; }
  .err { color: #991b1b; }
  ul { line-height: 1.8; }
  code { background: #f1f3f5; padding: 2px 6px; border-radius: 4px; font-size: 90%; }
  .next-steps { background: #fef9c3; border-left: 4px solid #eab308; }
</style>
</head>
<body>

<div class="box">
  <h1>🚀 Installation</h1>
  <p>Datenbank-Setup für den Prolific Watcher.</p>
</div>

<div class="box">
  <h2>📦 Tabellen</h2>
  <ul>
    <?php foreach (['studies','submissions','settings','events','sync_log','telegram_messages','extra_income_sessions','extra_income_timer','extra_income_payouts'] as $t): ?>
      <li>
        <code><?= htmlspecialchars($t) ?></code>:
        <?php if (in_array($t, $existing, true)): ?>
          <span class="ok">✓ existiert</span>
        <?php else: ?>
          <span class="err">✗ fehlt</span>
        <?php endif; ?>
      </li>
    <?php endforeach; ?>
  </ul>
</div>

<?php if (!empty($errors)): ?>
<div class="box">
  <h2 class="err">⚠️ Fehler</h2>
  <ul>
    <?php foreach ($errors as $e): ?>
      <li><code><?= htmlspecialchars($e) ?></code></li>
    <?php endforeach; ?>
  </ul>
</div>
<?php else: ?>
<div class="box next-steps">
  <h2>✅ Installation erfolgreich</h2>
  <p><strong>Jetzt unbedingt:</strong></p>
  <ol>
    <li>Diese Datei (<code>install.php</code>) per FTP <strong>löschen</strong>! Sonst kann
        sie von außen wieder aufgerufen werden.</li>
    <li>Falls noch nicht passiert: <code>hash-generator.php</code> aufrufen, ein
        Dashboard-Passwort generieren, Hash in <code>config.php</code> eintragen.</li>
    <li>Dashboard testen: <a href="dashboard/">https://prolific.nickkrakow.de/dashboard/</a></li>
    <li>API-Key aus <code>config.php</code> ins Chrome-Plugin eintragen (kommt im nächsten Schritt).</li>
  </ol>
</div>
<?php endif; ?>

</body>
</html>

<?php
function die_html(string $message): void {
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fehler</title>';
    echo '<style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 20px}';
    echo '.err{background:#fee;border:1px solid #fcc;padding:16px;border-radius:8px}';
    echo 'code{background:#f5f5f5;padding:2px 6px;border-radius:4px}</style></head><body>';
    echo '<div class="err">' . $message . '</div></body></html>';
    exit;
}
