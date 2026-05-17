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

    $balanceRaw   = get_setting('balance');
    $fxRatesRaw   = get_setting('fxRates');
    $lastSyncAt   = get_setting('lastSyncAt');

    $balance = decode_setting_value($balanceRaw);
    $fxRates = decode_setting_value($fxRatesRaw);

    $lastSyncRow = $pdo
        ->query("SELECT * FROM sync_log ORDER BY id DESC LIMIT 1")
        ->fetch();

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
        'balance'          => $balance,
        'fxRates'          => $fxRates,
        'lastSyncAt'       => $lastSyncAt,
        'lastSyncLog'      => $lastSyncRow ?: null,
        'serverTime'       => date('c'),
    ];
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