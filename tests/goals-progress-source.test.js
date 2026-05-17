const fs = require('fs');

const source = fs.readFileSync('api/data.php', 'utf8');
const match = source.match(/function build_overview\(PDO \$pdo\): array \{[\s\S]*?\n\}/);

if (!match) {
  console.error('FAIL could not locate build_overview');
  process.exit(1);
}

const buildOverview = match[0];

const checks = [
  [
    'overview builds a combined daily goal amount from earned and pending',
    buildOverview.includes('$goalToday = sum_currency_maps($earnedToday, $pendingToday);')
  ],
  [
    'overview builds a combined monthly goal amount from earned and pending',
    buildOverview.includes('$goalMonth = sum_currency_maps($earnedMonth, $pendingMonth);')
  ],
  [
    'daily goal progress uses the combined daily amount',
    buildOverview.includes("'today' => build_goal_progress($goalTodayGbp, $dailyGoalGbpMinor)")
  ],
  [
    'monthly goal progress uses the combined monthly amount',
    buildOverview.includes("'month' => build_goal_progress($goalMonthGbp, $monthlyGoalGbpMinor)")
  ],
  [
    'monthly forecast uses the same combined goal basis',
    buildOverview.includes('$forecast = build_month_forecast($now, $goalMonthGbp, $monthlyGoalGbpMinor);')
  ]
];

let failed = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);

  if (!passed) failed++;
}

if (failed > 0) {
  process.exit(1);
}
