<?php
/**
 * Daten-Endpoint für das Dashboard.
 * Session-basierte Auth (Login über /dashboard/index.php).
 *
 * Liefert je nach ?type= Parameter unterschiedliche Daten:
 *   ?type=overview    → Earnings-Übersicht + Status
 *   ?type=studies     → Studien-Historie
 *   ?type=submissions → Submissions-Liste
 *   ?type=events      → Letzte Ereignisse
 */

declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../dashboard/session.php';

require_login();

$type = $_GET['type'] ?? 'overview';
$pdo  = db();

try {
    switch ($type) {
        case 'overview':
            json_response(build_overview($pdo));

        case 'studies':
            $limit = (int)($_GET['limit'] ?? 200);
            $limit = max(1, min(1000, $limit));

            $stmt = $pdo->prepare("SELECT * FROM studies ORDER BY first_seen DESC LIMIT ?");
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->execute();

            json_response([
                'ok' => true,
                'studies' => $stmt->fetchAll(),
            ]);

        case 'submissions':
            $limit = (int)($_GET['limit'] ?? 200);
            $limit = max(1, min(1000, $limit));

            $stmt = $pdo->prepare("SELECT * FROM submissions ORDER BY started_at DESC LIMIT ?");
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->execute();

            json_response([
                'ok' => true,
                'submissions' => $stmt->fetchAll(),
            ]);

        case 'events':
            $limit = (int)($_GET['limit'] ?? 50);
            $limit = max(1, min(500, $limit));

            $stmt = $pdo->prepare("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?");
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->execute();

            json_response([
                'ok' => true,
                'events' => $stmt->fetchAll(),
            ]);

        default:
            json_error('Unbekannter type-Parameter.', 400);
    }
} catch (Throwable $e) {
    json_error('Serverfehler.', 500);
}

// ============================================================
//   Helper: JSON-Settings sauber decodieren
// ============================================================

function decode_setting_value(mixed $value): mixed {
    if (!is_string($value)) {
        return $value;
    }

    $trimmed = trim($value);

    if ($trimmed === '') {
        return null;
    }

    $first = $trimmed[0];

    if ($first !== '{' && $first !== '[') {
        return $value;
    }

    $decoded = json_decode($trimmed, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        return $value;
    }

    return $decoded;
}

// ============================================================
//   Overview: Earnings nach Period
// ============================================================

