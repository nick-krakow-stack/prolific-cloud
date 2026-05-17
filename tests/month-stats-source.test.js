const fs = require('fs');

const source = fs.readFileSync('api/data.php', 'utf8');
const buildOverviewMatch = source.match(/function build_overview\(PDO \$pdo\): array \{[\s\S]*?\n\}/);
const buildOverview = buildOverviewMatch ? buildOverviewMatch[0] : '';

const checks = [
  [
    'overview builds month stats from the current month start',
    buildOverview.includes('$monthStats = build_period_stats($pdo, $earnedStatuses, $monthStart, $earnedMonth, $pendingMonth);')
  ],
  [
    'overview response exposes monthStats',
    buildOverview.includes("'monthStats'       => $monthStats")
  ],
  [
    'period stats helper exists',
    /function build_period_stats\(\s*PDO \$pdo,\s*array \$earnedStatuses,\s*DateTime \$periodStart,\s*array \$earned,\s*array \$pending\s*\): array/.test(source)
  ],
  [
    'today stats uses shared period stats helper',
    source.includes('return build_period_stats($pdo, $earnedStatuses, $today, $earnedToday, $pendingToday);')
  ],
  [
    'period stats counts submissions by started or completed date',
    /WHERE started_at >= \?\s+OR completed_at >= \?/.test(source)
  ],
  [
    'effective hourly exposes reward totals for combined rate',
    source.includes("'rewardByCurrency' => $rewardByCurrency")
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
