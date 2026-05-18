<?php
/**
 * Telegram webhook endpoint.
 */

declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/_rewards.php';
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
        case '/balance':
            return telegram_balance_message();
        case '/studies':
            return telegram_studies_message();
        case '/earnings':
            return telegram_earnings_message();
        case '/quote':
            return telegram_quote_message();
        case '/today':
            return telegram_today_message();
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
    $lines[] = "/earnings \\- Verdienst\\-Übersicht";
    $lines[] = "/balance \\- Kontostand";
    $lines[] = "/studies \\- aktive Studien";
    $lines[] = "/quote \\- Erfolgs\\- und Verdienst\\-Quote";
    $lines[] = "/today \\- heutige Aktivität";
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

function telegram_balance_message(): string {
    $balance = get_setting('balance');
    $extracted = telegram_extract_balance(is_array($balance) ? $balance : []);

    return implode("\n", [
        "🏦 *Prolific\\-Konto*",
        '',
        'Auszahlbar: ' . telegram_fmt_money_map($extracted['available']),
        'In Prüfung: ' . telegram_fmt_money_map($extracted['pending']),
    ]);
}

function telegram_quote_message(): string {
    $stats = telegram_build_quote_stats(db());

    if ((int)$stats['sampleCount'] === 0) {
        return "🎯 *Quoten \\(letzte 30 Tage\\)*\n\nKeine passenden Studien im Auswertungszeitraum\\.";
    }

    $successDenominator = (int)$stats['accepted'] + (int)$stats['missed'];
    $successRate = $successDenominator > 0
        ? ((int)$stats['accepted'] / $successDenominator) * 100
        : null;
    $earningRate = $stats['fxComplete'] && $stats['possibleGbpMinor'] > 0
        ? ($stats['actualGbpMinor'] / $stats['possibleGbpMinor']) * 100
        : null;
    $earningRateText = !$stats['fxComplete']
        ? tg_escape('nicht berechenbar (FX-Rate fehlt)')
        : ($stats['inconsistent']
            ? 'Daten inkonsistent'
            : telegram_fmt_percent($earningRate));
    $amountLine = $stats['fxComplete']
        ? telegram_fmt_amount((int)$stats['actualGbpMinor'], 'GBP')
            . ' von '
            . telegram_fmt_amount((int)$stats['possibleGbpMinor'], 'GBP')
            . ' möglich'
        : telegram_fmt_money_map($stats['actualByCurrency'])
            . ' von '
            . telegram_fmt_money_map($stats['possibleByCurrency'])
            . ' möglich';

    return implode("\n", [
        "🎯 *Quoten \\(letzte 30 Tage\\)*",
        '',
        'Erfolgsquote: ' . telegram_fmt_percent($successRate),
        tg_escape((string)$stats['accepted']) . '/' . tg_escape((string)$successDenominator) . ' Studien angenommen',
        '\\(\\+ ' . tg_escape((string)$stats['returned']) . ' zurückgegeben\\)',
        '',
        'Verdienst\\-Quote: ' . $earningRateText,
        $amountLine,
    ]);
}

