<?php

declare(strict_types=1);

require_once __DIR__ . '/../api/_rewards.php';

$cases = [
    [
        'name' => 'adjusted approved reward adds base and adjustment',
        'args' => [150, 36, 0, 0, 36],
        'expected' => 186,
    ],
    [
        'name' => 'normal reward is not double counted when base mirrors reward',
        'args' => [150, 0, 0, 0, 150],
        'expected' => 150,
    ],
    [
        'name' => 'bonus adds to base reward',
        'args' => [150, 0, 20, 0, 150],
        'expected' => 170,
    ],
    [
        'name' => 'screened out amount is used instead of full base reward',
        'args' => [500, 0, 0, 50, 50],
        'expected' => 50,
    ],
    [
        'name' => 'raw reward remains fallback when components are absent',
        'args' => [0, 0, 0, 0, 75],
        'expected' => 75,
    ],
];

$failed = 0;

foreach ($cases as $case) {
    $actual = effective_reward_amount_minor(...$case['args']);
    if ($actual !== $case['expected']) {
        fwrite(STDERR, sprintf(
            "FAIL %s: expected %d, got %d\n",
            $case['name'],
            $case['expected'],
            $actual
        ));
        $failed++;
        continue;
    }

    echo 'PASS ' . $case['name'] . PHP_EOL;
}

$sql = effective_reward_amount_sql('s');
foreach ([
    's.base_reward_minor',
    's.adjustment_amount_minor',
    's.bonus_amount_minor',
    's.screened_out_amount_minor',
    's.reward_amount_minor',
] as $expectedFragment) {
    if (strpos($sql, $expectedFragment) === false) {
        fwrite(STDERR, "FAIL SQL expression missing fragment: {$expectedFragment}\n");
        $failed++;
    }
}

if ($failed > 0) {
    exit(1);
}
