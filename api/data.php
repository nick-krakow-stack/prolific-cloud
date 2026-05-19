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
require_once __DIR__ . '/_rewards.php';
require_once __DIR__ . '/_worktime.php';
require_once __DIR__ . '/_extra_income.php';
require_once __DIR__ . '/_misc_income.php';
require_once __DIR__ . '/_telegram.php';
require_once __DIR__ . '/_telegram_commands.php';
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
            $studies = $stmt->fetchAll();

            json_response([
                'ok' => true,
                'studies' => $studies,
            ]);

        case 'submissions':
            $limit = (int)($_GET['limit'] ?? 200);
            $limit = max(1, min(1000, $limit));

            $rewardExpr = effective_reward_amount_sql();
            $stmt = $pdo->prepare("
                SELECT submissions.*, {$rewardExpr} AS effective_reward_amount_minor
                FROM submissions
                ORDER BY started_at DESC
                LIMIT ?
            ");
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
                'syncStatus' => build_sync_status($pdo),
                'events' => $stmt->fetchAll(),
            ]);

        case 'stats':
            json_response(build_stats_response($pdo));

        case 'account':
            json_response(build_account_response($pdo));

        case 'system':
            json_response(build_system_response($pdo));

        case 'settings':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                require_dashboard_write_request();
                json_response(save_dashboard_settings());
            }

            json_response(build_settings_response($pdo));

        case 'extraIncome':
            json_response(build_extra_income_response($pdo));

        case 'extraIncomeStart':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                json_error('Nur POST erlaubt.', 405);
            }
            require_dashboard_write_request();
            json_response(start_extra_income_timer($pdo));

        case 'extraIncomeStop':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                json_error('Nur POST erlaubt.', 405);
            }
            require_dashboard_write_request();
            json_response(stop_extra_income_timer($pdo));

        case 'extraIncomeSave':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                json_error('Nur POST erlaubt.', 405);
            }
            require_dashboard_write_request();
            json_response(save_extra_income_session($pdo));

        case 'extraIncomeDelete':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                json_error('Nur POST erlaubt.', 405);
            }
            require_dashboard_write_request();
            json_response(delete_extra_income_session($pdo));

        case 'extraIncomeMarkPaid':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                json_error('Nur POST erlaubt.', 405);
            }
            require_dashboard_write_request();
            json_response(mark_extra_income_paid($pdo));

        case 'miscIncome':
            json_response(build_misc_income_response($pdo));

        case 'miscIncomeSave':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                json_error('Nur POST erlaubt.', 405);
            }
            require_dashboard_write_request();
            json_response(save_misc_income_entry($pdo));

        case 'miscIncomeDelete':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                json_error('Nur POST erlaubt.', 405);
            }
            require_dashboard_write_request();
            json_response(delete_misc_income_entry($pdo));

        case 'telegramCommand':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                json_error('Nur POST erlaubt.', 405);
            }
            require_dashboard_write_request();
            json_response(telegram_execute_dashboard_command($pdo, read_json_body()));

        default:
            json_error('Unbekannter type-Parameter.', 400);
    }
} catch (Throwable $e) {
    json_error('Serverfehler.', 500);
}

// ============================================================
//   Helper: JSON-Settings sauber decodieren
// ============================================================

