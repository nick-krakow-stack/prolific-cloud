const fs = require('fs');

const source = fs.readFileSync('api/data.php', 'utf8');
const buildOverviewMatch = source.match(/function build_overview\(PDO \$pdo\): array \{[\s\S]*?\n\}/);
const buildOverview = buildOverviewMatch ? buildOverviewMatch[0] : '';

const checks = [
  [
    'overview builds month stats from the current month start',
    buildOverview.includes('$monthStats = build_period_stats($pdo, $paidStatuses, $monthStart, $earnedMonth, $pendingMonth);')
  ],
  [
    'overview response exposes monthStats',
    buildOverview.includes("'monthStats'       => $monthStats")
  ],
  [
    'period stats helper exists',
    /function build_period_stats\(\s*PDO \$pdo,\s*array \$paidStatuses,\s*DateTime \$periodStart,\s*array \$earned,\s*array \$pending\s*\): array/.test(source)
  ],
  [
    'today stats uses shared period stats helper',
    source.includes('return build_period_stats($pdo, $paidStatuses, $today, $earnedToday, $pendingToday);')
  ],
  [
    'period stats counts submissions by started or completed date',
    /WHERE started_at >= \?\s+OR completed_at >= \?/.test(source)
  ],
  [
    'effective hourly exposes reward totals for combined rate',
    source.includes("'rewardByCurrency' => $rewardByCurrency")
  ],
  [
    'monthly report hourly stats use paid statuses including pending',
    /function build_monthly_report\(\s*PDO \$pdo,\s*array \$earnedStatuses,\s*array \$pendingStatuses,\s*array \$paidStatuses,/.test(source) &&
      source.includes("'hourlyRate' => build_efficiency_period($pdo, $paidStatuses, $monthStart, $nextMonthStart)") &&
      source.includes("'topStudies' => build_top_studies_for_period($pdo, $paidStatuses, $monthStart, $nextMonthStart)") &&
      source.includes("'requesterStats' => build_requester_stats($pdo, $paidStatuses, $monthStart, $nextMonthStart, 5)")
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