function telegram_build_quote_stats(PDO $pdo): array {
    $from = (new DateTime('now', new DateTimeZone(date_default_timezone_get())))
        ->modify('-30 days')
        ->setTime(0, 0, 0);
    $studyStmt = $pdo->prepare("
        SELECT id, reward_minor, reward_currency
        FROM studies
        WHERE first_seen >= ?
          AND reward_minor > 0
          AND reward_minor IS NOT NULL
        ORDER BY first_seen DESC
    ");
    $studyStmt->execute([$from->format('Y-m-d H:i:s')]);
    $studies = $studyStmt->fetchAll();
    $studyIds = array_values(array_filter(array_map(static function ($study): string {
        return (string)($study['id'] ?? '');
    }, $studies)));

    $submissionsByStudy = telegram_quote_submissions_by_study($pdo, $studyIds);
    $fxRates = telegram_normalize_fx_rates(get_setting('fxRates'));
    $actualByCurrency = [];
    $possibleByCurrency = [];
    $accepted = 0;
    $missed = 0;
    $returned = 0;

    foreach ($studies as $study) {
        $studyId = (string)($study['id'] ?? '');
        $currency = strtoupper((string)($study['reward_currency'] ?? 'GBP'));
        $possibleMinor = (int)($study['reward_minor'] ?? 0);
        $submission = $submissionsByStudy[$studyId] ?? null;
        $status = $submission ? telegram_normalize_status((string)($submission['status'] ?? '')) : '';
        $actualMinor = $submission ? (int)($submission['effective_reward_minor'] ?? 0) : 0;

        if ($status === 'RETURNED') {
            $returned++;
            continue;
        } elseif (in_array($status, ['REJECTED', 'TIMED OUT', 'TIMED-OUT'], true)) {
            continue;
        } elseif (in_array($status, ['APPROVED', 'AWAITING REVIEW', 'SCREENED OUT', 'SCREENED-OUT'], true)) {
            $accepted++;
        } elseif ($status === '') {
            $missed++;
        }

        if (in_array($status, ['SCREENED OUT', 'SCREENED-OUT'], true)) {
            $possibleMinor = $actualMinor;
        }

        $possibleByCurrency[$currency] = ($possibleByCurrency[$currency] ?? 0) + $possibleMinor;

        if (in_array($status, ['APPROVED', 'SCREENED OUT', 'SCREENED-OUT'], true) && $actualMinor > 0) {
            $actualCurrency = strtoupper((string)($submission['reward_currency'] ?? $currency));
            $actualByCurrency[$actualCurrency] = ($actualByCurrency[$actualCurrency] ?? 0) + $actualMinor;
        }
    }

    $actualGbpMinor = telegram_currency_map_to_gbp_minor($actualByCurrency, $fxRates);
    $possibleGbpMinor = telegram_currency_map_to_gbp_minor($possibleByCurrency, $fxRates);
    $fxComplete = $actualGbpMinor !== null && $possibleGbpMinor !== null;

    return [
        'sampleCount' => count($studies),
        'accepted' => $accepted,
        'missed' => $missed,
        'returned' => $returned,
        'actualByCurrency' => $actualByCurrency,
        'possibleByCurrency' => $possibleByCurrency,
        'actualGbpMinor' => $actualGbpMinor,
        'possibleGbpMinor' => $possibleGbpMinor,
        'fxComplete' => $fxComplete,
        'inconsistent' => $fxComplete && $possibleGbpMinor > 0 && $actualGbpMinor > ($possibleGbpMinor * 2),
    ];
}

function telegram_quote_submissions_by_study(PDO $pdo, array $studyIds): array {
    if (empty($studyIds)) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($studyIds), '?'));
    $rewardExpr = effective_reward_amount_sql();
    $stmt = $pdo->prepare("
        SELECT study_id, status, reward_currency, {$rewardExpr} AS effective_reward_minor
        FROM submissions
        WHERE study_id IN ($placeholders)
    ");
    $stmt->execute($studyIds);

    $result = [];
    foreach ($stmt->fetchAll() as $row) {
        $studyId = (string)($row['study_id'] ?? '');
        $status = telegram_normalize_status((string)($row['status'] ?? ''));
        $priority = telegram_quote_submission_priority($status);

        if ($studyId === '' || $priority <= 0) {
            continue;
        }

        $existing = $result[$studyId] ?? null;
        $existingPriority = $existing ? telegram_quote_submission_priority((string)($existing['status'] ?? '')) : 0;

        if (!$existing || $priority > $existingPriority) {
            $row['status'] = $status;
            $result[$studyId] = $row;
        }
    }

    return $result;
}

function telegram_quote_submission_priority(string $status): int {
    return match (telegram_normalize_status($status)) {
        'APPROVED' => 40,
        'AWAITING REVIEW' => 30,
        'SCREENED OUT', 'SCREENED-OUT' => 20,
        'RETURNED' => 10,
        'REJECTED' => 5,
        'TIMED OUT', 'TIMED-OUT' => 5,
        default => 0,
    };
}

