<?php
/**
 * Gemeinsame Funktionen für alle API-Endpoints.
 */

declare(strict_types=1);

// In Produktion: Fehler nicht ausgeben, nur loggen
error_reporting(E_ALL);
ini_set('display_errors', '0');

// Config laden
$configFile = __DIR__ . '/../config.php';
if (!file_exists($configFile)) {
    json_error('Server nicht konfiguriert (config.php fehlt).', 500);
}
$config = require $configFile;

// Zeitzone setzen
date_default_timezone_set($config['timezone'] ?? 'Europe/Berlin');

if (!empty($config['debug'])) {
    ini_set('display_errors', '1');
}

/**
 * Liefert eine PDO-Verbindung. Wird nur bei Bedarf erzeugt.
 */
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        global $config;
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
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            json_error('Datenbank nicht erreichbar.', 500);
        }
    }
    return $pdo;
}

/**
 * Konstant-Zeit-String-Vergleich (gegen Timing-Angriffe auf den API-Key).
 */
function safe_equals(string $a, string $b): bool {
    return hash_equals($a, $b);
}

/**
 * Prüft den API-Key in den Request-Headern. Bei Fehler: 401 + Abbruch.
 */
function require_api_key(): void {
    global $config;
    $expected = $config['api_key'] ?? '';
    if (empty($expected) || str_contains($expected, 'HIER_')) {
        json_error('API-Key nicht konfiguriert.', 500);
    }

    // Header lesen (Apache vs. Nginx/FastCGI handhaben es unterschiedlich)
    $provided = $_SERVER['HTTP_X_API_KEY']
              ?? $_SERVER['HTTP_X_APIKEY']
              ?? ($_SERVER['REDIRECT_HTTP_X_API_KEY'] ?? '');

    if (empty($provided) || !safe_equals($expected, $provided)) {
        log_event('auth_failed_api', 'Ungültiger API-Key', [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '?',
        ]);
        json_error('Ungültiger API-Key.', 401);
    }
}

/**
 * Liest den JSON-Body des Requests.
 */
function read_json_body(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_error('Ungültiger JSON-Body.', 400);
    }
    return $data;
}

/**
 * Antwortet mit JSON.
 */
function json_response(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Antwortet mit Fehler-JSON.
 */
function json_error(string $message, int $status = 400, array $extra = []): void {
    json_response(array_merge(['ok' => false, 'error' => $message], $extra), $status);
}

/**
 * Event in die DB schreiben (best-effort, schlägt nicht den Request fehl).
 */
function log_event(string $type, string $message = '', ?array $data = null): void {
    try {
        $stmt = db()->prepare(
            "INSERT INTO events (`type`, `message`, `data_json`) VALUES (?, ?, ?)"
        );
        $stmt->execute([$type, $message, $data ? json_encode($data) : null]);
    } catch (Throwable $e) {
        // Logging-Fehler dürfen den eigentlichen Request nicht killen
    }
}

/**
 * ISO-Timestamp → MySQL DATETIME (YYYY-MM-DD HH:MM:SS).
 * Gibt NULL zurück wenn der Input leer/ungültig ist.
 */
function iso_to_datetime(?string $iso): ?string {
    if (empty($iso)) return null;
    try {
        $dt = new DateTime($iso);
        $dt->setTimezone(new DateTimeZone(date_default_timezone_get()));
        return $dt->format('Y-m-d H:i:s');
    } catch (Throwable $e) {
        return null;
    }
}

/**
 * Holt ein Setting aus der DB.
 */
function get_setting(string $key, $default = null) {
    try {
        $stmt = db()->prepare("SELECT `value` FROM settings WHERE `key` = ?");
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        if (!$row) return $default;
        $decoded = json_decode($row['value'], true);
        return $decoded !== null ? $decoded : $row['value'];
    } catch (Throwable $e) {
        return $default;
    }
}

/**
 * Speichert ein Setting in der DB (JSON-serialisiert).
 */
function set_setting(string $key, $value): void {
    $json = is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE);
    $stmt = db()->prepare(
        "INSERT INTO settings (`key`, `value`) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)"
    );
    $stmt->execute([$key, $json]);
}
