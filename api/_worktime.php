<?php
/**
 * Shared worktime helpers for dashboard aggregations and exports.
 */

declare(strict_types=1);

function normalize_worktime_status($status): string {
    return strtoupper(str_replace(['-', '_'], ' ', trim((string)$status)));
}

function effective_time_seconds(array $sub): int {
    $raw = (int)($sub['time_taken_seconds'] ?? 0);
    $status = normalize_worktime_status($sub['status'] ?? '');

    if ($status === 'SCREENED OUT') {
        return max($raw, 60);
    }

    if ($raw <= 0) {
        return 60;
    }

    return $raw;
}

function effective_unpaid_time_seconds(array $sub): int {
    $status = normalize_worktime_status($sub['status'] ?? '');
    $completedAt = $sub['completed_at'] ?? null;

    if (in_array($status, ['RETURNED', 'REJECTED', 'TIMED OUT'], true)
        && ($completedAt === null || $completedAt === '')
    ) {
        return 60;
    }

    return effective_time_seconds($sub);
}

function worktime_seconds_sql(string $alias = ''): string {
    $prefix = $alias !== '' ? rtrim($alias, '.') . '.' : '';
    $statusField = $prefix . 'status';
    $timeField = $prefix . 'time_taken_seconds';

    return "CASE
        WHEN UPPER(REPLACE(COALESCE({$statusField}, ''), '-', ' ')) = 'SCREENED OUT'
            THEN GREATEST(COALESCE({$timeField}, 0), 60)
        WHEN {$timeField} IS NULL OR {$timeField} <= 0
            THEN 60
        ELSE {$timeField}
    END";
}

function sum_worktime_by_period(PDO $pdo, ?DateTime $from, ?DateTime $to): array {
    $sql = "
        SELECT status, time_taken_seconds, completed_at
        FROM submissions
        WHERE 1 = 1
    ";
    $params = [];

    if ($from) {
        $sql .= " AND COALESCE(completed_at, started_at) >= ?";
        $params[] = $from->format('Y-m-d H:i:s');
    }

    if ($to) {
        $sql .= " AND COALESCE(completed_at, started_at) < ?";
        $params[] = $to->format('Y-m-d H:i:s');
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $result = [
        'paid_seconds' => 0,
        'unpaid_seconds' => 0,
        'total_seconds' => 0,
        'count_paid' => 0,
        'count_unpaid' => 0,
        'count_total' => 0,
    ];
    $paidSet = ['APPROVED', 'AWAITING REVIEW', 'SCREENED OUT'];
    $unpaidSet = ['RETURNED', 'REJECTED', 'TIMED OUT'];

    foreach ($stmt->fetchAll() as $row) {
        $status = normalize_worktime_status($row['status'] ?? '');

        if (in_array($status, $paidSet, true)) {
            $seconds = effective_time_seconds($row);
            $result['paid_seconds'] += $seconds;
            $result['count_paid']++;
        } elseif (in_array($status, $unpaidSet, true)) {
            $seconds = effective_unpaid_time_seconds($row);
            $result['unpaid_seconds'] += $seconds;
            $result['count_unpaid']++;
        } else {
            $seconds = effective_time_seconds($row);
        }

        $result['total_seconds'] += $seconds;
        $result['count_total']++;
    }

    return $result;
}