function telegram_normalize_status(string $status): string {
    return strtoupper(str_replace('_', ' ', trim($status)));
}

function telegram_normalize_fx_rates($fxRates): array {
    if (is_string($fxRates)) {
        $decoded = json_decode($fxRates, true);
        $fxRates = is_array($decoded) ? $decoded : [];
    }

    if (!is_array($fxRates)) {
        return ['base' => 'GBP', 'rates' => []];
    }

    $rates = $fxRates['rates'] ?? $fxRates;
    return [
        'base' => strtoupper((string)($fxRates['base'] ?? 'GBP')),
        'rates' => is_array($rates) ? $rates : [],
    ];
}

function telegram_currency_map_to_gbp_minor(array $amounts, array $fxRates): ?int {
    $total = 0;

    foreach ($amounts as $currency => $minor) {
        $currency = strtoupper((string)$currency);
        $minor = (int)$minor;

        if ($currency === 'GBP') {
            $total += $minor;
            continue;
        }

        $rate = telegram_fx_rate($fxRates, $currency);
        if ($rate === null || $rate <= 0) {
            return null;
        }

        $total += (int)round($minor / $rate);
    }

    return $total;
}

function telegram_fx_rate(array $fxRates, string $currency) {
    $currency = strtoupper($currency);
    $rates = $fxRates['rates'] ?? [];
    $rate = $rates[$currency] ?? $rates[strtolower($currency)] ?? null;
    $numeric = is_numeric($rate) ? (float)$rate : null;

    return $numeric && $numeric > 0 ? $numeric : null;
}

function telegram_studies_message(): string {
    $countStmt = db()->prepare("SELECT COUNT(*) FROM studies WHERE is_active = 1");
    $countStmt->execute();
    $total = (int)$countStmt->fetchColumn();

    $stmt = db()->prepare(
        "SELECT id, name, reward_minor, reward_currency, estimated_minutes, total_places, reward_per_hour
         FROM studies
         WHERE is_active = 1
         ORDER BY first_seen DESC
         LIMIT 10"
    );
    $stmt->execute();
    $rows = $stmt->fetchAll();

    if ($total === 0 || empty($rows)) {
        return "🌙 Keine aktiven Studien gerade\\.";
    }

    $lines = ["🟢 *Aktive Studien \\(" . $total . "\\)*", ''];

    foreach ($rows as $index => $row) {
        $reward = telegram_fmt_amount((int)($row['reward_minor'] ?? 0), (string)($row['reward_currency'] ?? 'GBP'));
        $hourly = telegram_fmt_amount((int)($row['reward_per_hour'] ?? 0), (string)($row['reward_currency'] ?? 'GBP')) . '/h';
        $minutes = (int)($row['estimated_minutes'] ?? 0);
        $places = (int)($row['total_places'] ?? 0);
        $url = 'https://app.prolific.com/studies/' . rawurlencode((string)($row['id'] ?? ''));

        $lines[] = ($index + 1) . '\\. *' . tg_escape((string)($row['name'] ?? 'Ohne Namen')) . '*';
        $lines[] = '   ' . $reward . ' · ' . tg_escape($minutes . ' Min') . ' · ' . tg_escape($places . ' Plätze') . ' · ' . $hourly;
        $lines[] = '   🔗 ' . tg_escape($url);
        $lines[] = '';
    }

    if ($total > count($rows)) {
        $lines[] = '\\+ ' . tg_escape((string)($total - count($rows))) . ' weitere';
    }

    return trim(implode("\n", $lines));
}

