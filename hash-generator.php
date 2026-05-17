<?php
/**
 * Passwort-Hash Generator
 *
 * Einmalig aufrufen, Passwort eingeben.
 * Erzeugt 3 Werte für config.php:
 *   (A) Passwort-Hash    → dashboard.password_hash
 *   (B) API-Key          → api_key
 *   (C) Session-Secret   → session_secret
 *
 * Alle 3 Werte müssen in die config.php übertragen werden!
 * Danach diese Datei LÖSCHEN.
 */

header('Content-Type: text/html; charset=utf-8');

$hash = null;
$plain = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $plain = $_POST['password'] ?? '';
    if (strlen($plain) < 8) {
        $error = 'Passwort muss mindestens 8 Zeichen lang sein.';
    } else {
        $hash = password_hash($plain, PASSWORD_DEFAULT);
    }
}

// API-Key + Session-Secret werden bei jedem Aufruf neu generiert
// (sind aber gleich gut - der User soll einen aussuchen und übernehmen)
$apiKey        = bin2hex(random_bytes(24));   // 48 Zeichen hex
$sessionSecret = bin2hex(random_bytes(24));
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Passwort-Hash Generator</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 740px; margin: 40px auto; padding: 0 20px; background: #f5f6f7; }
  .box { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 16px; }
  h1 { margin-top: 0; }
  h2 { margin-top: 0; }
  input[type=password], input[type=text] { width: 100%; padding: 10px; box-sizing: border-box;
        font-family: ui-monospace, monospace; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; }
  button { padding: 10px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
  .hash { background: #f1f3f5; padding: 12px; border-radius: 4px; word-break: break-all;
          font-family: ui-monospace, monospace; font-size: 12px; user-select: all; border: 1px solid #e5e7eb; }
  .err { background: #fee; border-left: 4px solid #f87171; padding: 12px; }
  .ok { background: #d1fae5; border-left: 4px solid #10b981; padding: 12px; }
  .warn { background: #fef9c3; border-left: 4px solid #eab308; padding: 12px; margin-top: 16px; }
  .info { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 12px; margin-top: 16px; }
  label { font-weight: 600; }
  small { color: #666; }
  .target { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .target code { background: #fef3c7; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
  .label-tag { display: inline-block; background: #2563eb; color: white; font-weight: 700;
               padding: 2px 8px; border-radius: 4px; font-size: 13px; margin-right: 6px; }
  .checklist { background: #f1f5f9; padding: 14px 18px; border-radius: 6px; margin-top: 12px; }
  .checklist ul { margin: 8px 0; padding-left: 20px; }
  .checklist li { margin: 4px 0; }
</style>
</head>
<body>

<div class="box">
  <h1>🔐 Konfigurations-Werte für config.php</h1>
  <p>Diese Seite erzeugt <strong>3 Werte</strong>, die alle in die <code>config.php</code> eingetragen werden müssen.</p>

  <div class="checklist">
    <strong>Übertragungs-Checkliste:</strong>
    <ul>
      <li><span class="label-tag">A</span> Passwort-Hash → <code>dashboard.password_hash</code></li>
      <li><span class="label-tag">B</span> API-Key → <code>api_key</code></li>
      <li><span class="label-tag">C</span> Session-Secret → <code>session_secret</code></li>
    </ul>
  </div>
</div>

<!-- (A) Passwort-Hash -->
<div class="box">
  <h2><span class="label-tag">A</span> Passwort-Hash</h2>
  <p>Gib dein Wunsch-Passwort fürs Dashboard ein (mind. 8 Zeichen).</p>

  <form method="post">
    <label>Passwort:</label>
    <input type="password" name="password" required minlength="8" autofocus>
    <p style="margin-top:12px"><button type="submit">Hash erzeugen</button></p>
  </form>

  <?php if (!empty($error)): ?>
    <div class="err"><?= htmlspecialchars($error) ?></div>
  <?php endif; ?>

  <?php if ($hash): ?>
    <div class="ok">
      <p><strong>✓ Hash erzeugt:</strong></p>
      <p class="hash"><?= htmlspecialchars($hash) ?></p>
      <p class="target">→ In <code>config.php</code> bei <code>'password_hash' => '...'</code> einfügen</p>
    </div>
  <?php else: ?>
    <div class="info">
      <strong>Hinweis:</strong> Erst Passwort eingeben und auf "Hash erzeugen" klicken,
      damit Wert (A) angezeigt wird.
    </div>
  <?php endif; ?>
</div>

<!-- (B) API-Key -->
<div class="box">
  <h2><span class="label-tag">B</span> API-Key (fürs Chrome-Plugin)</h2>
  <p>Wird zur Authentifizierung des Plugins beim Server verwendet. Wird bei jedem Aufruf neu generiert.</p>
  <p class="hash"><?= $apiKey ?></p>
  <p class="target">→ In <code>config.php</code> bei <code>'api_key' => '...'</code> einfügen<br>
                    → Und im Chrome-Plugin unter "Cloud-Sync" denselben Wert eintragen</p>
</div>

<!-- (C) Session-Secret -->
<div class="box">
  <h2><span class="label-tag">C</span> Session-Secret</h2>
  <p>Wird vom Dashboard für Login-Sessions verwendet.</p>
  <p class="hash"><?= $sessionSecret ?></p>
  <p class="target">→ In <code>config.php</code> bei <code>'session_secret' => '...'</code> einfügen</p>
</div>

<div class="warn">
  <strong>⚠️ Wichtig nach dem Übertragen:</strong>
  <ul style="margin:8px 0">
    <li>Alle 3 Werte (A, B, C) müssen in <code>config.php</code> stehen</li>
    <li>Diese Datei (<code>hash-generator.php</code>) per FTP <strong>löschen</strong></li>
    <li>Auch <code>install.php</code> und <code>config.example.php</code> löschen</li>
  </ul>
</div>

</body>
</html>
