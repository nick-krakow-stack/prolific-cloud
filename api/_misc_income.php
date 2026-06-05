<?php
declare(strict_types=1);

const MISC_INCOME_TABLE = 'misc_income_entries';
const MISC_INCOME_CATEGORIES = ['tech_support', 'user_testing', 'testable_minds', 'testbirds', 'respondent'];
const MISC_INCOME_PORTAL_TYPES = ['survey', 'task', 'test'];
const MISC_INCOME_USD_AMOUNT_CATEGORIES = ['user_testing', 'testable_minds', 'testbirds', 'respondent'];
const MISC_INCOME_REQUIRED_COLUMNS = [
    'id',
    'category',
    'entry_type',
    'entry_date',
    'hours_hundredths',
    'hourly_rate_cents',
    'amount_minor',
    'currency',
    'created_at',
    'updated_at',
];

function misc_income_schema_exists(PDO $pdo): bool {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
        ");
        $stmt->execute([MISC_INCOME_TABLE]);
        if ((int)$stmt->fetchColumn() < 1) {
            return false;
        }

        $columnStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
        ");
        foreach (MISC_INCOME_REQUIRED_COLUMNS as $column) {
            $columnStmt->execute([MISC_INCOME_TABLE, $column]);
            if ((int)$columnStmt->fetchColumn() < 1) {
                return false;
            }
        }

        return true;
    } catch (Throwable $e) {
        return false;
    }
}

function misc_income_require_schema(PDO $pdo): void {
    if (!misc_income_schema_exists($pdo)) {
        json_error('Zusatzeinkommen-Speicher ist noch nicht installiert.', 503);
    }
}

function misc_income_empty_response(): array {
    return [
        'ok' => true,
        'schemaReady' => false,
        'entries' => [],
        'summary' => misc_income_calculate_summary([]),
        'fxRates' => misc_income_load_fx_rates(),
        'serverTime' => date('c'),
    ];
}

function build_misc_income_response(PDO $pdo): array {
    if (!misc_income_schema_exists($pdo)) {
        return misc_income_empty_response();
    }

    $entries = misc_income_fetch_entries($pdo);

    return [
        'ok' => true,
        'schemaReady' => true,
        'entries' => array_map('misc_income_entry_to_response', $entries),
        'summary' => misc_income_calculate_summary($entries),
        'fxRates' => misc_income_load_fx_rates(),
        'serverTime' => date('c'),
    ];
}

function save_misc_income_entry(PDO $pdo): array {
    misc_income_require_schema($pdo);

    $body = read_json_body();
    $entry = misc_income_validate_entry_payload($body);
    $id = misc_income_optional_int($body, ['id'], 0);
    $now = date('Y-m-d H:i:s');

    if ($id > 0) {
        $stmt = $pdo->prepare("
            UPDATE misc_income_entries
            SET category = ?,
                entry_type = ?,
                entry_date = ?,
                hours_hundredths = ?,
                hourly_rate_cents = ?,
                amount_minor = ?,
                currency = ?,
                updated_at = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $entry['category'],
            $entry['entry_type'],
            $entry['entry_date'],
            $entry['hours_hundredths'],
            $entry['hourly_rate_cents'],
            $entry['amount_minor'],
            $entry['currency'],
            $now,
            $id,
        ]);
        if ($stmt->rowCount() < 1 && !misc_income_entry_exists($pdo, $id)) {
            json_error('Zusatzeinkommen-Eintrag nicht gefunden.', 404);
        }
        $savedId = $id;
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO misc_income_entries
                (category, entry_type, entry_date, hours_hundredths, hourly_rate_cents, amount_minor, currency, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $entry['category'],
            $entry['entry_type'],
            $entry['entry_date'],
            $entry['hours_hundredths'],
            $entry['hourly_rate_cents'],
            $entry['amount_minor'],
            $entry['currency'],
            $now,
            $now,
        ]);
        $savedId = (int)$pdo->lastInsertId();
    }

    $response = build_misc_income_response($pdo);
    $response['savedEntryId'] = $savedId;
    return $response;
}

function delete_misc_income_entry(PDO $pdo): array {
    misc_income_require_schema($pdo);

    $body = read_json_body();
    $id = misc_income_optional_int($body, ['id'], 0);
    if ($id <= 0) {
        json_error('Ungueltige Eintrag-ID.', 400);
    }

    $stmt = $pdo->prepare("DELETE FROM misc_income_entries WHERE id = ?");
    $stmt->execute([$id]);
    if ($stmt->rowCount() < 1) {
        json_error('Zusatzeinkommen-Eintrag nicht gefunden.', 404);
    }

    return build_misc_income_response($pdo);
}