function telegram_earnings_message(): string {
    $pdo = db();
    $tz = new DateTimeZone(date_default_timezone_get());
    $now = new DateTime('now', $tz);
    $today = (clone $now)->setTime(0, 0, 0);
    $weekStart = (clone $today)->modify('Monday this week');
    if ($weekStart > $today) {
        $weekStart->modify('-7 days');
    }
    $monthStart = (clone $today)->modify('first day of this month')->setTime(0, 0, 0);
    $lastMonthStart = (clone $monthStart)->modify('-1 month');
    $earnedStatuses = ['APPROVED', 'SCREENED OUT', 'SCREENED-OUT'];
    $pendingStatuses = ['AWAITING REVIEW'];

    return implode("\n", [
        "💰 *Verdienst\\-Übersicht*",
        '',
        'Heute: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $earnedStatuses, $today, null))
            . ' \\(' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $pendingStatuses, $today, null)) . ' ausstehend\\)',
        'Diese Woche: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $earnedStatuses, $weekStart, null))
            . ' \\(' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $pendingStatuses, $weekStart, null)) . ' ausstehend\\)',
        'Dieser Monat: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $earnedStatuses, $monthStart, null)),
        'Vormonat: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $earnedStatuses, $lastMonthStart, $monthStart)),
        'Gesamt: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $earnedStatuses, null, null)),
    ]);
}

function telegram_today_message(): string {
    $pdo = db();
    $today = (new DateTime('now', new DateTimeZone(date_default_timezone_get())))->setTime(0, 0, 0);
    $todaySql = $today->format('Y-m-d H:i:s');
    $earnedStatuses = ['APPROVED', 'SCREENED OUT', 'SCREENED-OUT'];
    $pendingStatuses = ['AWAITING REVIEW'];

    $studyStmt = $pdo->prepare("SELECT COUNT(*) FROM studies WHERE first_seen >= ?");
    $studyStmt->execute([$todaySql]);
    $newStudies = (int)$studyStmt->fetchColumn();

    $countedStatuses = array_merge($earnedStatuses, $pendingStatuses);
    $statusPlaceholders = implode(',', array_fill(0, count($countedStatuses), '?'));
    $submissionStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM submissions
        WHERE started_at >= ?
          AND status IN ($statusPlaceholders)
    ");
    $submissionStmt->execute(array_merge([$todaySql], $countedStatuses));
    $submissions = (int)$submissionStmt->fetchColumn();

    return implode("\n", [
        "📅 *Heute*",
        '',
        '🟢 Neue Studien: ' . tg_escape((string)$newStudies),
        '✅ Teilgenommen: ' . tg_escape((string)$submissions),
        '💰 Verdient: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $earnedStatuses, $today, null))
            . ' \\(' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $pendingStatuses, $today, null)) . ' ausstehend\\)',
    ]);
}

function telegram_sum_by_period(PDO $pdo, array $statuses, ?DateTime $from, ?DateTime $to): array {
    $placeholders = implode(',', array_fill(0, count($statuses), '?'));
    $rewardExpr = effective_reward_amount_sql();
    $sql = "
        SELECT reward_currency, SUM({$rewardExpr}) total
        FROM submissions
        WHERE status IN ($placeholders)
    ";
    $params = $statuses;

    if ($from) {
        $sql .= ' AND completed_at >= ?';
        $params[] = $from->format('Y-m-d H:i:s');
    }

    if ($to) {
        $sql .= ' AND completed_at < ?';
        $params[] = $to->format('Y-m-d H:i:s');
    }

    $sql .= ' GROUP BY reward_currency';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $result = [];
    foreach ($stmt->fetchAll() as $row) {
        if (!empty($row['reward_currency'])) {
            $result[(string)$row['reward_currency']] = (int)$row['total'];
        }
    }

    return $result;
}