function build_overview(PDO $pdo): array {
    global $config;

    $tz = new DateTimeZone(date_default_timezone_get());

    $now            = new DateTime('now', $tz);
    $today          = (clone $now)->setTime(0, 0, 0);
    $weekStart      = (clone $today)->modify('Monday this week');
    $monthStart     = (clone $today)->modify('first day of this month')->setTime(0, 0, 0);
    $lastMonthStart = (clone $monthStart)->modify('-1 month');
    $lastMonthEnd   = (clone $monthStart);

    if ($weekStart > $today) {
        $weekStart->modify('-7 days');
    }

    // "earned": APPROVED + SCREENED OUT
    // "pending": AWAITING REVIEW
    $earnedStatuses  = ['APPROVED', 'SCREENED OUT', 'SCREENED-OUT'];
    $pendingStatuses = ['AWAITING REVIEW'];

    $earnedToday  = sum_by_period($pdo, $earnedStatuses, $today, null);
    $pendingToday = sum_by_period($pdo, $pendingStatuses, $today, null);

    $earnedWeek   = sum_by_period($pdo, $earnedStatuses, $weekStart, null);
    $pendingWeek  = sum_by_period($pdo, $pendingStatuses, $weekStart, null);

    $earnedMonth  = sum_by_period($pdo, $earnedStatuses, $monthStart, null);
    $pendingMonth = sum_by_period($pdo, $pendingStatuses, $monthStart, null);

    $earnedLastM  = sum_by_period($pdo, $earnedStatuses, $lastMonthStart, $lastMonthEnd);

    $earnedAll    = sum_by_period($pdo, $earnedStatuses, null, null);
    $pendingAll   = sum_by_period($pdo, $pendingStatuses, null, null);

    $activeCount = (int)$pdo
        ->query("SELECT COUNT(*) FROM studies WHERE is_active = 1")
        ->fetchColumn();

    $subCounts = [];
    $stmt = $pdo->query("SELECT status, COUNT(*) cnt FROM submissions GROUP BY status");

    foreach ($stmt->fetchAll() as $row) {
        $subCounts[$row['status']] = (int)$row['cnt'];
    }

    $dailyGoalGbpMinor   = positive_int($config['goals']['daily_gbp_minor'] ?? null, 500);
    $monthlyGoalGbpMinor = positive_int($config['goals']['monthly_gbp_minor'] ?? null, 15000);

    $earnedTodayGbp = amount_for_currency($earnedToday, 'GBP');
    $earnedMonthGbp = amount_for_currency($earnedMonth, 'GBP');

    $goals = [
        'daily_gbp_minor' => $dailyGoalGbpMinor,
        'monthly_gbp_minor' => $monthlyGoalGbpMinor,
        'today' => build_goal_progress($earnedTodayGbp, $dailyGoalGbpMinor),
        'month' => build_goal_progress($earnedMonthGbp, $monthlyGoalGbpMinor),
    ];

    $forecast = build_month_forecast($now, $earnedMonthGbp, $monthlyGoalGbpMinor);
    $pendingStats = build_pending_stats($pdo, $pendingStatuses, $now);
    $statusStats = build_status_stats($subCounts);
    $todayStats = build_today_stats($pdo, $earnedStatuses, $today, $earnedToday, $pendingToday);
    $efficiency = build_efficiency_stats($pdo, $earnedStatuses, $today, $weekStart, $monthStart);
    $topStudies = build_top_studies($pdo, $earnedStatuses);
    $dailyStats = build_daily_stats($pdo, $earnedStatuses, $pendingStatuses, $today);

    $balanceRaw   = get_setting('balance');
    $fxRatesRaw   = get_setting('fxRates');
    $lastSyncAt   = get_setting('lastSyncAt');

    $balance = decode_setting_value($balanceRaw);
    $fxRates = decode_setting_value($fxRatesRaw);

    $lastSyncRow = $pdo
        ->query("SELECT * FROM sync_log ORDER BY id DESC LIMIT 1")
        ->fetch();
    $system = build_system_stats($pdo, $lastSyncAt, $lastSyncRow ?: null);

    return [
        'ok' => true,

        'earnings' => [
            'today' => [
                'earned'  => $earnedToday,
                'pending' => $pendingToday,
            ],
            'week' => [
                'earned'  => $earnedWeek,
                'pending' => $pendingWeek,
            ],
            'month' => [
                'earned'  => $earnedMonth,
                'pending' => $pendingMonth,
            ],
            'lastMonth' => [
                'earned' => $earnedLastM,
            ],
            'allTime' => [
                'earned'  => $earnedAll,
                'pending' => $pendingAll,
            ],
        ],

        'activeCount'      => $activeCount,
        'submissionCounts' => $subCounts,
        'goals'            => $goals,
        'forecast'         => $forecast,
        'pendingStats'     => $pendingStats,
        'statusStats'      => $statusStats,
        'todayStats'       => $todayStats,
        'efficiency'       => $efficiency,
        'topStudies'       => $topStudies,
        'dailyStats'       => $dailyStats,
        'system'           => $system,
        'balance'          => $balance,
        'fxRates'          => $fxRates,
        'lastSyncAt'       => $lastSyncAt,
        'lastSyncLog'      => $lastSyncRow ?: null,
        'serverTime'       => date('c'),
    ];
}

function positive_int($value, int $default): int {
    if (is_int($value) || is_string($value) || is_float($value)) {
        $intValue = (int)$value;
        if ($intValue > 0) {
            return $intValue;
        }
    }

    return $default;
}

function amount_for_currency(array $amounts, string $currency): int {
    foreach ($amounts as $key => $value) {
        if (strtoupper((string)$key) === $currency) {
            return (int)$value;
        }
    }

    return 0;
}

