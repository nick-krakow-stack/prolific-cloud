<?php
/**
 * CSV-Export fuer Dashboard-Daten.
 */

declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/_rewards.php';
require_once __DIR__ . '/_worktime.php';
require_once __DIR__ . '/../dashboard/session.php';

require_login();

$type = $_GET['type'] ?? '';
$format = $_GET['format'] ?? '';

if ($type !== 'submissions' || $format !== 'csv') {
    json_error('Ungueltiger Export.', 400);
}

try {
    export_submissions_csv(db());
} catch (Throwable $e) {
    json_error('Serverfehler.', 500);
}

function export_submissions_csv(PDO $pdo): void {
    $rewardExpr = effective_reward_amount_sql('s');
    $stmt = $pdo->prepare("
        SELECT
            s.study_name,
            s.status,
            {$rewardExpr} AS effective_reward_amount_minor,
            s.reward_currency,
            s.started_at,
            s.completed_at,
            s.time_taken_seconds,
            s.study_id,
            s.id AS submission_id,
            s.researcher_name AS submission_researcher_name,
            s.institution AS submission_institution,
            st.name AS stored_study_name,
            st.researcher_name AS stored_researcher_name,
            st.estimated_minutes
        FROM submissions s
        LEFT JOIN studies st ON st.id = s.study_id
        ORDER BY s.started_at DESC, s.completed_at DESC, s.id DESC
    ");
    $stmt->execute();

    $filename = 'prolific-submissions-' . date('Y-m-d') . '.csv';

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-store');

    $out = fopen('php://output', 'wb');
    if ($out === false) {
        json_error('CSV-Ausgabe nicht moeglich.', 500);
    }

    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, [
        'Study Name',
        'Status',
        'Reward',
        'Currency',
        'Started At',
        'Completed At',
        'Time Taken',
        'Reward per Hour',
        'Study ID',
        'Submission ID',
        'Researcher/Institution',
    ], ';', '"', '');

    foreach ($stmt->fetchAll() as $row) {
        $rewardMinor = nullable_int($row['effective_reward_amount_minor'] ?? null);
        $seconds = nullable_int($row['time_taken_seconds'] ?? null);
        $effectiveSeconds = effective_time_seconds($row);

        safe_fputcsv($out, [
            first_non_empty($row['study_name'] ?? null, $row['stored_study_name'] ?? null),
            (string)($row['status'] ?? ''),
            $rewardMinor !== null ? format_minor_amount($rewardMinor) : '',
            (string)($row['reward_currency'] ?? ''),
            (string)($row['started_at'] ?? ''),
            (string)($row['completed_at'] ?? ''),
            $seconds !== null ? format_duration($seconds) : '',
            $rewardMinor !== null
                ? format_minor_amount((int)round(($rewardMinor * 3600) / $effectiveSeconds))
                : '',
            (string)($row['study_id'] ?? ''),
            (string)($row['submission_id'] ?? ''),
            researcher_institution($row),
        ]);
    }

    fclose($out);
    exit;
}

function safe_fputcsv($handle, array $row): void {
    fputcsv($handle, array_map('neutralize_csv_cell', $row), ';', '"', '');
}

function neutralize_csv_cell($value): string {
    $value = (string)$value;
    $trimmed = ltrim($value);

    if ($trimmed !== '' && in_array($trimmed[0], ['=', '+', '-', '@'], true)) {
        return "'" . $value;
    }

    return $value;
}

function nullable_int($value): ?int {
    if ($value === null || $value === '') {
        return null;
    }

    return (int)$value;
}

function first_non_empty(?string $first, ?string $second): string {
    $first = trim((string)$first);
    if ($first !== '') {
        return $first;
    }

    return trim((string)$second);
}

function format_minor_amount(int $minor): string {
    return number_format($minor / 100, 2, '.', '');
}

function format_duration(int $seconds): string {
    if ($seconds < 0) {
        $seconds = 0;
    }

    $hours = intdiv($seconds, 3600);
    $minutes = intdiv($seconds % 3600, 60);
    $remainingSeconds = $seconds % 60;

    if ($hours > 0) {
        return sprintf('%d:%02d:%02d', $hours, $minutes, $remainingSeconds);
    }

    return sprintf('%d:%02d', $minutes, $remainingSeconds);
}

function researcher_institution(array $row): string {
    $parts = [];

    foreach ([
        $row['submission_researcher_name'] ?? null,
        $row['stored_researcher_name'] ?? null,
        $row['submission_institution'] ?? null,
    ] as $value) {
        $value = trim((string)$value);
        if ($value !== '' && !in_array($value, $parts, true)) {
            $parts[] = $value;
        }
    }

    return implode(' / ', $parts);
}