function telegram_extract_balance(array $balance): array {
    $available = telegram_extract_currency_map($balance['approved_per_currency'] ?? [], true);
    $pending = telegram_extract_currency_map($balance['pending_per_currency'] ?? [], true);

    foreach ([
        'balance_by_currency',
        'available_balance_by_currency',
        'available_by_currency',
        'cashout_balance_by_currency',
        'cashout_by_currency',
        'current_balance_by_currency',
        'available_balance',
        'cashout_balance',
        'current_balance',
        'balance',
        'available',
        'cashout',
        'approved',
        'total',
    ] as $key) {
        telegram_merge_currency_map($available, $balance[$key] ?? []);
    }

    foreach ([
        'pending_balance_by_currency',
        'pending_by_currency',
        'awaiting_review_by_currency',
        'awaiting_by_currency',
        'pending_balance',
        'pending',
        'awaiting_review',
        'awaiting',
    ] as $key) {
        telegram_merge_currency_map($pending, $balance[$key] ?? []);
    }

    if (empty($available) && isset($balance['total_gbp'])) {
        telegram_merge_currency_map($available, ['GBP' => $balance['total_gbp']], true);
    }

    if (empty($pending) && isset($balance['total_pending_gbp'])) {
        telegram_merge_currency_map($pending, ['GBP' => $balance['total_pending_gbp']], true);
    }

    return [
        'available' => $available,
        'pending' => $pending,
    ];
}

function telegram_merge_currency_map(array &$target, $source, bool $forceMinor = false): void {
    foreach (telegram_extract_currency_map($source, $forceMinor) as $currency => $amount) {
        $target[$currency] = ($target[$currency] ?? 0) + $amount;
    }
}

function telegram_extract_currency_map($source, bool $forceMinor = false): array {
    if (is_string($source)) {
        $decoded = json_decode($source, true);
        $source = is_array($decoded) ? $decoded : [];
    }

    if (!is_array($source)) {
        return [];
    }

    if (isset($source['currency'])) {
        $currency = strtoupper((string)$source['currency']);
        $amount = $source['amount_minor']
            ?? $source['value_minor']
            ?? $source['total_minor']
            ?? $source['amount']
            ?? $source['value']
            ?? $source['total']
            ?? null;

        if ($currency !== '' && $amount !== null && $amount !== '') {
            $minor = $forceMinor ? (int)round((float)$amount) : (int)round((float)$amount * 100);
            return [$currency => $minor];
        }
    }

    $result = [];
    foreach ($source as $currency => $amount) {
        if (is_array($amount)) {
            $nestedCurrency = $amount['currency'] ?? $currency;
            $nestedAmount = $amount['amount_minor']
                ?? $amount['value_minor']
                ?? $amount['total_minor']
                ?? $amount['amount']
                ?? $amount['value']
                ?? $amount['total']
                ?? null;
            $currency = $nestedCurrency;
            $amount = $nestedAmount;
        }

        if ($amount === null || $amount === '') {
            continue;
        }

        $minor = $forceMinor ? (int)round((float)$amount) : (int)round((float)$amount * 100);
        $result[strtoupper((string)$currency)] = ($result[strtoupper((string)$currency)] ?? 0) + $minor;
    }

    return $result;
}

function telegram_fmt_money_map(array $amounts): string {
    $amounts = array_filter($amounts, static fn($amount) => (int)$amount !== 0);
    if (empty($amounts)) {
        return '–';
    }

    $order = ['GBP' => 0, 'USD' => 1, 'EUR' => 2];
    uksort($amounts, static function ($a, $b) use ($order) {
        return ($order[$a] ?? 99) <=> ($order[$b] ?? 99) ?: strcmp($a, $b);
    });

    $parts = [];
    foreach ($amounts as $currency => $minor) {
        $parts[] = telegram_fmt_amount((int)$minor, (string)$currency);
    }

    return implode(' \\+ ', $parts);
}

function telegram_fmt_amount(int $minor, string $currency): string {
    $symbols = [
        'GBP' => '£',
        'USD' => '$',
        'EUR' => '€',
    ];
    $currency = strtoupper($currency);
    $symbol = $symbols[$currency] ?? $currency . ' ';

    return tg_escape($symbol . number_format($minor / 100, 2, ',', '.'));
}

function telegram_fmt_percent($value): string {
    if (!is_numeric($value)) {
        return 'â€“';
    }

    return tg_escape(number_format((float)$value, 0, ',', '.') . ' %');
}
