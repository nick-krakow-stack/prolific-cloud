<?php
declare(strict_types=1);

const EXTRA_INCOME_NIGHT_BONUS_CENTS = 1;
const EXTRA_INCOME_MIN_PAYOUT_EUR = 50;
const EXTRA_INCOME_MIN_PAYOUT_CENTS = EXTRA_INCOME_MIN_PAYOUT_EUR * 100;
const EXTRA_INCOME_REQUIRED_TABLES = [
    'extra_income_sessions',
    'extra_income_timer',
    'extra_income_payouts',
];

function ensure_extra_income_schema(PDO $pdo): void {
    static $done = false;
    if ($done) {
        return;
    }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS extra_income_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            started_at DATETIME NOT NULL,
            ended_at DATETIME NOT NULL,
            message_count INT NOT NULL DEFAULT 0,
            night_bonus_enabled TINYINT(1) NOT NULL DEFAULT 1,
            bonus_mode VARCHAR(20) NOT NULL DEFAULT 'none',
            bonus_threshold_messages INT NOT NULL DEFAULT 0,
            bonus_amount_cents INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            INDEX idx_extra_income_sessions_started_at (started_at),
            INDEX idx_extra_income_sessions_ended_at (ended_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS extra_income_timer (
            id INT AUTO_INCREMENT PRIMARY KEY,
            singleton_key TINYINT NOT NULL DEFAULT 1,
            started_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL,
            UNIQUE KEY uq_extra_income_timer_singleton (singleton_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS extra_income_payouts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            gross_cents INT NOT NULL DEFAULT 0,
            fee_cents INT NOT NULL DEFAULT 0,
            net_cents INT NOT NULL DEFAULT 0,
            marked_paid_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL,
            INDEX idx_extra_income_payouts_period (period_start, period_end)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $done = true;
}

function extra_income_schema_exists(PDO $pdo): bool {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
        ");
        foreach (EXTRA_INCOME_REQUIRED_TABLES as $table) {
            $stmt->execute([$table]);
            if ((int)$stmt->fetchColumn() < 1) {
                return false;
            }
        }
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

function extra_income_require_schema(PDO $pdo): void {
    if (!extra_income_schema_exists($pdo)) {
        json_error('Zusatzeinkommen ist noch nicht installiert.', 503);
    }
}

function extra_income_empty_response(): array {
    $calculation = extra_income_calculate_summary([], []);
    return [
        'ok' => true,
        'schemaReady' => false,
        'timer' => null,
        'summary' => $calculation['summary'],
        'current' => $calculation['current'],
        'thisWeek' => $calculation['thisWeek'],
        'today' => $calculation['today'],
        'month' => $calculation['month'],
        'openPayout' => $calculation['openPayout'],
        'weeks' => $calculation['weeks'],
        'sessions' => [],
        'payouts' => [],
        'serverTime' => extra_income_now_string(),
    ];
}

function extra_income_empty_overview_summary(): array {
    return [
        'openGrossCents' => 0,
        'openFeeCents' => 0,
        'openNetCents' => 0,
        'todayGrossCents' => 0,
        'todayMessages' => 0,
        'todayDurationSeconds' => 0,
        'monthGrossCents' => 0,
        'monthMessages' => 0,
        'status' => 'offen',
        'canMarkPaid' => false,
    ];
}

function extra_income_now_string(): string {
    return date('Y-m-d H:i:s');
}

function extra_income_parse_datetime(string $value): DateTimeImmutable {
    try {
        return new DateTimeImmutable($value, new DateTimeZone(date_default_timezone_get()));
    } catch (Throwable $e) {
        json_error('Ungueltiges Datum.', 400);
    }
}

function extra_income_datetime_string(DateTimeImmutable $dt): string {
    return $dt->format('Y-m-d H:i:s');
}

function extra_income_date_string(DateTimeImmutable $dt): string {
    return $dt->format('Y-m-d');
}

function extra_income_week_start(DateTimeImmutable $dt): DateTimeImmutable {
    return $dt->setTime(0, 0, 0)->modify('monday this week');
}

function extra_income_week_end(DateTimeImmutable $dt): DateTimeImmutable {
    return extra_income_week_start($dt)->modify('+6 days')->setTime(23, 59, 59);
}

function extra_income_calculate_week_rate_cents(int $messages): int {
    if ($messages <= 0) {
        return 0;
    }
    if ($messages <= 1000) {
        return 12;
    }
    if ($messages <= 1250) {
        return 13;
    }
    if ($messages <= 1500) {
        return 14;
    }
    if ($messages <= 2000) {
        return 15;
    }
    return 17;
}

function extra_income_calculate_payout_fee_cents(int $grossCents): int {
    if ($grossCents < EXTRA_INCOME_MIN_PAYOUT_CENTS) {
        return 0;
    }
    if ($grossCents <= 25000) {
        return 500;
    }
    if ($grossCents <= 50000) {
        return 750;
    }
    if ($grossCents <= 60000) {
        return 1000;
    }
    if ($grossCents <= 100000) {
        return 1250;
    }
    return 1500;
}

function extra_income_calculate_session_bonus_cents(array $session): int {
    $messages = max(0, (int)($session['message_count'] ?? 0));
    $mode = (string)($session['bonus_mode'] ?? 'none');
    $threshold = max(0, (int)($session['bonus_threshold_messages'] ?? 0));
    $amountCents = max(0, (int)($session['bonus_amount_cents'] ?? 0));

    if ($mode === 'none' || $threshold <= 0 || $amountCents <= 0 || $messages < $threshold) {
        return 0;
    }
    if ($mode === 'fixed') {
        return $amountCents;
    }
    if ($mode === 'per_message') {
        return $messages * $amountCents;
    }
    return 0;
}

function extra_income_calculate_night_messages(array $session): int {
    if (empty($session['night_bonus_enabled'])) {
        return 0;
    }

    $messages = max(0, (int)($session['message_count'] ?? 0));
    if ($messages === 0) {
        return 0;
    }

    $startedAt = extra_income_parse_datetime((string)$session['started_at']);
    $endedAt = extra_income_parse_datetime((string)$session['ended_at']);
    $durationSeconds = max(0, $endedAt->getTimestamp() - $startedAt->getTimestamp());
    if ($durationSeconds === 0) {
        return 0;
    }

    $nightSeconds = extra_income_calculate_night_seconds($startedAt, $endedAt);
    return min($messages, max(0, (int)round($messages * ($nightSeconds / $durationSeconds))));
}

function extra_income_calculate_night_seconds(DateTimeImmutable $startedAt, DateTimeImmutable $endedAt): int {
    if ($endedAt <= $startedAt) {
        return 0;
    }

    $seconds = 0;
    $cursor = $startedAt->setTime(0, 0, 0);
    $lastDay = $endedAt->setTime(0, 0, 0);

    while ($cursor <= $lastDay) {
        $nightStart = $cursor->setTime(0, 0, 0);
        $nightEnd = $cursor->setTime(7, 0, 0);
        $from = $startedAt > $nightStart ? $startedAt : $nightStart;
        $to = $endedAt < $nightEnd ? $endedAt : $nightEnd;
        if ($to > $from) {
            $seconds += $to->getTimestamp() - $from->getTimestamp();
        }
        $cursor = $cursor->modify('+1 day');
    }

    return $seconds;
}

function extra_income_split_session_by_week(array $session): array {
    $startedAt = extra_income_parse_datetime((string)$session['started_at']);
    $endedAt = extra_income_parse_datetime((string)$session['ended_at']);
    $messages = max(0, (int)($session['message_count'] ?? 0));
    $durationSeconds = max(0, $endedAt->getTimestamp() - $startedAt->getTimestamp());

    if ($durationSeconds === 0) {
        $part = extra_income_make_session_part($session, $startedAt, $endedAt, $messages, $messages);
        return [$part];
    }

    $parts = [];
    $cursor = $startedAt;
    while ($cursor < $endedAt) {
        $nextWeekStart = extra_income_week_start($cursor)->modify('+7 days');
        $partEnd = $endedAt < $nextWeekStart ? $endedAt : $nextWeekStart;
        $partDuration = max(0, $partEnd->getTimestamp() - $cursor->getTimestamp());
        $rawMessages = $messages * ($partDuration / $durationSeconds);
        $parts[] = [
            'started_at_dt' => $cursor,
            'ended_at_dt' => $partEnd,
            'duration_seconds' => $partDuration,
            'raw_messages' => $rawMessages,
            'message_count' => (int)floor($rawMessages),
        ];
        $cursor = $partEnd;
    }

    $assigned = array_sum(array_column($parts, 'message_count'));
    $remaining = $messages - $assigned;
    if ($remaining > 0) {
        $order = array_keys($parts);
        usort($order, function (int $a, int $b) use ($parts): int {
            return $parts[$b]['duration_seconds'] <=> $parts[$a]['duration_seconds'];
        });
        foreach (array_slice($order, 0, $remaining) as $index) {
            $parts[$index]['message_count']++;
        }
    }

    $result = [];
    foreach ($parts as $part) {
        $result[] = extra_income_make_session_part(
            $session,
            $part['started_at_dt'],
            $part['ended_at_dt'],
            (int)$part['message_count'],
            $messages
        );
    }

    return $result;
}

function extra_income_make_session_part(
    array $session,
    DateTimeImmutable $startedAt,
    DateTimeImmutable $endedAt,
    int $messages,
    int $originalMessages
): array {
    $part = $session;
    $part['source_session_id'] = (int)($session['id'] ?? 0);
    $part['started_at'] = extra_income_datetime_string($startedAt);
    $part['ended_at'] = extra_income_datetime_string($endedAt);
    $part['message_count'] = $messages;
    $part['original_message_count'] = $originalMessages;
    $part['duration_seconds'] = max(0, $endedAt->getTimestamp() - $startedAt->getTimestamp());
    $part['week_start'] = extra_income_date_string(extra_income_week_start($startedAt));
    $part['week_end'] = extra_income_date_string(extra_income_week_end($startedAt));
    $part['night_messages'] = extra_income_calculate_night_messages($part);
    return $part;
}

function build_extra_income_response(PDO $pdo): array {
    if (!extra_income_schema_exists($pdo)) {
        return extra_income_empty_response();
    }

    $sessions = extra_income_fetch_sessions($pdo);
    $timer = extra_income_fetch_timer($pdo);
    $payouts = extra_income_fetch_payouts($pdo);
    $calculation = extra_income_calculate_summary($sessions, $payouts);

    return [
        'ok' => true,
        'schemaReady' => true,
        'timer' => $timer,
        'summary' => $calculation['summary'],
        'current' => $calculation['current'],
        'thisWeek' => $calculation['thisWeek'],
        'today' => $calculation['today'],
        'month' => $calculation['month'],
        'openPayout' => $calculation['openPayout'],
        'weeks' => $calculation['weeks'],
        'sessions' => extra_income_enrich_sessions($sessions, $calculation['sessionGrossCents']),
        'payouts' => $payouts,
        'serverTime' => extra_income_now_string(),
    ];
}

function build_extra_income_overview_summary(PDO $pdo): array {
    if (!extra_income_schema_exists($pdo)) {
        return extra_income_empty_overview_summary();
    }

    $sessions = extra_income_fetch_sessions($pdo);
    $payouts = extra_income_fetch_payouts($pdo);
    $calculation = extra_income_calculate_summary($sessions, $payouts);
    $openPayout = $calculation['openPayout'];

    return [
        'openGrossCents' => $openPayout['grossCents'],
        'openFeeCents' => $openPayout['feeCents'],
        'openNetCents' => $openPayout['netCents'],
        'todayGrossCents' => $calculation['today']['grossCents'],
        'todayMessages' => $calculation['today']['messageCount'],
        'todayDurationSeconds' => $calculation['today']['durationSeconds'],
        'monthGrossCents' => $calculation['month']['grossCents'],
        'monthMessages' => $calculation['month']['messageCount'],
        'status' => $openPayout['status'],
        'canMarkPaid' => $openPayout['canMarkPaid'],
    ];
}

function start_extra_income_timer(PDO $pdo): array {
    extra_income_require_schema($pdo);

    $now = extra_income_now_string();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT id, started_at, created_at FROM extra_income_timer WHERE singleton_key = ? LIMIT 1 FOR UPDATE");
        $stmt->execute([1]);
        $active = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($active) {
            $pdo->rollBack();
            json_error('Es laeuft bereits ein Zusatzeinkommen-Timer.', 409, ['timer' => $active]);
        }

        $stmt = $pdo->prepare(
            "INSERT INTO extra_income_timer (singleton_key, started_at, created_at) VALUES (?, ?, ?)"
        );
        $stmt->execute([1, $now, $now]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    return build_extra_income_response($pdo);
}

function stop_extra_income_timer(PDO $pdo): array {
    extra_income_require_schema($pdo);

    $body = read_json_body();
    $endedAt = extra_income_parse_datetime((string)($body['ended_at'] ?? $body['endedAt'] ?? extra_income_now_string()));

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT id, started_at FROM extra_income_timer WHERE singleton_key = ? LIMIT 1 FOR UPDATE");
        $stmt->execute([1]);
        $timer = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$timer) {
            $pdo->rollBack();
            json_error('Es laeuft kein Zusatzeinkommen-Timer.', 409);
        }

        $body['started_at'] = $timer['started_at'];
        $body['ended_at'] = extra_income_datetime_string($endedAt);
        $session = extra_income_validate_session_payload($body, false);
        $sessionId = extra_income_insert_session($pdo, $session);

        $stmt = $pdo->prepare("DELETE FROM extra_income_timer WHERE singleton_key = ?");
        $stmt->execute([1]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    $response = build_extra_income_response($pdo);
    $response['savedSessionId'] = $sessionId;
    return $response;
}

function save_extra_income_session(PDO $pdo): array {
    extra_income_require_schema($pdo);

    $body = read_json_body();
    $session = extra_income_validate_session_payload($body, true);
    $id = isset($body['id']) ? (int)$body['id'] : 0;
    $payouts = extra_income_fetch_payouts($pdo);

    if (extra_income_session_overlaps_paid_periods($session, $payouts)) {
        json_error('Diese Session liegt in einem bereits ausgezahlten Zeitraum.', 409);
    }

    if ($id > 0) {
        $existing = extra_income_fetch_session_by_id($pdo, $id);
        if (!$existing) {
            json_error('Zusatzeinkommen-Session nicht gefunden.', 404);
        }
        if (extra_income_session_overlaps_paid_periods($existing, $payouts)) {
            json_error('Bereits ausgezahlte Sessions koennen nicht bearbeitet werden.', 409);
        }
        extra_income_update_session($pdo, $id, $session);
        $sessionId = $id;
    } else {
        $sessionId = extra_income_insert_session($pdo, $session);
    }

    $response = build_extra_income_response($pdo);
    $response['savedSessionId'] = $sessionId;
    return $response;
}

function delete_extra_income_session(PDO $pdo): array {
    extra_income_require_schema($pdo);

    $body = read_json_body();
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) {
        json_error('Ungueltige Session-ID.', 400);
    }

    $existing = extra_income_fetch_session_by_id($pdo, $id);
    if (!$existing) {
        json_error('Zusatzeinkommen-Session nicht gefunden.', 404);
    }
    if (extra_income_session_overlaps_paid_periods($existing, extra_income_fetch_payouts($pdo))) {
        json_error('Bereits ausgezahlte Sessions koennen nicht geloescht werden.', 409);
    }

    $stmt = $pdo->prepare("DELETE FROM extra_income_sessions WHERE id = ?");
    $stmt->execute([$id]);
    if ($stmt->rowCount() < 1) {
        json_error('Zusatzeinkommen-Session nicht gefunden.', 404);
    }

    return build_extra_income_response($pdo);
}

function mark_extra_income_paid(PDO $pdo): array {
    extra_income_require_schema($pdo);

    $sessions = extra_income_fetch_sessions($pdo);
    $payouts = extra_income_fetch_payouts($pdo);
    $calculation = extra_income_calculate_summary($sessions, $payouts);
    $openPayout = $calculation['openPayout'];

    if (empty($openPayout['canMarkPaid'])) {
        json_error('Keine abgeschlossene Auszahlung ueber 50 EUR verfuegbar.', 409);
    }

    $now = extra_income_now_string();
    $stmt = $pdo->prepare(
        "INSERT INTO extra_income_payouts
            (period_start, period_end, gross_cents, fee_cents, net_cents, marked_paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $openPayout['periodStart'],
        $openPayout['periodEnd'],
        $openPayout['grossCents'],
        $openPayout['feeCents'],
        $openPayout['netCents'],
        $now,
        $now,
    ]);

    return build_extra_income_response($pdo);
}

function extra_income_validate_session_payload(array $body, bool $allowId): array {
    if (!$allowId && isset($body['id'])) {
        unset($body['id']);
    }

    $startedRaw = (string)($body['started_at'] ?? $body['startedAt'] ?? '');
    $endedRaw = (string)($body['ended_at'] ?? $body['endedAt'] ?? '');
    if ($startedRaw === '' || $endedRaw === '') {
        json_error('Start und Ende sind erforderlich.', 400);
    }

    $startedAt = extra_income_parse_datetime($startedRaw);
    $endedAt = extra_income_parse_datetime($endedRaw);
    if ($endedAt <= $startedAt) {
        json_error('Ende muss nach dem Start liegen.', 400);
    }

    $messageCount = extra_income_int_value($body, ['message_count', 'messageCount'], -1);
    if ($messageCount < 0) {
        json_error('Nachrichten muessen eine ganze Zahl groesser oder gleich 0 sein.', 400);
    }

    $bonusMode = (string)($body['bonus_mode'] ?? $body['bonusMode'] ?? 'none');
    $modeMap = [
        'none' => 'none',
        'fixed' => 'fixed',
        'einmalig' => 'fixed',
        'per_message' => 'per_message',
        'perMessage' => 'per_message',
        'fortlaufend' => 'per_message',
    ];
    if (!isset($modeMap[$bonusMode])) {
        json_error('Ungueltiger Bonusmodus.', 400);
    }
    $bonusMode = $modeMap[$bonusMode];

    $bonusThreshold = extra_income_int_value($body, ['bonus_threshold_messages', 'bonusThresholdMessages'], 0);
    $bonusAmountCents = extra_income_int_value($body, ['bonus_amount_cents', 'bonusAmountCents'], 0);
    if ($bonusThreshold < 0 || $bonusAmountCents < 0) {
        json_error('Bonuswerte duerfen nicht negativ sein.', 400);
    }
    if ($bonusMode !== 'none' && ($bonusThreshold <= 0 || $bonusAmountCents <= 0)) {
        json_error('Bonus braucht Mindestnachrichten und Betrag.', 400);
    }
    if ($bonusMode === 'none') {
        $bonusThreshold = 0;
        $bonusAmountCents = 0;
    }

    return [
        'started_at' => extra_income_datetime_string($startedAt),
        'ended_at' => extra_income_datetime_string($endedAt),
        'message_count' => $messageCount,
        'night_bonus_enabled' => extra_income_bool_value($body, ['night_bonus_enabled', 'nightBonusEnabled'], true) ? 1 : 0,
        'bonus_mode' => $bonusMode,
        'bonus_threshold_messages' => $bonusThreshold,
        'bonus_amount_cents' => $bonusAmountCents,
    ];
}

function extra_income_int_value(array $body, array $keys, int $default): int {
    foreach ($keys as $key) {
        if (!array_key_exists($key, $body)) {
            continue;
        }
        $value = $body[$key];
        if (is_int($value)) {
            return $value;
        }
        if (is_string($value) && preg_match('/^-?\d+$/', $value) === 1) {
            return (int)$value;
        }
        json_error('Ungueltiger Zahlenwert.', 400);
    }
    return $default;
}

function extra_income_bool_value(array $body, array $keys, bool $default): bool {
    foreach ($keys as $key) {
        if (!array_key_exists($key, $body)) {
            continue;
        }
        $value = $body[$key];
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value)) {
            return $value === 1;
        }
        if (is_string($value)) {
            return in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true);
        }
    }
    return $default;
}

function extra_income_insert_session(PDO $pdo, array $session): int {
    $now = extra_income_now_string();
    $stmt = $pdo->prepare(
        "INSERT INTO extra_income_sessions
            (started_at, ended_at, message_count, night_bonus_enabled, bonus_mode,
             bonus_threshold_messages, bonus_amount_cents, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $session['started_at'],
        $session['ended_at'],
        $session['message_count'],
        $session['night_bonus_enabled'],
        $session['bonus_mode'],
        $session['bonus_threshold_messages'],
        $session['bonus_amount_cents'],
        $now,
        $now,
    ]);
    return (int)$pdo->lastInsertId();
}

function extra_income_update_session(PDO $pdo, int $id, array $session): void {
    $stmt = $pdo->prepare(
        "UPDATE extra_income_sessions
         SET started_at = ?,
             ended_at = ?,
             message_count = ?,
             night_bonus_enabled = ?,
             bonus_mode = ?,
             bonus_threshold_messages = ?,
             bonus_amount_cents = ?,
             updated_at = ?
         WHERE id = ?"
    );
    $stmt->execute([
        $session['started_at'],
        $session['ended_at'],
        $session['message_count'],
        $session['night_bonus_enabled'],
        $session['bonus_mode'],
        $session['bonus_threshold_messages'],
        $session['bonus_amount_cents'],
        extra_income_now_string(),
        $id,
    ]);
}

function extra_income_fetch_sessions(PDO $pdo): array {
    $stmt = $pdo->prepare(
        "SELECT id, started_at, ended_at, message_count, night_bonus_enabled, bonus_mode,
                bonus_threshold_messages, bonus_amount_cents, created_at, updated_at
         FROM extra_income_sessions
         ORDER BY started_at DESC, id DESC"
    );
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

function extra_income_fetch_session_by_id(PDO $pdo, int $id): ?array {
    $stmt = $pdo->prepare(
        "SELECT id, started_at, ended_at, message_count, night_bonus_enabled, bonus_mode,
                bonus_threshold_messages, bonus_amount_cents, created_at, updated_at
         FROM extra_income_sessions
         WHERE id = ?"
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function extra_income_fetch_timer(PDO $pdo): ?array {
    $stmt = $pdo->prepare("SELECT id, started_at, created_at FROM extra_income_timer WHERE singleton_key = ? LIMIT 1");
    $stmt->execute([1]);
    $timer = $stmt->fetch(PDO::FETCH_ASSOC);
    return $timer ?: null;
}

function extra_income_fetch_payouts(PDO $pdo): array {
    $stmt = $pdo->prepare(
        "SELECT id, period_start, period_end, gross_cents, fee_cents, net_cents, marked_paid_at, created_at
         FROM extra_income_payouts
         ORDER BY period_end DESC, id DESC"
    );
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

function extra_income_calculate_summary(array $sessions, array $payouts): array {
    $parts = [];
    foreach ($sessions as $session) {
        foreach (extra_income_split_session_by_week($session) as $part) {
            $parts[] = $part;
        }
    }

    $parts = extra_income_assign_part_gross($parts);
    $paidRanges = extra_income_paid_period_ranges($payouts);
    $weeks = [];
    $sessionGrossCents = [];
    $today = ['grossCents' => 0, 'messageCount' => 0, 'durationSeconds' => 0];
    $month = ['grossCents' => 0, 'messageCount' => 0, 'durationSeconds' => 0];
    $tz = new DateTimeZone(date_default_timezone_get());
    $now = new DateTimeImmutable('now', $tz);
    $todayStart = $now->setTime(0, 0, 0);
    $tomorrowStart = $todayStart->modify('+1 day');
    $monthStart = $now->modify('first day of this month')->setTime(0, 0, 0);
    $nextMonthStart = $monthStart->modify('first day of next month');
    $todayDate = $now->format('Y-m-d');
    $monthKey = $now->format('Y-m');
    $currentWeekStart = extra_income_date_string(extra_income_week_start($now));

    foreach ($parts as $part) {
        $weekKey = $part['week_start'];
        if (!isset($weeks[$weekKey])) {
            $weeks[$weekKey] = [
                'periodStart' => $weekKey,
                'periodEnd' => $part['week_end'],
                'messageCount' => 0,
                'nightMessages' => 0,
                'durationSeconds' => 0,
                'grossCents' => 0,
                'baseCents' => 0,
                'nightBonusCents' => 0,
                'bonusCents' => 0,
                'rateCents' => 0,
                'paid' => extra_income_week_is_paid($weekKey, $paidRanges),
                'status' => 'offen',
            ];
        }

        $weeks[$weekKey]['messageCount'] += $part['message_count'];
        $weeks[$weekKey]['nightMessages'] += $part['night_messages'];
        $weeks[$weekKey]['durationSeconds'] += $part['duration_seconds'];
        $weeks[$weekKey]['grossCents'] += $part['gross_cents'];
        $weeks[$weekKey]['baseCents'] += $part['base_cents'];
        $weeks[$weekKey]['nightBonusCents'] += $part['night_bonus_cents'];
        $weeks[$weekKey]['bonusCents'] += $part['bonus_cents'];
        $weeks[$weekKey]['rateCents'] = $part['rate_cents'];

        $sessionId = (int)$part['source_session_id'];
        if (!isset($sessionGrossCents[$sessionId])) {
            $sessionGrossCents[$sessionId] = 0;
        }
        $sessionGrossCents[$sessionId] += $part['gross_cents'];

        extra_income_add_period_share($today, $part, $todayStart, $tomorrowStart);
        extra_income_add_period_share($month, $part, $monthStart, $nextMonthStart);
    }

    krsort($weeks);

    $openGross = 0;
    $completedOpenGross = 0;
    $completedPeriodStart = null;
    $completedPeriodEnd = null;
    foreach ($weeks as &$week) {
        if ($week['paid']) {
            $week['status'] = 'ausgezahlt';
            continue;
        }

        $openGross += $week['grossCents'];
        if ($week['periodStart'] < $currentWeekStart) {
            $completedOpenGross += $week['grossCents'];
            $completedPeriodStart = $completedPeriodStart === null
                ? $week['periodStart']
                : min($completedPeriodStart, $week['periodStart']);
            $completedPeriodEnd = $completedPeriodEnd === null
                ? $week['periodEnd']
                : max($completedPeriodEnd, $week['periodEnd']);
        }
    }
    unset($week);

    $completedCanPay = $completedOpenGross >= EXTRA_INCOME_MIN_PAYOUT_CENTS;
    foreach ($weeks as &$week) {
        if (!$week['paid'] && $week['periodStart'] < $currentWeekStart && $completedCanPay) {
            $week['status'] = 'auszahlungsbereit';
        }
    }
    unset($week);

    $openFee = extra_income_calculate_payout_fee_cents($openGross);
    $completedFee = extra_income_calculate_payout_fee_cents($completedOpenGross);
    $thisWeek = $weeks[$currentWeekStart] ?? [
        'periodStart' => $currentWeekStart,
        'periodEnd' => extra_income_date_string(extra_income_week_end($now)),
        'messageCount' => 0,
        'nightMessages' => 0,
        'durationSeconds' => 0,
        'grossCents' => 0,
        'baseCents' => 0,
        'nightBonusCents' => 0,
        'bonusCents' => 0,
        'rateCents' => 0,
        'paid' => false,
        'status' => 'offen',
    ];

    return [
        'summary' => [
            'grossCents' => array_sum(array_column($weeks, 'grossCents')),
            'openGrossCents' => $openGross,
            'openFeeCents' => $openFee,
            'openNetCents' => max(0, $openGross - $openFee),
            'completedOpenGrossCents' => $completedOpenGross,
            'completedOpenFeeCents' => $completedFee,
            'completedOpenNetCents' => max(0, $completedOpenGross - $completedFee),
        ],
        'current' => [
            'grossCents' => $openGross,
            'feeCents' => $openFee,
            'netCents' => max(0, $openGross - $openFee),
        ],
        'thisWeek' => extra_income_with_hourly_rate($thisWeek),
        'today' => extra_income_with_hourly_rate($today),
        'month' => extra_income_with_hourly_rate($month),
        'openPayout' => [
            'grossCents' => $completedOpenGross,
            'feeCents' => $completedFee,
            'netCents' => max(0, $completedOpenGross - $completedFee),
            'status' => $completedCanPay ? 'auszahlungsbereit' : 'offen',
            'canMarkPaid' => $completedCanPay,
            'periodStart' => $completedPeriodStart,
            'periodEnd' => $completedPeriodEnd,
        ],
        'weeks' => array_values(array_map('extra_income_with_hourly_rate', $weeks)),
        'sessionGrossCents' => $sessionGrossCents,
    ];
}

function extra_income_add_period_share(
    array &$bucket,
    array $part,
    DateTimeImmutable $periodStart,
    DateTimeImmutable $periodEnd
): void {
    $startedAt = extra_income_parse_datetime((string)$part['started_at']);
    $endedAt = extra_income_parse_datetime((string)$part['ended_at']);
    $from = $startedAt > $periodStart ? $startedAt : $periodStart;
    $to = $endedAt < $periodEnd ? $endedAt : $periodEnd;

    if ($to <= $from) {
        return;
    }

    $duration = max(1, (int)($part['duration_seconds'] ?? ($endedAt->getTimestamp() - $startedAt->getTimestamp())));
    $overlap = $to->getTimestamp() - $from->getTimestamp();
    $share = min(1.0, max(0.0, $overlap / $duration));

    $bucket['grossCents'] += (int)round((int)$part['gross_cents'] * $share);
    $bucket['messageCount'] += (int)round((int)$part['message_count'] * $share);
    $bucket['durationSeconds'] += $overlap;
}

function extra_income_assign_part_gross(array $parts): array {
    $weeklyMessages = [];
    foreach ($parts as $part) {
        $weeklyMessages[$part['week_start']] = ($weeklyMessages[$part['week_start']] ?? 0) + $part['message_count'];
    }

    foreach ($parts as &$part) {
        $rate = extra_income_calculate_week_rate_cents($weeklyMessages[$part['week_start']] ?? 0);
        $part['rate_cents'] = $rate;
        $part['base_cents'] = $part['message_count'] * $rate;
        $part['night_bonus_cents'] = $part['night_messages'] * EXTRA_INCOME_NIGHT_BONUS_CENTS;
        $part['bonus_cents'] = 0;
    }
    unset($part);

    $parts = extra_income_assign_bonus_to_parts($parts);
    foreach ($parts as &$part) {
        $part['gross_cents'] = $part['base_cents'] + $part['night_bonus_cents'] + $part['bonus_cents'];
    }
    unset($part);

    return $parts;
}

function extra_income_assign_bonus_to_parts(array $parts): array {
    $groups = [];
    foreach ($parts as $index => $part) {
        $groups[(int)$part['source_session_id']][] = $index;
    }

    foreach ($groups as $indexes) {
        $first = $parts[$indexes[0]];
        $fullSession = $first;
        $fullSession['message_count'] = (int)$first['original_message_count'];
        $bonusCents = extra_income_calculate_session_bonus_cents($fullSession);
        if ($bonusCents <= 0) {
            continue;
        }

        $totalMessages = max(0, (int)$first['original_message_count']);
        if ($totalMessages <= 0) {
            $parts[$indexes[0]]['bonus_cents'] += $bonusCents;
            continue;
        }

        $assigned = 0;
        $remainders = [];
        foreach ($indexes as $index) {
            $raw = $bonusCents * ($parts[$index]['message_count'] / $totalMessages);
            $share = (int)floor($raw);
            $parts[$index]['bonus_cents'] += $share;
            $assigned += $share;
            $remainders[] = [
                'index' => $index,
                'fraction' => $raw - floor($raw),
                'duration' => $parts[$index]['duration_seconds'],
            ];
        }

        $remaining = $bonusCents - $assigned;
        usort($remainders, function (array $a, array $b): int {
            if ($a['fraction'] === $b['fraction']) {
                return $b['duration'] <=> $a['duration'];
            }
            return $b['fraction'] <=> $a['fraction'];
        });
        foreach (array_slice($remainders, 0, $remaining) as $item) {
            $parts[$item['index']]['bonus_cents']++;
        }
    }

    return $parts;
}

function extra_income_with_hourly_rate(array $row): array {
    $duration = max(0, (int)($row['durationSeconds'] ?? $row['duration_seconds'] ?? 0));
    $gross = max(0, (int)($row['grossCents'] ?? $row['gross_cents'] ?? 0));
    $row['durationSeconds'] = $duration;
    $row['hourlyGrossCents'] = $duration > 0 ? (int)round($gross * 3600 / $duration) : 0;
    return $row;
}

function extra_income_paid_period_ranges(array $payouts): array {
    return array_map(static function (array $payout): array {
        return [
            'start' => (string)$payout['period_start'],
            'end' => (string)$payout['period_end'],
        ];
    }, $payouts);
}

function extra_income_week_is_paid(string $weekStart, array $paidRanges): bool {
    foreach ($paidRanges as $range) {
        if ($weekStart >= $range['start'] && $weekStart <= $range['end']) {
            return true;
        }
    }
    return false;
}

function extra_income_session_overlaps_paid_periods(array $session, array $payouts): bool {
    $paidRanges = extra_income_paid_period_ranges($payouts);
    foreach (extra_income_split_session_by_week($session) as $part) {
        if (extra_income_week_is_paid((string)$part['week_start'], $paidRanges)) {
            return true;
        }
    }
    return false;
}

function extra_income_enrich_sessions(array $sessions, array $sessionGrossCents): array {
    return array_map(static function (array $session) use ($sessionGrossCents): array {
        $id = (int)$session['id'];
        $startedAt = new DateTimeImmutable((string)$session['started_at']);
        $endedAt = new DateTimeImmutable((string)$session['ended_at']);
        $durationSeconds = max(0, $endedAt->getTimestamp() - $startedAt->getTimestamp());

        return [
            'id' => $id,
            'startedAt' => $session['started_at'],
            'endedAt' => $session['ended_at'],
            'messageCount' => (int)$session['message_count'],
            'nightBonusEnabled' => (bool)$session['night_bonus_enabled'],
            'bonusMode' => $session['bonus_mode'],
            'bonusThresholdMessages' => (int)$session['bonus_threshold_messages'],
            'bonusAmountCents' => (int)$session['bonus_amount_cents'],
            'durationSeconds' => $durationSeconds,
            'grossCents' => (int)($sessionGrossCents[$id] ?? 0),
            'createdAt' => $session['created_at'],
            'updatedAt' => $session['updated_at'],
        ];
    }, $sessions);
}