function decode_setting_value($value) {
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

    $dashboardSettings = load_dashboard_settings();
    $dashboardGoals = $dashboardSettings['goals'];
    $dailyGoalGbpMinor = $dashboardGoals['daily_gbp_minor'];
    $monthlyGoalGbpMinor = $dashboardGoals['monthly_gbp_minor'];

    $goalToday = sum_currency_maps($earnedToday, $pendingToday);
    $goalMonth = sum_currency_maps($earnedMonth, $pendingMonth);
    $goalTodayGbp = amount_for_currency($goalToday, 'GBP');
    $goalMonthGbp = amount_for_currency($goalMonth, 'GBP');

    $goals = [
        'daily_gbp_minor' => $dailyGoalGbpMinor,
        'monthly_gbp_minor' => $monthlyGoalGbpMinor,
        'daily_eur_minor' => $dashboardGoals['daily_eur_minor'] ?? null,
        'monthly_eur_minor' => $dashboardGoals['monthly_eur_minor'] ?? null,
        'today' => build_goal_progress($goalTodayGbp, $dailyGoalGbpMinor),
        'month' => build_goal_progress($goalMonthGbp, $monthlyGoalGbpMinor),
    ];

    $forecast = build_month_forecast($now, $goalMonthGbp, $monthlyGoalGbpMinor);
    $pendingStats = build_pending_stats($pdo, $pendingStatuses, $now);
    $statusStats = build_status_stats($subCounts);
    $todayStats = build_today_stats($pdo, $earnedStatuses, $today, $earnedToday, $pendingToday);
    $monthStats = build_period_stats($pdo, $earnedStatuses, $monthStart, $earnedMonth, $pendingMonth);
    $efficiency = build_efficiency_stats($pdo, $earnedStatuses, $today, $weekStart, $monthStart);
    $topStudies = build_top_studies($pdo, $earnedStatuses);
    $dailyStats = build_daily_stats($pdo, $earnedStatuses, $pendingStatuses, $today);
    $worktime = [
        'today'     => sum_worktime_by_period($pdo, $today, null),
        'week'      => sum_worktime_by_period($pdo, $weekStart, null),
        'month'     => sum_worktime_by_period($pdo, $monthStart, null),
        'lastMonth' => sum_worktime_by_period($pdo, $lastMonthStart, $lastMonthEnd),
        'allTime'   => sum_worktime_by_period($pdo, null, null),
    ];

    $balanceRaw   = get_setting('balance');
    $fxRatesRaw   = get_setting('fxRates');
    $lastSyncAt   = get_setting('lastSyncAt');

    $balance = decode_setting_value($balanceRaw);
    $fxRates = decode_setting_value($fxRatesRaw);

    $lastSyncRow = $pdo
        ->query("SELECT * FROM sync_log ORDER BY id DESC LIMIT 1")
        ->fetch();
    $system = build_system_stats($pdo, $lastSyncAt, $lastSyncRow ?: null);
    $extraIncome = build_extra_income_overview_summary($pdo);

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
        'monthStats'       => $monthStats,
        'efficiency'       => $efficiency,
        'topStudies'       => $topStudies,
        'dailyStats'       => $dailyStats,
        'worktime'        => $worktime,
        'extraIncome'     => $extraIncome,
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

function optional_positive_int($value): ?int {
    if (is_int($value) || is_string($value) || is_float($value)) {
        $intValue = (int)$value;
        if ($intValue > 0) {
            return $intValue;
        }
    }

    return null;
}

function amount_for_currency(array $amounts, string $currency): int {
    foreach ($amounts as $key => $value) {
        if (strtoupper((string)$key) === $currency) {
            return (int)$value;
        }
    }

    return 0;
}

function sum_currency_maps(array ...$maps): array {
    $result = [];

    foreach ($maps as $map) {
        foreach ($map as $currency => $value) {
            $currency = strtoupper((string)$currency);

            if ($currency === '') {
                continue;
            }

            if (!isset($result[$currency])) {
                $result[$currency] = 0;
            }

            $result[$currency] += (int)$value;
        }
    }

    ksort($result);

    return $result;
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
    $rewardExpr = effective_reward_amount_sql();
    $stmt = $pdo->prepare("
        SELECT reward_currency,
               COUNT(*) count_pending,
               SUM({$rewardExpr}) total_pending_minor,
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
    $returned = $normalizedCounts['RETURNED'] ?? 0;
    $rejected = ($normalizedCounts['REJECTED'] ?? 0) + $returned;
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
    return build_period_stats($pdo, $earnedStatuses, $today, $earnedToday, $pendingToday);
}

function build_period_stats(
    PDO $pdo,
    array $earnedStatuses,
    DateTime $periodStart,
    array $earned,
    array $pending
): array {
    $periodStartSql = $periodStart->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM submissions
        WHERE started_at >= ?
           OR completed_at >= ?
    ");
    $stmt->execute([$periodStartSql, $periodStartSql]);
    $submissionsCount = (int)$stmt->fetchColumn();

    return [
        'earned' => $earned,
        'pending' => $pending,
        'submissionsCount' => $submissionsCount,
        'averageReward' => build_period_average_reward($pdo, $earnedStatuses, $periodStartSql),
        'effectiveHourlyRate' => build_period_effective_hourly_rate($pdo, $earnedStatuses, $periodStartSql),
    ];
}

function build_today_average_reward(PDO $pdo, array $earnedStatuses, string $todayStart): array {
    return build_period_average_reward($pdo, $earnedStatuses, $todayStart);
}

function build_period_average_reward(PDO $pdo, array $earnedStatuses, string $periodStartSql): array {
    $placeholders = implode(',', array_fill(0, count($earnedStatuses), '?'));
    $rewardExpr = effective_reward_amount_sql();
    $params = $earnedStatuses;
    $params[] = $periodStartSql;

    $stmt = $pdo->prepare("
        SELECT reward_currency,
               COUNT(*) reward_count,
               SUM({$rewardExpr}) reward_total
        FROM submissions
        WHERE status IN ($placeholders)
          AND completed_at >= ?
          AND {$rewardExpr} > 0
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
    return build_period_effective_hourly_rate($pdo, $earnedStatuses, $todayStart);
}

function build_period_effective_hourly_rate(PDO $pdo, array $earnedStatuses, string $periodStartSql): array {
    $placeholders = implode(',', array_fill(0, count($earnedStatuses), '?'));
    $rewardExpr = effective_reward_amount_sql();
    $worktimeExpr = worktime_seconds_sql();
    $params = $earnedStatuses;
    $params[] = $periodStartSql;
    $params[] = $periodStartSql;

    $stmt = $pdo->prepare("
        SELECT reward_currency,
               COUNT(*) sample_count,
               SUM({$rewardExpr}) reward_total,
               SUM({$worktimeExpr}) seconds_total
        FROM submissions
        WHERE status IN ($placeholders)
          AND {$rewardExpr} > 0
          AND (completed_at >= ? OR started_at >= ?)
        GROUP BY reward_currency
    ");
    $stmt->execute($params);

    $byCurrency = [];
    $rewardByCurrency = [];
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
        $currency = $row['reward_currency'];
        $rewardTotal = (int)$row['reward_total'];
        $rewardByCurrency[$currency] = $rewardTotal;
        $byCurrency[$currency] = (int)round(($rewardTotal * 3600) / $secondsTotal);
    }

    return [
        'byCurrency' => $byCurrency,
        'rewardByCurrency' => $rewardByCurrency,
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
    $rewardExpr = effective_reward_amount_sql();
    $worktimeExpr = worktime_seconds_sql();

    $sql = "
        SELECT reward_currency,
               COUNT(*) sample_count,
               SUM({$rewardExpr}) reward_total,
               SUM({$worktimeExpr}) seconds_total
        FROM submissions
        WHERE status IN ($placeholders)
          AND {$rewardExpr} > 0
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
    $rewardByCurrency = [];
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
        $currency = $row['reward_currency'];
        $rewardTotal = (int)$row['reward_total'];
        $rewardByCurrency[$currency] = $rewardTotal;
        $byCurrency[$currency] = (int)round(($rewardTotal * 3600) / $secondsTotal);
    }

    return [
        'byCurrency' => $byCurrency,
        'rewardByCurrency' => $rewardByCurrency,
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
    $rewardExpr = effective_reward_amount_sql('s');
    $worktimeExpr = worktime_seconds_sql('s');
    $orderBy = $sortMode === 'hourly'
        ? "({$rewardExpr} * 3600 / {$worktimeExpr}) DESC, {$rewardExpr} DESC"
        : "{$rewardExpr} DESC, s.completed_at DESC";

    $stmt = $pdo->prepare("
        SELECT s.study_id,
               COALESCE(NULLIF(s.study_name, ''), NULLIF(st.name, ''), s.study_id) AS display_name,
               s.status,
               {$rewardExpr} AS effective_reward_amount_minor,
               s.reward_currency,
               s.time_taken_seconds,
               s.completed_at
        FROM submissions s
        LEFT JOIN studies st ON st.id = s.study_id
        WHERE s.status IN ($placeholders)
          AND {$rewardExpr} > 0
        ORDER BY $orderBy
        LIMIT 5
    ");
    $stmt->execute($earnedStatuses);

    $items = [];

    foreach ($stmt->fetchAll() as $row) {
        $rewardMinor = (int)$row['effective_reward_amount_minor'];
        $seconds = (int)$row['time_taken_seconds'];
        $effectiveSeconds = effective_time_seconds($row);

        $items[] = [
            'studyId' => $row['study_id'],
            'name' => $row['display_name'],
            'status' => $row['status'],
            'rewardMinor' => $rewardMinor,
            'rewardCurrency' => $row['reward_currency'],
            'timeTakenSeconds' => $seconds,
            'hourlyRateMinor' => (int)round(($rewardMinor * 3600) / $effectiveSeconds),
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
    $rewardExpr = effective_reward_amount_sql();

    $params = $allStatuses;
    $params[] = $start->format('Y-m-d H:i:s');
    $params[] = $end->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        SELECT DATE(completed_at) stat_date,
               status,
               reward_currency,
               SUM({$rewardExpr}) total
        FROM submissions
        WHERE status IN ($placeholders)
          AND completed_at >= ?
          AND completed_at < ?
          AND {$rewardExpr} > 0
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

function build_stats_response(PDO $pdo): array {
    $tz = new DateTimeZone(date_default_timezone_get());
    $now = new DateTime('now', $tz);
    $today = (clone $now)->setTime(0, 0, 0);
    $monthStart = (clone $today)->modify('first day of this month')->setTime(0, 0, 0);
    $nextMonthStart = (clone $monthStart)->modify('+1 month');
    $previousMonthStart = (clone $monthStart)->modify('-1 month');

    $earnedStatuses = ['APPROVED', 'SCREENED OUT', 'SCREENED-OUT'];
    $pendingStatuses = ['AWAITING REVIEW'];

    return [
        'ok' => true,
        'monthlyComparison' => build_monthly_comparison($pdo, $earnedStatuses, $monthStart, $nextMonthStart, $previousMonthStart),
        'heatmap' => build_heatmap_history($pdo, $earnedStatuses, $pendingStatuses, $today),
        'requesterStats' => build_requester_stats($pdo, $earnedStatuses),
        'monthlyReport' => build_monthly_report($pdo, $earnedStatuses, $pendingStatuses, $monthStart, $nextMonthStart),
        'serverTime' => date('c'),
    ];
}

function build_account_response(PDO $pdo): array {
    $tz = new DateTimeZone(date_default_timezone_get());
    $today = (new DateTime('now', $tz))->setTime(0, 0, 0);
    $monthStart = (clone $today)->modify('first day of this month')->setTime(0, 0, 0);
    $earnedStatuses = ['APPROVED', 'SCREENED OUT', 'SCREENED-OUT'];

    return [
        'ok' => true,
        'balance' => decode_setting_value(get_setting('balance')),
        'fxRates' => decode_setting_value(get_setting('fxRates')),
        'earnings' => [
            'month' => [
                'earned' => sum_by_period($pdo, $earnedStatuses, $monthStart, null),
            ],
            'allTime' => [
                'earned' => sum_by_period($pdo, $earnedStatuses, null, null),
            ],
        ],
        'serverTime' => date('c'),
    ];
}

function build_system_response(PDO $pdo): array {
    $lastSyncAt = get_setting('lastSyncAt');
    $lastSyncRow = $pdo
        ->query("SELECT * FROM sync_log ORDER BY id DESC LIMIT 1")
        ->fetch();
    $system = build_system_stats($pdo, $lastSyncAt, $lastSyncRow ?: null);
    $eventStmt = $pdo->prepare("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?");
    $eventStmt->bindValue(1, 10, PDO::PARAM_INT);
    $eventStmt->execute();

    return [
        'ok' => true,
        'system' => $system,
        'telegram' => build_telegram_system_status($pdo),
        'syncStatus' => build_sync_status($pdo),
        'events' => $eventStmt->fetchAll(),
        'lastSync' => [
            'at' => $lastSyncAt,
            'log' => $lastSyncRow ?: null,
        ],
        'lastError' => $system['lastError'] ?? null,
        'dbCounts' => $system['dbCounts'] ?? [],
        'fxRates' => decode_setting_value(get_setting('fxRates')),
        'serverTime' => date('c'),
    ];
}

function build_settings_response(PDO $pdo): array {
    $lastSyncAt = get_setting('lastSyncAt');
    $lastSyncRow = $pdo
        ->query("SELECT * FROM sync_log ORDER BY id DESC LIMIT 1")
        ->fetch();

    return [
        'ok' => true,
        'settings' => load_dashboard_settings(),
        'fxRates' => decode_setting_value(get_setting('fxRates')),
        'system' => build_system_stats($pdo, $lastSyncAt, $lastSyncRow ?: null),
        'serverTime' => date('c'),
    ];
}

function build_telegram_system_status(PDO $pdo): array {
    $telegram = telegram_config();
    $configured = !empty($telegram['bot_token'])
        && !empty($telegram['allowed_chat_id'])
        && !empty($telegram['webhook_secret']);
    $webhookInfo = $configured
        ? telegram_get_webhook_info()
        : ['ok' => false, 'error' => 'not_configured'];
    $lastCommand = null;
    $commandCount24h = null;
    $dbError = null;

    try {
        $stmt = $pdo->query("
            SELECT command, text, received_at, response_sent, response_error
            FROM telegram_messages
            ORDER BY received_at DESC, id DESC
            LIMIT 1
        ");
        $lastCommand = $stmt->fetch() ?: null;

        $countStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM telegram_messages
            WHERE received_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ");
        $countStmt->execute();
        $commandCount24h = (int)$countStmt->fetchColumn();
    } catch (Throwable $e) {
        $dbError = 'telegram_messages nicht lesbar';
    }

    $lastErrorMessage = $webhookInfo['lastErrorMessage'] ?? null;
    $webhookOk = !empty($webhookInfo['ok']);

    return [
        'configured' => $configured,
        'webhookOk' => $webhookOk,
        'status' => $configured && $webhookOk && !$lastErrorMessage ? 'ok' : 'warning',
        'pendingUpdateCount' => $webhookInfo['pendingUpdateCount'] ?? null,
        'lastErrorDate' => $webhookInfo['lastErrorDate'] ?? null,
        'lastErrorMessage' => $lastErrorMessage,
        'maxConnections' => $webhookInfo['maxConnections'] ?? null,
        'error' => $webhookInfo['error'] ?? $dbError,
        'lastCommand' => $lastCommand,
        'commandCount24h' => $commandCount24h,
        'commands' => telegram_command_definitions(),
    ];
}

function build_sync_status(PDO $pdo): array {
    $lastSync = fetch_sync_event($pdo, ['sync_ok', 'sync_error']);
    $lastSuccess = fetch_sync_event($pdo, ['sync_ok']);
    $lastFailure = fetch_sync_event($pdo, ['sync_error']);

    if (!$lastSuccess) {
        $lastSyncLog = $pdo
            ->query("SELECT * FROM sync_log ORDER BY timestamp DESC, id DESC LIMIT 1")
            ->fetch();

        if ($lastSyncLog) {
            $lastSuccess = [
                'status' => 'ok',
                'type' => 'sync_log',
                'message' => 'Sync abgeschlossen',
                'timestamp' => $lastSyncLog['timestamp'] ?? null,
            ];
        }
    }

    if (!$lastSync && $lastSuccess) {
        $lastSync = $lastSuccess;
    }

    return [
        'lastSync' => $lastSync,
        'lastSuccess' => $lastSuccess,
        'lastFailure' => $lastFailure,
    ];
}

function fetch_sync_event(PDO $pdo, array $types): ?array {
    $types = array_values(array_filter($types, static function ($type): bool {
        return is_string($type) && $type !== '';
    }));

    if (empty($types)) {
        return null;
    }

    $placeholders = implode(',', array_fill(0, count($types), '?'));
    $stmt = $pdo->prepare("
        SELECT *
        FROM events
        WHERE type IN ($placeholders)
        ORDER BY timestamp DESC, id DESC
        LIMIT 1
    ");
    $stmt->execute($types);
    $row = $stmt->fetch();

    if (!$row) {
        return null;
    }

    $type = (string)($row['type'] ?? '');

    return [
        'status' => $type === 'sync_error' ? 'error' : 'ok',
        'type' => $type,
        'message' => $row['message'] ?? '',
        'timestamp' => $row['timestamp'] ?? null,
    ];
}

function save_dashboard_settings(): array {
    $body = read_json_body();
    $current = load_dashboard_settings();
    $source = isset($body['settings']) && is_array($body['settings']) ? $body['settings'] : $body;
    $inputCurrency = strtoupper((string)($body['currency'] ?? ($source['currency'] ?? 'GBP')));

    $goalsInput = isset($source['goals']) && is_array($source['goals']) ? $source['goals'] : [];
    $thresholdsInput = isset($source['thresholds']) && is_array($source['thresholds']) ? $source['thresholds'] : [];

    $goals = [
        'daily_gbp_minor' => positive_int(
            $goalsInput['daily_gbp_minor'] ?? ($goalsInput['daily'] ?? null),
            $current['goals']['daily_gbp_minor']
        ),
        'monthly_gbp_minor' => positive_int(
            $goalsInput['monthly_gbp_minor'] ?? ($goalsInput['monthly'] ?? null),
            $current['goals']['monthly_gbp_minor']
        ),
    ];

    if ($inputCurrency === 'EUR') {
        $dailyEurMinor = optional_positive_int($goalsInput['daily_eur_minor'] ?? null);
        $monthlyEurMinor = optional_positive_int($goalsInput['monthly_eur_minor'] ?? null);

        if ($dailyEurMinor !== null) {
            $goals['daily_eur_minor'] = $dailyEurMinor;
        }
        if ($monthlyEurMinor !== null) {
            $goals['monthly_eur_minor'] = $monthlyEurMinor;
        }
    }

    $thresholds = [
        'great_hourly_gbp_minor' => positive_int(
            $thresholdsInput['great_hourly_gbp_minor'] ?? null,
            $current['thresholds']['great_hourly_gbp_minor']
        ),
        'ok_hourly_gbp_minor' => positive_int(
            $thresholdsInput['ok_hourly_gbp_minor'] ?? null,
            $current['thresholds']['ok_hourly_gbp_minor']
        ),
    ];

    if ($inputCurrency === 'EUR') {
        $greatHourlyEurMinor = optional_positive_int($thresholdsInput['great_hourly_eur_minor'] ?? null);
        $okHourlyEurMinor = optional_positive_int($thresholdsInput['ok_hourly_eur_minor'] ?? null);

        if ($greatHourlyEurMinor !== null) {
            $thresholds['great_hourly_eur_minor'] = $greatHourlyEurMinor;
        }
        if ($okHourlyEurMinor !== null) {
            $thresholds['ok_hourly_eur_minor'] = $okHourlyEurMinor;
        }
    }

    set_setting('dashboardGoals', $goals);
    set_setting('dashboardThresholds', $thresholds);

    return [
        'ok' => true,
        'settings' => [
            'goals' => $goals,
            'thresholds' => $thresholds,
        ],
        'serverTime' => date('c'),
    ];
}

function load_dashboard_settings(): array {
    global $config;

    $defaultGoals = [
        'daily_gbp_minor' => positive_int($config['goals']['daily_gbp_minor'] ?? null, 500),
        'monthly_gbp_minor' => positive_int($config['goals']['monthly_gbp_minor'] ?? null, 15000),
    ];
    $defaultThresholds = [
        'great_hourly_gbp_minor' => 1200,
        'ok_hourly_gbp_minor' => 800,
    ];

    $savedGoals = get_setting('dashboardGoals', []);
    $savedThresholds = get_setting('dashboardThresholds', []);

    if (!is_array($savedGoals)) {
        $savedGoals = [];
    }
    if (!is_array($savedThresholds)) {
        $savedThresholds = [];
    }

    $goals = [
        'daily_gbp_minor' => positive_int($savedGoals['daily_gbp_minor'] ?? null, $defaultGoals['daily_gbp_minor']),
        'monthly_gbp_minor' => positive_int($savedGoals['monthly_gbp_minor'] ?? null, $defaultGoals['monthly_gbp_minor']),
    ];
    $thresholds = [
        'great_hourly_gbp_minor' => positive_int(
            $savedThresholds['great_hourly_gbp_minor'] ?? null,
            $defaultThresholds['great_hourly_gbp_minor']
        ),
        'ok_hourly_gbp_minor' => positive_int(
            $savedThresholds['ok_hourly_gbp_minor'] ?? null,
            $defaultThresholds['ok_hourly_gbp_minor']
        ),
    ];

    foreach (['daily_eur_minor', 'monthly_eur_minor'] as $key) {
        $value = optional_positive_int($savedGoals[$key] ?? null);
        if ($value !== null) {
            $goals[$key] = $value;
        }
    }

    foreach (['great_hourly_eur_minor', 'ok_hourly_eur_minor'] as $key) {
        $value = optional_positive_int($savedThresholds[$key] ?? null);
        if ($value !== null) {
            $thresholds[$key] = $value;
        }
    }

    return [
        'goals' => $goals,
        'thresholds' => $thresholds,
    ];
}

function build_monthly_comparison(
    PDO $pdo,
    array $earnedStatuses,
    DateTime $monthStart,
    DateTime $nextMonthStart,
    DateTime $previousMonthStart
): array {
    $currentEarned = sum_by_period($pdo, $earnedStatuses, $monthStart, $nextMonthStart);
    $previousEarned = sum_by_period($pdo, $earnedStatuses, $previousMonthStart, $monthStart);
    $currentCount = count_submissions_by_period($pdo, $monthStart, $nextMonthStart);
    $previousCount = count_submissions_by_period($pdo, $previousMonthStart, $monthStart);
    $deltaEarned = [];

    foreach (array_unique(array_merge(array_keys($currentEarned), array_keys($previousEarned))) as $currency) {
        $deltaEarned[$currency] = (int)($currentEarned[$currency] ?? 0) - (int)($previousEarned[$currency] ?? 0);
    }

    ksort($deltaEarned);
    $previousGbp = amount_for_currency($previousEarned, 'GBP');
    $currentGbp = amount_for_currency($currentEarned, 'GBP');

    return [
        'current' => [
            'month' => $monthStart->format('Y-m'),
            'earned' => $currentEarned,
            'submissionsCount' => $currentCount,
        ],
        'previous' => [
            'month' => $previousMonthStart->format('Y-m'),
            'earned' => $previousEarned,
            'submissionsCount' => $previousCount,
        ],
        'delta' => [
            'earned' => $deltaEarned,
            'submissionsCount' => $currentCount - $previousCount,
            'percent' => $previousGbp > 0 ? round((($currentGbp - $previousGbp) / $previousGbp) * 100, 1) : null,
        ],
    ];
}

function build_month_heatmap(
    PDO $pdo,
    array $earnedStatuses,
    array $pendingStatuses,
    DateTime $monthStart,
    DateTime $today
): array {
    $endExclusive = (clone $today)->modify('+1 day')->setTime(0, 0, 0);
    $allStatuses = array_merge($earnedStatuses, $pendingStatuses);
    $placeholders = implode(',', array_fill(0, count($allStatuses), '?'));
    $rewardExpr = effective_reward_amount_sql();
    $params = $allStatuses;
    $params[] = $monthStart->format('Y-m-d H:i:s');
    $params[] = $endExclusive->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        SELECT DATE(completed_at) stat_date,
               status,
               reward_currency,
               SUM({$rewardExpr}) total
        FROM submissions
        WHERE status IN ($placeholders)
          AND completed_at >= ?
          AND completed_at < ?
          AND {$rewardExpr} > 0
        GROUP BY DATE(completed_at), status, reward_currency
    ");
    $stmt->execute($params);

    $byDate = [];
    for ($day = clone $monthStart; $day < $endExclusive; $day->modify('+1 day')) {
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

function build_heatmap_history(PDO $pdo, array $earnedStatuses, array $pendingStatuses, DateTime $today): array {
    $allStatuses = array_merge($earnedStatuses, $pendingStatuses);
    $placeholders = implode(',', array_fill(0, count($allStatuses), '?'));
    $rewardExpr = effective_reward_amount_sql();
    $endExclusive = (clone $today)->modify('+1 day')->setTime(0, 0, 0);
    $stmt = $pdo->prepare("
        SELECT DATE(completed_at) stat_date,
               status,
               reward_currency,
               SUM({$rewardExpr}) total
        FROM submissions
        WHERE status IN ($placeholders)
          AND completed_at < ?
          AND {$rewardExpr} > 0
        GROUP BY DATE(completed_at), status, reward_currency
        ORDER BY stat_date ASC
    ");
    $params = $allStatuses;
    $params[] = $endExclusive->format('Y-m-d H:i:s');
    $stmt->execute($params);

    $rows = $stmt->fetchAll();

    if (!$rows) {
        return build_month_heatmap($pdo, $earnedStatuses, $pendingStatuses, (clone $today)->modify('first day of this month')->setTime(0, 0, 0), $today);
    }

    $firstDate = new DateTime((string)$rows[0]['stat_date'], $today->getTimezone());
    $start = $firstDate->modify('first day of this month')->setTime(0, 0, 0);
    $byDate = [];

    for ($day = clone $start; $day < $endExclusive; $day->modify('+1 day')) {
        $dateKey = $day->format('Y-m-d');
        $byDate[$dateKey] = [
            'date' => $dateKey,
            'earned' => [],
            'pending' => [],
        ];
    }

    foreach ($rows as $row) {
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

function build_monthly_report(
    PDO $pdo,
    array $earnedStatuses,
    array $pendingStatuses,
    DateTime $monthStart,
    DateTime $nextMonthStart
): array {
    return [
        'month' => $monthStart->format('Y-m'),
        'earned' => sum_by_period($pdo, $earnedStatuses, $monthStart, $nextMonthStart),
        'pending' => sum_by_period($pdo, $pendingStatuses, $monthStart, $nextMonthStart),
        'submissionsCount' => count_submissions_by_period($pdo, $monthStart, $nextMonthStart),
        'statusCounts' => count_statuses_by_period($pdo, $monthStart, $nextMonthStart),
        'hourlyRate' => build_efficiency_period($pdo, $earnedStatuses, $monthStart),
        'topStudies' => build_top_studies_for_period($pdo, $earnedStatuses, $monthStart, $nextMonthStart),
        'requesterStats' => build_requester_stats($pdo, $earnedStatuses, $monthStart, $nextMonthStart, 5),
    ];
}

function build_requester_stats(PDO $pdo, array $earnedStatuses, ?DateTime $from = null, ?DateTime $to = null, int $limit = 10): array {
    $rewardExpr = effective_reward_amount_sql();
    $worktimeExpr = worktime_seconds_sql();
    $sql = "
        SELECT COALESCE(NULLIF(researcher_name, ''), NULLIF(institution, ''), 'Unbekannt') requester,
               status,
               reward_currency,
               COUNT(*) submission_count,
               SUM({$rewardExpr}) reward_total,
               SUM(CASE WHEN status IN (" . placeholders_for_inline_count(count($earnedStatuses)) . ") THEN {$rewardExpr} ELSE 0 END) hourly_reward_total,
               SUM(CASE WHEN status IN (" . placeholders_for_inline_count(count($earnedStatuses)) . ") THEN {$worktimeExpr} ELSE 0 END) seconds_total,
               SUM(CASE
                   WHEN status = 'APPROVED'
                    AND completed_at IS NOT NULL
                    AND updated_at IS NOT NULL
                    AND updated_at >= completed_at
                   THEN TIMESTAMPDIFF(SECOND, completed_at, updated_at)
                   ELSE 0
               END) review_seconds_total,
               SUM(CASE
                   WHEN status = 'APPROVED'
                    AND completed_at IS NOT NULL
                    AND updated_at IS NOT NULL
                    AND updated_at >= completed_at
                   THEN 1
                   ELSE 0
               END) review_sample_count
        FROM submissions
        WHERE 1 = 1
    ";
    $params = array_merge($earnedStatuses, $earnedStatuses);

    if ($from) {
        $sql .= " AND completed_at >= ?";
        $params[] = $from->format('Y-m-d H:i:s');
    }
    if ($to) {
        $sql .= " AND completed_at < ?";
        $params[] = $to->format('Y-m-d H:i:s');
    }

    $sql .= "
        GROUP BY requester, status, reward_currency
        ORDER BY SUM({$rewardExpr}) DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $items = [];

    foreach ($stmt->fetchAll() as $row) {
        $requester = $row['requester'] ?: 'Unbekannt';
        if (!isset($items[$requester])) {
            $items[$requester] = [
                'requester' => $requester,
                'submissionsCount' => 0,
                'approvedCount' => 0,
                'rejectedCount' => 0,
                'pendingCount' => 0,
                'totalReward' => [],
                'averageHourlyRate' => [],
                '_secondsByCurrency' => [],
                '_hourlyRewardByCurrency' => [],
                '_reviewSecondsTotal' => 0,
                '_reviewSampleCount' => 0,
            ];
        }

        $count = (int)$row['submission_count'];
        $status = (string)$row['status'];
        $currency = $row['reward_currency'];
        $items[$requester]['submissionsCount'] += $count;

        if ($status === 'APPROVED') {
            $items[$requester]['approvedCount'] += $count;
        } elseif (in_array($status, ['REJECTED', 'RETURNED'], true)) {
            $items[$requester]['rejectedCount'] += $count;
        } elseif ($status === 'AWAITING REVIEW') {
            $items[$requester]['pendingCount'] += $count;
        }

        if (!empty($currency)) {
            if (!isset($items[$requester]['totalReward'][$currency])) {
                $items[$requester]['totalReward'][$currency] = 0;
            }
            if (!isset($items[$requester]['_secondsByCurrency'][$currency])) {
                $items[$requester]['_secondsByCurrency'][$currency] = 0;
            }
            if (!isset($items[$requester]['_hourlyRewardByCurrency'][$currency])) {
                $items[$requester]['_hourlyRewardByCurrency'][$currency] = 0;
            }

            $items[$requester]['totalReward'][$currency] += (int)$row['reward_total'];
            $items[$requester]['_hourlyRewardByCurrency'][$currency] += (int)$row['hourly_reward_total'];
            $items[$requester]['_secondsByCurrency'][$currency] += (int)$row['seconds_total'];
        }

        $items[$requester]['_reviewSecondsTotal'] += (int)$row['review_seconds_total'];
        $items[$requester]['_reviewSampleCount'] += (int)$row['review_sample_count'];
    }

    foreach ($items as &$item) {
        foreach ($item['totalReward'] as $currency => $rewardTotal) {
            $secondsTotal = (int)($item['_secondsByCurrency'][$currency] ?? 0);
            $hourlyRewardTotal = (int)($item['_hourlyRewardByCurrency'][$currency] ?? 0);
            if ($secondsTotal > 0) {
                $item['averageHourlyRate'][$currency] = (int)round(($hourlyRewardTotal * 3600) / $secondsTotal);
            }
        }

        $decidedCount = $item['approvedCount'] + $item['rejectedCount'];
        $item['approvalRate'] = percentage($item['approvedCount'], $decidedCount);
        $item['averageReviewSeconds'] = $item['_reviewSampleCount'] > 0
            ? (int)round($item['_reviewSecondsTotal'] / $item['_reviewSampleCount'])
            : null;

        unset($item['_secondsByCurrency'], $item['_hourlyRewardByCurrency'], $item['_reviewSecondsTotal'], $item['_reviewSampleCount']);
    }
    unset($item);

    usort($items, function (array $a, array $b): int {
        $rewardDiff = amount_for_currency($b['totalReward'], 'GBP') <=> amount_for_currency($a['totalReward'], 'GBP');
        if ($rewardDiff !== 0) {
            return $rewardDiff;
        }

        return $b['submissionsCount'] <=> $a['submissionsCount'];
    });

    return array_slice($items, 0, $limit);
}

function placeholders_for_inline_count(int $count): string {
    return implode(',', array_fill(0, $count, '?'));
}

function count_submissions_by_period(PDO $pdo, DateTime $from, DateTime $to): int {
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM submissions
        WHERE completed_at >= ?
          AND completed_at < ?
    ");
    $stmt->execute([$from->format('Y-m-d H:i:s'), $to->format('Y-m-d H:i:s')]);

    return (int)$stmt->fetchColumn();
}

function count_statuses_by_period(PDO $pdo, DateTime $from, DateTime $to): array {
    $stmt = $pdo->prepare("
        SELECT status, COUNT(*) cnt
        FROM submissions
        WHERE completed_at >= ?
          AND completed_at < ?
        GROUP BY status
    ");
    $stmt->execute([$from->format('Y-m-d H:i:s'), $to->format('Y-m-d H:i:s')]);

    $counts = [];
    foreach ($stmt->fetchAll() as $row) {
        $status = $row['status'] !== null && $row['status'] !== '' ? (string)$row['status'] : 'UNKNOWN';
        $counts[$status] = (int)$row['cnt'];
    }

    return $counts;
}

function build_top_studies_for_period(PDO $pdo, array $earnedStatuses, DateTime $from, DateTime $to): array {
    $placeholders = implode(',', array_fill(0, count($earnedStatuses), '?'));
    $rewardExpr = effective_reward_amount_sql('s');
    $params = $earnedStatuses;
    $params[] = $from->format('Y-m-d H:i:s');
    $params[] = $to->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        SELECT s.study_id,
               COALESCE(NULLIF(s.study_name, ''), NULLIF(st.name, ''), s.study_id) AS display_name,
               s.status,
               {$rewardExpr} AS effective_reward_amount_minor,
               s.reward_currency,
               s.time_taken_seconds,
               s.completed_at
        FROM submissions s
        LEFT JOIN studies st ON st.id = s.study_id
        WHERE s.status IN ($placeholders)
          AND {$rewardExpr} > 0
          AND s.completed_at >= ?
          AND s.completed_at < ?
        ORDER BY {$rewardExpr} DESC, s.completed_at DESC
        LIMIT 5
    ");
    $stmt->execute($params);

    $items = [];
    foreach ($stmt->fetchAll() as $row) {
        $rewardMinor = (int)$row['effective_reward_amount_minor'];
        $seconds = (int)$row['time_taken_seconds'];
        $effectiveSeconds = effective_time_seconds($row);
        $items[] = [
            'studyId' => $row['study_id'],
            'name' => $row['display_name'],
            'status' => $row['status'],
            'rewardMinor' => $rewardMinor,
            'rewardCurrency' => $row['reward_currency'],
            'timeTakenSeconds' => $seconds,
            'hourlyRateMinor' => (int)round(($rewardMinor * 3600) / $effectiveSeconds),
            'completedAt' => $row['completed_at'],
        ];
    }

    return $items;
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
 * Summiert den effektiven Reward pro Währung, gefiltert nach Status & completed_at.
 *
 * $from / $to:
 * completed_at >= $from
 * completed_at <  $to
 */
function sum_by_period(PDO $pdo, array $statuses, ?DateTime $from, ?DateTime $to): array {
    $placeholders = implode(',', array_fill(0, count($statuses), '?'));
    $rewardExpr = effective_reward_amount_sql();

    $sql = "
        SELECT reward_currency, SUM({$rewardExpr}) total
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