function build_goal_progress(int $earnedGbpMinor, int $targetGbpMinor): array {
    $progress = $targetGbpMinor > 0 ? $earnedGbpMinor / $targetGbpMinor : 0.0;

    return [
        'earned_gbp_minor' => $earnedGbpMinor,
        'target_gbp_minor' => $targetGbpMinor,
        'remaining_gbp_minor' => max(0, $targetGbpMinor - $earnedGbpMinor),
        'progress' => round($progress, 4),
        'progressPercent' => round($progress * 100, 1),
    ];
}

function build_month_forecast(DateTime $now, int $earnedMonthGbpMinor, int $monthlyGoalGbpMinor): array {
    $elapsedDayOfMonth = max(1, (int)$now->format('j'));
    $daysInMonth = max(1, (int)$now->format('t'));
    $averageDailyGbpMinor = (int)round($earnedMonthGbpMinor / $elapsedDayOfMonth);
    $projectedMonthGbpMinor = (int)round(($earnedMonthGbpMinor / $elapsedDayOfMonth) * $daysInMonth);

    return [
        'current_gbp_minor' => $earnedMonthGbpMinor,
        'elapsedDayOfMonth' => $elapsedDayOfMonth,
        'daysInMonth' => $daysInMonth,
        'averageDailyGbpMinor' => $averageDailyGbpMinor,
        'projectedMonthGbpMinor' => $projectedMonthGbpMinor,
        'targetGbpMinor' => $monthlyGoalGbpMinor,
        'targetDifferenceGbpMinor' => $projectedMonthGbpMinor - $monthlyGoalGbpMinor,
        'willReachGoal' => $projectedMonthGbpMinor >= $monthlyGoalGbpMinor,
    ];
}

