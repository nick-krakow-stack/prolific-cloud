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

$split = extra_income_split_session_by_week([
    'id' => 1,
    'started_at' => '2026-05-17 23:09:00',
    'ended_at' => '2026-05-18 00:49:00',
    'message_count' => 10,
    'night_bonus_enabled' => 1,
    'bonus_mode' => 'none',
    'bonus_threshold_messages' => 0,
    'bonus_amount_cents' => 0,
]);

assert_same(2, count($split), 'Split should create two week parts.');
assert_same(6, $split[0]['message_count'], 'Rounding remainder must go to the longer week share.');
assert_same(4, $split[1]['message_count'], 'Shorter week share should keep the lower rounded count.');

$nightMessages = extra_income_calculate_night_messages([
    'started_at' => '2026-05-18 23:00:00',
    'ended_at' => '2026-05-19 01:00:00',
    'message_count' => 100,
    'night_bonus_enabled' => 1,
]);
assert_same(50, $nightMessages, 'Night bonus messages should be proportional to night-time share.');

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

assert_same(0, extra_income_calculate_payout_fee_cents(4999), 'No payout fee below payout threshold.');
assert_same(500, extra_income_calculate_payout_fee_cents(7000), 'Payout fee for 70 EUR.');
assert_same(1500, extra_income_calculate_payout_fee_cents(100100), 'Payout fee above 1001 EUR.');

echo "extra income calculation contract ok\n";
