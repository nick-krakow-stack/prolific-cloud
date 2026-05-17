<?php
/**
 * Telegram webhook helpers.
 */

declare(strict_types=1);

function telegram_config(): array {
    global $config;

    $telegram = $config['telegram'] ?? [];
    return is_array($telegram) ? $telegram : [];
}

function telegram_require_webhook_secret(): bool {
    $telegram = telegram_config();
    $expected = (string)($telegram['webhook_secret'] ?? '');
    $provided = (string)($_GET['s'] ?? '');

    return $expected !== ''
        && $provided !== ''
        && hash_equals($expected, $provided);
}

function telegram_verify_secret_token_header(): bool {
    $telegram = telegram_config();
    $expected = (string)($telegram['webhook_secret'] ?? '');
    $provided = (string)($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '');

    return $expected === ''
        || $provided === ''
        || hash_equals($expected, $provided);
}

function telegram_is_allowed_chat($chatId): bool {
    $telegram = telegram_config();
    $allowed = (string)($telegram['allowed_chat_id'] ?? '');

    return $allowed !== '' && hash_equals($allowed, (string)$chatId);
}

function telegram_has_seen_update(PDO $pdo, int $updateId): bool {
    $stmt = $pdo->prepare('SELECT 1 FROM telegram_messages WHERE update_id = ? LIMIT 1');
    $stmt->execute([$updateId]);

    return (bool)$stmt->fetchColumn();
}

function telegram_claim_update(
    PDO $pdo,
    int $updateId,
    $chatId,
    ?string $fromUser,
    ?string $text,
    ?string $command
): bool {
    $stmt = $pdo->prepare(
        "INSERT IGNORE INTO telegram_messages
            (update_id, chat_id, from_user, text, command, response_sent)
         VALUES (?, ?, ?, ?, ?, 0)"
    );
    $stmt->execute([
        $updateId,
        $chatId === null ? null : (string)$chatId,
        $fromUser,
        $text,
        $command,
    ]);

    return $stmt->rowCount() === 1;
}

function telegram_log_message(
    PDO $pdo,
    int $updateId,
    $chatId,
    ?string $fromUser,
    ?string $text,
    ?string $command,
    bool $responseSent,
    ?string $responseError = null
): void {
    $stmt = $pdo->prepare(
        "UPDATE telegram_messages
         SET response_sent = ?,
             response_error = ?
         WHERE update_id = ?"
    );
    $stmt->execute([
        $responseSent ? 1 : 0,
        $responseError,
        $updateId,
    ]);
}

function tg_escape(string $text): string {
    return preg_replace('/([_*\[\]()~`>#+\-=|{}.!\\\\])/', '\\\\$1', $text) ?? '';
}

function send_telegram_message(int $chatId, string $text, array $options = []): bool {
    global $config;

    $token = (string)($config['telegram']['bot_token'] ?? '');
    if ($token === '') {
        return false;
    }

    $body = [
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => $options['parse_mode'] ?? 'MarkdownV2',
        'disable_web_page_preview' => $options['disable_preview'] ?? true,
    ];

    if (!empty($options['reply_markup'])) {
        $body['reply_markup'] = json_encode($options['reply_markup'], JSON_UNESCAPED_UNICODE);
    }

    $ch = curl_init('https://api.telegram.org/bot' . $token . '/sendMessage');
    if ($ch === false) {
        return false;
    }

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_POSTFIELDS => http_build_query($body),
    ]);

    curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $httpCode === 200;
}