function build_pending_stats(PDO $pdo, array $pendingStatuses, DateTime $now): array {
    $placeholders = implode(',', array_fill(0, count($pendingStatuses), '?'));
    $stmt = $pdo->prepare("
        SELECT reward_currency,
               COUNT(*) count_pending,
               SUM(reward_amount_minor) total_pending_minor,
               MIN(completed_at) oldest_completed_at
        FROM submissions
        WHERE status IN ($placeholders)
        GROUP BY reward_currency
    ");
    $stmt->execute($pendingStatuses);

    $count = 0;
    $totalByCurrency = [];
    $oldestCompletedAt = null;

    foreach ($stmt->fetchAll() as $row) {
        $rowCount = (int)$row['count_pending'];
        $count += $rowCount;

        if (!empty($row['reward_currency'])) {
            $totalByCurrency[$row['reward_currency']] = (int)$row['total_pending_minor'];
        }

        if (!empty($row['oldest_completed_at'])) {
            if ($oldestCompletedAt === null || $row['oldest_completed_at'] < $oldestCompletedAt) {
                $oldestCompletedAt = $row['oldest_completed_at'];
            }
        }
    }

    return [
        'count' => $count,
        'total' => $totalByCurrency,
        'oldestCompletedAt' => $oldestCompletedAt,
        'olderThan7Days' => count_pending_older_than($pdo, $pendingStatuses, (clone $now)->modify('-7 days')),
        'olderThan14Days' => count_pending_older_than($pdo, $pendingStatuses, (clone $now)->modify('-14 days')),
    ];
}

function count_pending_older_than(PDO $pdo, array $pendingStatuses, DateTime $threshold): int {
    $placeholders = implode(',', array_fill(0, count($pendingStatuses), '?'));
    $params = $pendingStatuses;
    $params[] = $threshold->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM submissions
        WHERE status IN ($placeholders)
          AND completed_at IS NOT NULL
          AND completed_at < ?
    ");
    $stmt->execute($params);

    return (int)$stmt->fetchColumn();
}

function build_status_stats(array $counts): array {
    $total = 0;
    $normalizedCounts = [];

    foreach ($counts as $status => $count) {
        $normalizedStatus = $status !== null && $status !== '' ? (string)$status : 'UNKNOWN';
        $normalizedCounts[$normalizedStatus] = (int)$count;
        $total += (int)$count;
    }

    $approved = $normalizedCounts['APPROVED'] ?? 0;
    $rejected = $normalizedCounts['REJECTED'] ?? 0;
    $pending = $normalizedCounts['AWAITING REVIEW'] ?? 0;

    return [
        'counts' => $normalizedCounts,
        'total' => $total,
        'approvalRate' => percentage($approved, $total),
        'rejectionRate' => percentage($rejected, $total),
        'pendingRate' => percentage($pending, $total),
    ];
}

function percentage(int $part, int $total): float {
    if ($total <= 0) {
        return 0.0;
    }

    return round(($part / $total) * 100, 1);
}

function build_today_stats(
    PDO $pdo,
    array $earnedStatuses,
    DateTime $today,
    array $earnedToday,
    array $pendingToday
): array {
    $todayStart = $today->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM submissions
        WHERE started_at >= ?
           OR completed_at >= ?
    ");
    $stmt->execute([$todayStart, $todayStart]);
    $submissionsCount = (int)$stmt->fetchColumn();

    return [
        'earned' => $earnedToday,
        'pending' => $pendingToday,
        'submissionsCount' => $submissionsCount,
        'averageReward' => build_today_average_reward($pdo, $earnedStatuses, $todayStart),
        'effectiveHourlyRate' => build_today_effective_hourly_rate($pdo, $earnedStatuses, $todayStart),
    ];
}

function build_today_average_reward(PDO $pdo, array $earnedStatuses, string $todayStart): array {
    $placeholders = implode(',', array_fill(0, count($earnedStatuses), '?'));
    $params = $earnedStatuses;
    $params[] = $todayStart;

    $stmt = $pdo->prepare("
        SELECT reward_currency,
               COUNT(*) reward_count,
               SUM(reward_amount_minor) reward_total
        FROM submissions
        WHERE status IN ($placeholders)
          AND completed_at >= ?
          AND reward_amount_minor > 0
        GROUP BY reward_currency
    ");
    $stmt->execute($params);

    $byCurrency = [];
    $sampleCount = 0;

    foreach ($stmt->fetchAll() as $row) {
        if (empty($row['reward_currency'])) {
            continue;
        }

        $count = (int)$row['reward_count'];
        if ($count <= 0) {
            continue;
        }

        $sampleCount += $count;
        $byCurrency[$row['reward_currency']] = (int)round((int)$row['reward_total'] / $count);
    }

    return [
        'byCurrency' => $byCurrency,
        'sampleCount' => $sampleCount,
    ];
}

function build_today_effective_hourly_rate(PDO $pdo, array $earnedStatuses, string $todayStart): array {
    $placeholders = implode(',', array_fill(0, count($earnedStatuses), '?'));
    $params = $earnedStatuses;
    $params[] = $todayStart;
    $params[] = $todayStart;

    $stmt = $pdo->prepare("
        SELECT reward_currency,
               COUNT(*) sample_count,
               SUM(reward_amount_minor) reward_total,
               SUM(time_taken_seconds) seconds_total
        FROM submissions
        WHERE status IN ($placeholders)
          AND reward_amount_minor > 0
          AND time_taken_seconds > 0
          AND (completed_at >= ? OR started_at >= ?)
        GROUP BY reward_currency
    ");
    $stmt->execute($params);

    $byCurrency = [];
    $sampleCount = 0;
    $secondsGrandTotal = 0;

    foreach ($stmt->fetchAll() as $row) {
        if (empty($row['reward_currency'])) {
            continue;
        }

        $secondsTotal = (int)$row['seconds_total'];
        if ($secondsTotal <= 0) {
            continue;
        }

        $sampleCount += (int)$row['sample_count'];
        $secondsGrandTotal += $secondsTotal;
        $byCurrency[$row['reward_currency']] = (int)round(((int)$row['reward_total'] * 3600) / $secondsTotal);
    }

    return [
        'byCurrency' => $byCurrency,
        'sampleCount' => $sampleCount,
        'secondsTotal' => $secondsGrandTotal,
    ];
}

function build_efficiency_stats(
    PDO $pdo,
    array $earnedStatuses,
    DateTime $today,
    DateTime $weekStart,
    DateTime $monthStart
): array {
    return [
        'today' => build_efficiency_period($pdo, $earnedStatuses, $today),
        'week' => build_efficiency_period($pdo, $earnedStatuses, $weekStart),
        'month' => build_efficiency_period($pdo, $earnedStatuses, $monthStart),
        'allTime' => build_efficiency_period($pdo, $earnedStatuses, null),
    ];
}

function build_efficiency_period(PDO $pdo, array $earnedStatuses, ?DateTime $from): array {
    $placeholders = implode(',', array_fill(0, count($earnedStatuses), '?'));

    $sql = "
        SELECT reward_currency,
               COUNT(*) sample_count,
               SUM(reward_amount_minor) reward_total,
               SUM(time_taken_seconds) seconds_total
        FROM submissions
        WHERE status IN ($placeholders)
          AND reward_amount_minor > 0
          AND time_taken_seconds > 0
    ";

    $params = $earnedStatuses;

    if ($from) {
        $sql .= " AND completed_at >= ?";
        $params[] = $from->format('Y-m-d H:i:s');
    }

    $sql .= " GROUP BY reward_currency";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $byCurrency = [];
    $sampleCount = 0;
    $secondsGrandTotal = 0;

    foreach ($stmt->fetchAll() as $row) {
        if (empty($row['reward_currency'])) {
            continue;
        }

        $secondsTotal = (int)$row['seconds_total'];
        if ($secondsTotal <= 0) {
            continue;
        }

        $sampleCount += (int)$row['sample_count'];
        $secondsGrandTotal += $secondsTotal;
        $byCurrency[$row['reward_currency']] = (int)round(((int)$row['reward_total'] * 3600) / $secondsTotal);
    }

    return [
        'byCurrency' => $byCurrency,
        'sampleCount' => $sampleCount,
        'secondsTotal' => $secondsGrandTotal,
    ];
}

function build_top_studies(PDO $pdo, array $earnedStatuses): array {
    return [
        'byReward' => fetch_top_study_rows($pdo, $earnedStatuses, 'reward'),
        'byHourly' => fetch_top_study_rows($pdo, $earnedStatuses, 'hourly'),
    ];
}

function fetch_top_study_rows(PDO $pdo, array $earnedStatuses, string $sortMode): array {
    $placeholders = implode(',', array_fill(0, count($earnedStatuses), '?'));
    $timeFilter = $sortMode === 'hourly' ? 'AND s.time_taken_seconds > 0' : '';
    $orderBy = $sortMode === 'hourly'
        ? '(s.reward_amount_minor * 3600 / s.time_taken_seconds) DESC, s.reward_amount_minor DESC'
        : 's.reward_amount_minor DESC, s.completed_at DESC';

    $stmt = $pdo->prepare("
        SELECT s.study_id,
               COALESCE(NULLIF(s.study_name, ''), NULLIF(st.name, ''), s.study_id) AS display_name,
               s.status,
               s.reward_amount_minor,
               s.reward_currency,
               s.time_taken_seconds,
               s.completed_at
        FROM submissions s
        LEFT JOIN studies st ON st.id = s.study_id
        WHERE s.status IN ($placeholders)
          AND s.reward_amount_minor > 0
          $timeFilter
        ORDER BY $orderBy
        LIMIT 5
    ");
    $stmt->execute($earnedStatuses);

    $items = [];

    foreach ($stmt->fetchAll() as $row) {
        $rewardMinor = (int)$row['reward_amount_minor'];
        $seconds = (int)$row['time_taken_seconds'];

        $items[] = [
            'studyId' => $row['study_id'],
            'name' => $row['display_name'],
            'status' => $row['status'],
            'rewardMinor' => $rewardMinor,
            'rewardCurrency' => $row['reward_currency'],
            'timeTakenSeconds' => $seconds,
            'hourlyRateMinor' => $seconds > 0 ? (int)round(($rewardMinor * 3600) / $seconds) : null,
            'completedAt' => $row['completed_at'],
        ];
    }

    return $items;
}

function build_daily_stats(PDO $pdo, array $earnedStatuses, array $pendingStatuses, DateTime $today): array {
    $start = (clone $today)->modify('-29 days')->setTime(0, 0, 0);
    $end = (clone $today)->modify('+1 day')->setTime(0, 0, 0);
    $allStatuses = array_merge($earnedStatuses, $pendingStatuses);
    $placeholders = implode(',', array_fill(0, count($allStatuses), '?'));

    $params = $allStatuses;
    $params[] = $start->format('Y-m-d H:i:s');
    $params[] = $end->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        SELECT DATE(completed_at) stat_date,
               status,
               reward_currency,
               SUM(reward_amount_minor) total
        FROM submissions
        WHERE status IN ($placeholders)
          AND completed_at >= ?
          AND completed_at < ?
          AND reward_amount_minor > 0
        GROUP BY DATE(completed_at), status, reward_currency
    ");
    $stmt->execute($params);

    $byDate = [];
    for ($day = clone $start; $day < $end; $day->modify('+1 day')) {
        $dateKey = $day->format('Y-m-d');
        $byDate[$dateKey] = [
            'date' => $dateKey,
            'earned' => [],
            'pending' => [],
        ];
    }

    foreach ($stmt->fetchAll() as $row) {
        $dateKey = $row['stat_date'];
        $currency = $row['reward_currency'];

        if (!isset($byDate[$dateKey]) || empty($currency)) {
            continue;
        }

        $bucket = in_array($row['status'], $pendingStatuses, true) ? 'pending' : 'earned';
        if (!isset($byDate[$dateKey][$bucket][$currency])) {
            $byDate[$dateKey][$bucket][$currency] = 0;
        }

        $byDate[$dateKey][$bucket][$currency] += (int)$row['total'];
    }

    return array_values($byDate);
}

function build_system_stats(PDO $pdo, $lastSyncAt, ?array $lastSyncLog): array {
    return [
        'api' => 'ok',
        'lastSyncAt' => $lastSyncAt,
        'lastSyncLog' => $lastSyncLog,
        'lastError' => fetch_last_error_event($pdo),
        'dbCounts' => [
            'studies' => count_table_rows($pdo, 'studies'),
            'submissions' => count_table_rows($pdo, 'submissions'),
            'events' => count_table_rows($pdo, 'events'),
            'syncLog' => count_table_rows($pdo, 'sync_log'),
        ],
        'serverTime' => date('c'),
    ];
}

function fetch_last_error_event(PDO $pdo): ?array {
    $stmt = $pdo->prepare("
        SELECT *
        FROM events
        WHERE type LIKE ?
        ORDER BY id DESC
        LIMIT 1
    ");
    $stmt->execute(['%error%']);
    $row = $stmt->fetch();

    return $row ?: null;
}

function count_table_rows(PDO $pdo, string $table): int {
    $allowedTables = [
        'studies' => true,
        'submissions' => true,
        'events' => true,
        'sync_log' => true,
    ];

    if (!isset($allowedTables[$table])) {
        return 0;
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM `$table`");
    $stmt->execute();

    return (int)$stmt->fetchColumn();
}

/**
 * Summiert reward_amount_minor pro Währung, gefiltert nach Status & completed_at.
 *
 * $from / $to:
 * completed_at >= $from
 * completed_at <  $to
 */
function sum_by_period(PDO $pdo, array $statuses, ?DateTime $from, ?DateTime $to): array {
    $placeholders = implode(',', array_fill(0, count($statuses), '?'));

    $sql = "
        SELECT reward_currency, SUM(reward_amount_minor) total
        FROM submissions
        WHERE status IN ($placeholders)
    ";

    $params = $statuses;

    if ($from) {
        $sql .= " AND completed_at >= ?";
        $params[] = $from->format('Y-m-d H:i:s');
    }

    if ($to) {
        $sql .= " AND completed_at < ?";
        $params[] = $to->format('Y-m-d H:i:s');
    }

    $sql .= " GROUP BY reward_currency";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $result = [];

    foreach ($stmt->fetchAll() as $row) {
        if (empty($row['reward_currency'])) {
            continue;
        }

        $result[$row['reward_currency']] = (int)$row['total'];
    }

    return $result;
}
