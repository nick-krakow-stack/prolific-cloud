<?php
declare(strict_types=1);

function json_error(string $message, int $status = 400, array $extra = []): void {
    throw new RuntimeException($message, $status);
}

require __DIR__ . '/../api/_extra_income.php';

function assert_same($expected, $actual, string $message): void {
    if ($expected !== $actual) {
        fwrite(STDERR, $message . "\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

function assert_throws(callable $callback, string $message): void {
    try {
        $callback();
    } catch (RuntimeException $e) {
        return;
    }

    fwrite(STDERR, $message . "\nExpected RuntimeException.\n");
    exit(1);
}

$split = extra_income_split_session_by_week([
    'id' => 1,
    'started_at' => '2026-05-17 23:09:00',
    'ended_at' => '2026-05-18 00:49:00',
    'message_count' => 10,
    'free_message_count' => 5,
    'night_bonus_message_count' => 5,
    'night_bonus_enabled' => 1,
    'bonus_mode' => 'none',
    'bonus_threshold_messages' => 0,
    'bonus_amount_cents' => 0,
]);

assert_same(2, count($split), 'Split should create two week parts.');
assert_same(6, $split[0]['message_count'], 'Rounding remainder must go to the longer week share.');
assert_same(4, $split[1]['message_count'], 'Shorter week share should keep the lower rounded count.');
assert_same(3, $split[0]['free_message_count'], 'Free message rounding remainder must go to the longer week share.');
assert_same(2, $split[1]['free_message_count'], 'Free messages should preserve the original split sum.');
assert_same(3, $split[0]['night_bonus_message_count'], 'Night bonus message rounding remainder must go to the longer week share.');
assert_same(2, $split[1]['night_bonus_message_count'], 'Night bonus messages should preserve the original split sum.');

$nightMessages = extra_income_calculate_night_messages([
    'started_at' => '2026-05-18 23:00:00',
    'ended_at' => '2026-05-19 01:00:00',
    'message_count' => 100,
    'night_bonus_message_count' => 40,
    'night_bonus_enabled' => 0,
]);
assert_same(40, $nightMessages, 'Night bonus messages should use the explicit count and ignore the legacy checkbox.');

assert_same(100, extra_income_calculate_night_messages([
    'started_at' => '2026-05-18 23:00:00',
    'ended_at' => '2026-05-19 01:00:00',
    'message_count' => 100,
    'night_bonus_message_count' => 140,
]), 'Night bonus messages must be capped to normal paid messages.');

assert_same(0, extra_income_calculate_night_messages([
    'started_at' => '2026-05-18 23:00:00',
    'ended_at' => '2026-05-19 01:00:00',
    'message_count' => 100,
]), 'Missing explicit night bonus count should not trigger automatic night-time calculation.');

$validatedNightCount = extra_income_validate_session_payload([
    'started_at' => '2026-05-18 10:00:00',
    'ended_at' => '2026-05-18 11:00:00',
    'message_count' => 12,
    'nightBonusMessageCount' => '7',
], false);
assert_same(7, $validatedNightCount['night_bonus_message_count'], 'CamelCase night bonus count payload should be accepted.');

assert_throws(static function (): void {
    extra_income_validate_session_payload([
        'started_at' => '2026-05-18 10:00:00',
        'ended_at' => '2026-05-18 11:00:00',
        'message_count' => 12,
        'night_bonus_message_count' => 13,
    ], false);
}, 'Night bonus message count above paid messages should be rejected.');

assert_same(12, extra_income_calculate_week_rate_cents(1000), '1000 messages rate.');
assert_same(13, extra_income_calculate_week_rate_cents(1001), '1001 messages rate.');
assert_same(17, extra_income_calculate_week_rate_cents(2001), '2001 messages rate.');

assert_same(500, extra_income_calculate_session_bonus_cents([
    'message_count' => 231,
    'bonus_mode' => 'fixed',
    'bonus_threshold_messages' => 200,
    'bonus_amount_cents' => 500,
]), 'Fixed bonus should pay once after threshold.');

assert_same(462, extra_income_calculate_session_bonus_cents([
    'message_count' => 231,
    'bonus_mode' => 'per_message',
    'bonus_threshold_messages' => 55,
    'bonus_amount_cents' => 2,
]), 'Per-message bonus should apply retroactively to all session messages after threshold.');

$freeMessageSummary = extra_income_calculate_summary([
    [
        'id' => 2,
        'started_at' => '2026-05-18 10:00:00',
        'ended_at' => '2026-05-18 11:00:00',
        'message_count' => 1000,
        'free_message_count' => 1,
        'night_bonus_message_count' => 25,
        'night_bonus_enabled' => 1,
        'bonus_mode' => 'none',
        'bonus_threshold_messages' => 0,
        'bonus_amount_cents' => 0,
    ],
], []);
$freeMessageWeek = $freeMessageSummary['weeks'][0];
assert_same(1000, $freeMessageWeek['messageCount'], 'Free messages must not count as normal tier messages.');
assert_same(1, $freeMessageWeek['freeMessageCount'], 'Weekly sums should expose free message counts separately.');
assert_same(25, $freeMessageWeek['nightMessages'], 'Weekly sums should expose explicit night bonus message counts.');
assert_same(12, $freeMessageWeek['rateCents'], '1000 normal messages plus free messages must keep the 12 cent tier.');
assert_same(12035, $freeMessageWeek['grossCents'], 'Free messages and explicit night bonus messages should add to gross income.');
assert_same(12035, $freeMessageWeek['hourlyGrossCents'], 'Free message and night bonus income should count toward hourly gross rate.');

$freeMessageNightSummary = extra_income_calculate_summary([
    [
        'id' => 3,
        'started_at' => '2026-05-19 01:00:00',
        'ended_at' => '2026-05-19 02:00:00',
        'message_count' => 0,
        'free_message_count' => 10,
        'night_bonus_enabled' => 1,
        'bonus_mode' => 'none',
        'bonus_threshold_messages' => 0,
        'bonus_amount_cents' => 0,
    ],
], []);
$freeMessageNightWeek = $freeMessageNightSummary['weeks'][0];
assert_same(0, $freeMessageNightWeek['nightBonusCents'], 'Free messages must not receive night bonus.');
assert_same(100, $freeMessageNightWeek['grossCents'], 'Free night messages should only add their fixed 10 cent value.');

$freeMessageBonusSummary = extra_income_calculate_summary([
    [
        'id' => 4,
        'started_at' => '2026-05-19 10:00:00',
        'ended_at' => '2026-05-19 11:00:00',
        'message_count' => 199,
        'free_message_count' => 1,
        'night_bonus_enabled' => 0,
        'bonus_mode' => 'fixed',
        'bonus_threshold_messages' => 200,
        'bonus_amount_cents' => 500,
    ],
], []);
$freeMessageBonusWeek = $freeMessageBonusSummary['weeks'][0];
assert_same(0, $freeMessageBonusWeek['bonusCents'], 'Free messages must not count toward special bonus thresholds.');
assert_same(2398, $freeMessageBonusWeek['grossCents'], 'Free messages should add income without unlocking the special bonus.');

assert_same(0, extra_income_calculate_payout_fee_cents(4999), 'No payout fee below payout threshold.');
assert_same(500, extra_income_calculate_payout_fee_cents(7000), 'Payout fee for 70 EUR.');
assert_same(1500, extra_income_calculate_payout_fee_cents(100100), 'Payout fee above 1001 EUR.');

echo "extra income calculation contract ok\n";
