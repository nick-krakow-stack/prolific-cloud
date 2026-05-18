<?php
/**
 * Telegram webhook endpoint.
 */

declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/_telegram.php';
require_once __DIR__ . '/_telegram_commands.php';

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
$chatId = is_array($chat) ? ($chat['id'] ?? null) : null;
$fromUser = telegram_from_user_label(is_array($from) ? $from : []);
$text = isset($message['text']) ? trim((string)$message['text']) : '';
$parsed = telegram_parse_command_text($text);
$command = (string)($parsed['command'] ?? '');
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

$responseText = telegram_dispatch_command($parsed, $pdo, $updateId);
$sent = send_telegram_message((int)$chatId, $responseText);
telegram_log_message($pdo, $updateId, $chatId, $fromUser, $text, $command, $sent, $sent ? null : 'send_failed');

json_response(['ok' => true, 'sent' => $sent]);
