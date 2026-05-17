<?php
declare(strict_types=1);

require_once __DIR__ . '/../api/_common.php';
require_once __DIR__ . '/session.php';

/**
 * Wenn der User bereits eingeloggt ist, wird das Dashboard intern geladen.
 * Keine Weiterleitung auf app.php, damit app.php nicht in der URL erscheint.
 */
if (is_logged_in()) {
    require __DIR__ . '/app.php';
    exit;
}

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (!assert_login_rate_limit($username)) {
        $error = 'Zu viele fehlgeschlagene Versuche. Bitte versuche es in ein paar Minuten erneut.';
        usleep(500_000);
    } elseif (do_login($username, $password)) {
        log_event('login_ok', 'Dashboard-Login erfolgreich', [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ]);

        /**
         * Nach Login zurück auf Root.
         * Dadurch bleibt die sichtbare URL:
         * https://prolific-watcher.de/
         */
        header('Location: /');
        exit;
    } else {
        $error = 'Benutzername oder Passwort falsch.';

        record_failed_login_attempt($username);

        // Kurze Verzögerung gegen Brute-Force
        usleep(500_000);
    }
}

function client_ip_for_login(): string {
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

function assert_login_rate_limit(string $username): bool {
    $ip = client_ip_for_login();
    if ($ip === '') {
        return true;
    }

    $username = substr($username, 0, 128);

    try {
        $stmt = db()->prepare(
            "SELECT
                SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.ip')) = ? THEN 1 ELSE 0 END) AS ip_failures,
                SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.username')) = ? THEN 1 ELSE 0 END) AS username_failures
             FROM events
             WHERE type = 'login_failed'
               AND timestamp >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)"
        );
        $stmt->execute([$ip, $username]);
        $row = $stmt->fetch() ?: [];

        return (int)($row['ip_failures'] ?? 0) < 8
            && (int)($row['username_failures'] ?? 0) < 8;
    } catch (Throwable $e) {
        return true;
    }
}

function record_failed_login_attempt(string $username): void {
    log_event('login_failed', 'Fehlgeschlagener Login', [
        'ip' => client_ip_for_login(),
        'username' => substr($username, 0, 128),
    ]);
}
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Prolific Watcher - Login</title>
<link rel="stylesheet" href="/assets/style.css">
<link rel="icon" href="/favicon.ico" type="image/x-icon">
<meta name="theme-color" content="#1f2937">
</head>
<body class="login-page">

<div class="login-box">
  <h1>🔬 Prolific Watcher</h1>
  <p class="subtitle">Dashboard-Login</p>

  <?php if ($error): ?>
    <div class="error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
  <?php endif; ?>

  <form method="post" action="/" autocomplete="on">
    <label>
      <span>Benutzername</span>
      <input type="text" name="username" required autofocus autocomplete="username">
    </label>

    <label>
      <span>Passwort</span>
      <input type="password" name="password" required autocomplete="current-password">
    </label>

    <button type="submit">Anmelden</button>
  </form>
</div>

</body>
</html>
