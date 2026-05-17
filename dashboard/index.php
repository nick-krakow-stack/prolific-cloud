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

    if (do_login($username, $password)) {
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
    }

    $error = 'Benutzername oder Passwort falsch.';

    if (!empty($config['log_failed_logins'])) {
        log_event('login_failed', 'Fehlgeschlagener Login', [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
            'username' => $username,
        ]);
    }

    // Kurze Verzögerung gegen Brute-Force
    usleep(500_000);
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