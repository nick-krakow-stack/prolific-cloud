<?php
/**
 * Telegram webhook endpoint.
 */

declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/_telegram.php';

if (!telegram_require_webhook_secret() || !telegram_verify_secret_token_header()) {
    http_response_code(403);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Nur POST erlaubt.', 405);
}

$update = read_json_body();
$updateId = isset($update['update_id']) ? (int)$update['update_id'] : 0;
if ($updateId <= 0) {
    json_response(['ok' => true, 'ignored' => true]);
}

$message = $update['message'] ?? null;
if (!is_array($message)) {
    json_response(['ok' => true, 'ignored' => true]);
}

$chat = $message['chat'] ?? [];
$from = $message['from'] ?? [];
$chatId = $chat['id'] ?? null;
$fromUser = telegram_from_user_label(is_array($from) ? $from : []);
$text = isset($message['text']) ? trim((string)$message['text']) : '';
$command = telegram_parse_command($text);
$pdo = db();

if (!telegram_claim_update($pdo, $updateId, $chatId, $fromUser, $text, $command)) {
    json_response(['ok' => true, 'duplicate' => true]);
}

if (!telegram_is_allowed_chat($chatId)) {
    log_event('telegram_rejected_chat', 'Telegram chat is not allowed', [
        'chat_id' => $chatId,
        'from_user' => $fromUser,
        'command' => $command,
    ]);
    telegram_log_message($pdo, $updateId, $chatId, $fromUser, $text, $command, false, 'chat_not_allowed');
    json_response(['ok' => true, 'ignored' => true]);
}

if ($text === '' || strpos($text, '/') !== 0) {
    telegram_log_message($pdo, $updateId, $chatId, $fromUser, $text, null, false, 'not_a_command');
    json_response(['ok' => true, 'ignored' => true]);
}

$responseText = telegram_dispatch_command($command, $chatId);
$sent = send_telegram_message((int)$chatId, $responseText);
telegram_log_message($pdo, $updateId, $chatId, $fromUser, $text, $command, $sent, $sent ? null : 'send_failed');

json_response(['ok' => true, 'sent' => $sent]);

function telegram_parse_command(string $text): string {
    $first = preg_split('/\s+/', trim($text))[0] ?? '';
    $withoutBotName = explode('@', $first, 2)[0];

    return strtolower($withoutBotName);
}

function telegram_from_user_label(array $from): string {
    $parts = [];
    foreach (['username', 'first_name', 'last_name'] as $key) {
        $value = trim((string)($from[$key] ?? ''));
        if ($value !== '') {
            $parts[] = $value;
        }
    }

    if (empty($parts) && isset($from['id'])) {
        $parts[] = (string)$from['id'];
    }

    return implode(' ', $parts);
}

function telegram_dispatch_command(string $command, $chatId): string {
    switch ($command) {
        case '/start':
            return telegram_help_message(true);
        case '/help':
            return telegram_help_message(false);
        case '/status':
            return telegram_status_message();
        default:
            return "🤔 Unbekannter Befehl: `" . tg_escape($command) . "`\n\n"
                . "Tippe /help für eine Liste verfügbarer Befehle\\.";
    }
}

function telegram_help_message(bool $withGreeting): string {
    $lines = [];

    if ($withGreeting) {
        $lines[] = "👋 Willkommen beim *Prolific Watcher*";
        $lines[] = '';
    }

    $lines[] = "Verfügbare Befehle:";
    $lines[] = "/status \\- aktueller Zustand";
    $lines[] = "/help \\- Hilfe";

    return implode("\n", $lines);
}

function telegram_status_message(): string {
    $pdo = db();
    $activeStudies = (int)$pdo->query('SELECT COUNT(*) FROM studies WHERE is_active = 1')->fetchColumn();
    $lastSyncAt = get_setting('lastSyncAt');
    $lastSyncMeta = get_setting('lastSyncMeta');
    $meta = is_array($lastSyncMeta) ? $lastSyncMeta : [];
    $extensionVersion = (string)($meta['extensionVersion'] ?? 'unbekannt');

    $lines = [
        "📊 *Status*",
        '',
        '🟢 Aktive Studien: ' . tg_escape((string)$activeStudies),
        '⏱ Letzter Sync: ' . tg_escape(telegram_relative_time($lastSyncAt)),
        '🔐 Auth: OK',
        '📡 Plugin\\-Version: ' . tg_escape($extensionVersion),
    ];

    if (telegram_sync_is_stale($lastSyncAt)) {
        $lines[] = '';
        $lines[] = '⚠️ Plugin synct nicht \\- PC vermutlich aus oder Sync deaktiviert\\.';
    }

    return implode("\n", $lines);
}

function telegram_relative_time($timestamp): string {
    if (!is_string($timestamp) || trim($timestamp) === '') {
        return 'nie';
    }

    try {
        $then = new DateTime($timestamp);
        $now = new DateTime('now', new DateTimeZone(date_default_timezone_get()));
    } catch (Throwable $e) {
        return 'unbekannt';
    }

    $diff = max(0, $now->getTimestamp() - $then->getTimestamp());
    if ($diff < 60) {
        return 'gerade eben';
    }

    $minutes = intdiv($diff, 60);
    if ($minutes < 60) {
        return 'vor ' . $minutes . ' Min';
    }

    $hours = intdiv($minutes, 60);
    if ($hours < 24) {
        return 'vor ' . $hours . ' Std';
    }

    return 'vor ' . intdiv($hours, 24) . ' Tg';
}

function telegram_sync_is_stale($timestamp): bool {
    if (!is_string($timestamp) || trim($timestamp) === '') {
        return true;
    }

    try {
        $then = new DateTime($timestamp);
        $now = new DateTime('now', new DateTimeZone(date_default_timezone_get()));
    } catch (Throwable $e) {
        return true;
    }

    return ($now->getTimestamp() - $then->getTimestamp()) > 30 * 60;
}
