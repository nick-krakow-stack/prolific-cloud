<?php
/**
 * Session-Helpers fürs Dashboard.
 */

declare(strict_types=1);

function start_session_safe(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    global $config;

    if (!isset($config)) {
        $config = require __DIR__ . '/../config.php';
    }

    $lifetime = $config['session_lifetime'] ?? 30 * 24 * 60 * 60;

    session_set_cookie_params([
        'lifetime' => $lifetime,
        'path'     => '/',
        'domain'   => '',
        'secure'   => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_name('PROLIFIC_SESSION');
    session_start();

    // Periodische Session-ID-Rotation gegen Fixation
    if (empty($_SESSION['__started_at'])) {
        $_SESSION['__started_at'] = time();
    } elseif (time() - $_SESSION['__started_at'] > 3600) {
        session_regenerate_id(true);
        $_SESSION['__started_at'] = time();
    }
}

function is_logged_in(): bool {
    start_session_safe();

    return !empty($_SESSION['user']);
}

function require_login(): void {
    if (is_logged_in()) {
        return;
    }

    if (strpos($_SERVER['REQUEST_URI'] ?? '', '/api/') !== false) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'ok' => false,
            'error' => 'Nicht angemeldet.',
        ]);
        exit;
    }

    // Sonst Redirect zum Login über Root, damit /dashboard/ nicht sichtbar wird
    header('Location: /');
    exit;
}

function do_login(string $username, string $password): bool {
    global $config;

    if (!isset($config)) {
        $config = require __DIR__ . '/../config.php';
    }

    $expectedUser = $config['dashboard']['username'] ?? '';
    $expectedHash = $config['dashboard']['password_hash'] ?? '';

    // Konstante Zeit gegen Timing-Angriffe
    $userOk = hash_equals($expectedUser, $username);
    $passOk = !empty($expectedHash) && password_verify($password, $expectedHash);

    if (!$userOk || !$passOk) {
        return false;
    }

    start_session_safe();
    session_regenerate_id(true);

    $_SESSION['user'] = $username;
    $_SESSION['__started_at'] = time();

    return true;
}

function do_logout(): void {
    start_session_safe();

    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();

        setcookie(session_name(), '', [
            'expires'  => time() - 42000,
            'path'     => $params['path'],
            'domain'   => $params['domain'],
            'secure'   => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'] ?? 'Lax',
        ]);
    }

    session_destroy();
}