function misc_income_fetch_entries(PDO $pdo): array {
    $stmt = $pdo->prepare("
        SELECT id, category, entry_type, entry_date, hours_hundredths, hourly_rate_cents,
               amount_minor, currency, created_at, updated_at
        FROM misc_income_entries
        ORDER BY entry_date DESC, id DESC
    ");
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

function misc_income_entry_exists(PDO $pdo, int $id): bool {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM misc_income_entries WHERE id = ?");
    $stmt->execute([$id]);
    return (int)$stmt->fetchColumn() > 0;
}

function misc_income_validate_entry_payload(array $body): array {
    $category = (string)($body['category'] ?? '');
    if (!in_array($category, MISC_INCOME_CATEGORIES, true)) {
        json_error('Ungueltige Zusatzeinkommen-Kategorie.', 400);
    }

    $entryDate = misc_income_date_value($body, ['entry_date', 'entryDate', 'date']);

    if ($category === 'tech_support') {
        $hoursHundredths = misc_income_hours_hundredths_value($body, ['hours_hundredths', 'hoursHundredths', 'hours']);
        $hourlyRateCents = misc_income_money_cents_value($body, ['hourly_rate_cents', 'hourlyRateCents', 'hourly_rate_eur', 'hourlyRateEur', 'hourlyRate'], 0);
        if ($hoursHundredths < 0 || $hourlyRateCents < 0) {
            json_error('Stunden und Stundenlohn duerfen nicht negativ sein.', 400);
        }

        return [
            'category' => $category,
            'entry_type' => null,
            'entry_date' => $entryDate,
            'hours_hundredths' => $hoursHundredths,
            'hourly_rate_cents' => $hourlyRateCents,
            'amount_minor' => (int)round(($hoursHundredths * $hourlyRateCents) / 100),
            'currency' => 'EUR',
        ];
    }

    if (!in_array($category, MISC_INCOME_USD_AMOUNT_CATEGORIES, true)) {
        json_error('Ungueltige Zusatzeinkommen-Kategorie.', 400);
    }

    $entryType = (string)($body['entry_type'] ?? $body['entryType'] ?? $body['type'] ?? '');
    if (!in_array($entryType, MISC_INCOME_PORTAL_TYPES, true)) {
        json_error('Ungueltiger Portal-Typ.', 400);
    }

    $amountMinor = misc_income_money_cents_value($body, ['amount_minor', 'amountMinor', 'amount_usd', 'amountUsd', 'amount'], 0);
    if ($amountMinor < 0) {
        json_error('Betrag darf nicht negativ sein.', 400);
    }

    return [
        'category' => $category,
        'entry_type' => $entryType,
        'entry_date' => $entryDate,
        'hours_hundredths' => 0,
        'hourly_rate_cents' => 0,
        'amount_minor' => $amountMinor,
        'currency' => 'USD',
    ];
}

function misc_income_date_value(array $body, array $keys): string {
    foreach ($keys as $key) {
        if (!array_key_exists($key, $body)) {
            continue;
        }
        $value = (string)$body[$key];
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            json_error('Ungueltiges Datum.', 400);
        }
        [$year, $month, $day] = array_map('intval', explode('-', $value));
        if (!checkdate($month, $day, $year)) {
            json_error('Ungueltiges Datum.', 400);
        }
        return $value;
    }

    json_error('Datum fehlt.', 400);
}

function misc_income_hours_hundredths_value(array $body, array $keys): int {
    foreach ($keys as $key) {
        if (!array_key_exists($key, $body)) {
            continue;
        }

        $value = $body[$key];
        if ($key === 'hours' && (is_int($value) || is_float($value) || is_string($value))) {
            $normalized = str_replace(',', '.', trim((string)$value));
            if (!is_numeric($normalized)) {
                json_error('Ungueltige Stundenzahl.', 400);
            }
            return (int)round(((float)$normalized) * 100);
        }

        return misc_income_int_value($value, 'Ungueltige Stundenzahl.');
    }

    return 0;
}

function misc_income_money_cents_value(array $body, array $keys, int $default): int {
    foreach ($keys as $key) {
        if (!array_key_exists($key, $body)) {
            continue;
        }

        $value = $body[$key];
        if (
            misc_income_string_ends_with($key, '_cents')
            || misc_income_string_ends_with($key, 'Cents')
            || misc_income_string_ends_with($key, '_minor')
            || misc_income_string_ends_with($key, 'Minor')
        ) {
            return misc_income_int_value($value, 'Ungueltiger Geldbetrag.');
        }

        if (is_int($value) || is_float($value) || is_string($value)) {
            $normalized = str_replace(',', '.', trim((string)$value));
            if (!is_numeric($normalized)) {
                json_error('Ungueltiger Geldbetrag.', 400);
            }
            return (int)round(((float)$normalized) * 100);
        }

        json_error('Ungueltiger Geldbetrag.', 400);
    }

    return $default;
}

function misc_income_optional_int(array $body, array $keys, int $default): int {
    foreach ($keys as $key) {
        if (array_key_exists($key, $body)) {
            return misc_income_int_value($body[$key], 'Ungueltiger Zahlenwert.');
        }
    }

    return $default;
}

function misc_income_int_value($value, string $message): int {
    if (is_int($value)) {
        return $value;
    }
    if (is_float($value) && floor($value) === $value) {
        return (int)$value;
    }
    if (is_string($value) && preg_match('/^-?\d+$/', trim($value)) === 1) {
        return (int)$value;
    }

    json_error($message, 400);
}

function misc_income_entry_to_response(array $entry): array {
    $hoursHundredths = (int)$entry['hours_hundredths'];

    return [
        'id' => (int)$entry['id'],
        'category' => (string)$entry['category'],
        'entryType' => $entry['entry_type'],
        'entryDate' => (string)$entry['entry_date'],
        'hoursHundredths' => $hoursHundredths,
        'hours' => round($hoursHundredths / 100, 2),
        'hourlyRateCents' => (int)$entry['hourly_rate_cents'],
        'amountMinor' => (int)$entry['amount_minor'],
        'currency' => (string)$entry['currency'],
        'createdAt' => (string)$entry['created_at'],
        'updatedAt' => (string)$entry['updated_at'],
    ];
}

function misc_income_calculate_summary(array $entries): array {
    $today = date('Y-m-d');
    $monthPrefix = date('Y-m');
    $summary = [
        'totalByCategoryCurrency' => [
            'tech_support' => [],
            'user_testing' => [],
            'testable_minds' => [],
            'testbirds' => [],
            'respondent' => [],
        ],
        'totalByCurrency' => [],
        'todayByCurrency' => [],
        'monthByCurrency' => [],
        'countByCategory' => [
            'tech_support' => 0,
            'user_testing' => 0,
            'testable_minds' => 0,
            'testbirds' => 0,
            'respondent' => 0,
        ],
        'hoursHundredthsByCategory' => [
            'tech_support' => 0,
            'user_testing' => 0,
            'testable_minds' => 0,
            'testbirds' => 0,
            'respondent' => 0,
        ],
    ];

    foreach ($entries as $entry) {
        $category = (string)$entry['category'];
        $currency = strtoupper((string)$entry['currency']);
        $amount = (int)$entry['amount_minor'];
        $date = (string)$entry['entry_date'];

        if (!isset($summary['totalByCategoryCurrency'][$category])) {
            $summary['totalByCategoryCurrency'][$category] = [];
        }

        misc_income_add_amount($summary['totalByCategoryCurrency'][$category], $currency, $amount);
        misc_income_add_amount($summary['totalByCurrency'], $currency, $amount);

        if ($date === $today) {
            misc_income_add_amount($summary['todayByCurrency'], $currency, $amount);
        }
        if (misc_income_string_starts_with($date, $monthPrefix)) {
            misc_income_add_amount($summary['monthByCurrency'], $currency, $amount);
        }

        if (isset($summary['countByCategory'][$category])) {
            $summary['countByCategory'][$category]++;
        }
        if (isset($summary['hoursHundredthsByCategory'][$category])) {
            $summary['hoursHundredthsByCategory'][$category] += (int)$entry['hours_hundredths'];
        }
    }

    ksort($summary['totalByCurrency']);
    ksort($summary['todayByCurrency']);
    ksort($summary['monthByCurrency']);
    foreach ($summary['totalByCategoryCurrency'] as &$totals) {
        ksort($totals);
    }
    unset($totals);

    return $summary;
}

function misc_income_add_amount(array &$bucket, string $currency, int $amount): void {
    if ($currency === '') {
        return;
    }
    if (!isset($bucket[$currency])) {
        $bucket[$currency] = 0;
    }
    $bucket[$currency] += $amount;
}

function misc_income_load_fx_rates() {
    $raw = get_setting('fxRates');
    if (function_exists('decode_setting_value')) {
        return decode_setting_value($raw);
    }
    if (!is_string($raw)) {
        return $raw;
    }
    $decoded = json_decode($raw, true);
    return json_last_error() === JSON_ERROR_NONE ? $decoded : $raw;
}

function misc_income_string_starts_with(string $value, string $prefix): bool {
    return substr($value, 0, strlen($prefix)) === $prefix;
}

function misc_income_string_ends_with(string $value, string $suffix): bool {
    if ($suffix === '') {
        return true;
    }
    return substr($value, -strlen($suffix)) === $suffix;
}
