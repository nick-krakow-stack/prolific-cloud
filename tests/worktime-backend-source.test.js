const fs = require('fs');

const dataSource = fs.readFileSync('api/data.php', 'utf8');
const exportSource = fs.readFileSync('api/export.php', 'utf8');
const deploySource = fs.readFileSync('scripts/deploy-webspace.ps1', 'utf8');
const worktimeSource = fs.existsSync('api/_worktime.php')
  ? fs.readFileSync('api/_worktime.php', 'utf8')
  : '';

const overviewMatch = dataSource.match(/function build_overview\(PDO \$pdo\): array \{[\s\S]*?\n\}/);
const overviewSource = overviewMatch ? overviewMatch[0] : '';

const checks = [
  [
    'data endpoint requires shared worktime helper',
    dataSource.includes("require_once __DIR__ . '/_worktime.php';")
  ],
  [
    'export endpoint requires shared worktime helper',
    exportSource.includes("require_once __DIR__ . '/_worktime.php';")
  ],
  [
    'shared effective_time_seconds helper exists',
    /function effective_time_seconds\(array \$sub\): int/.test(worktimeSource)
  ],
  [
    'effective_time_seconds falls back missing or non-positive values to 60 seconds',
    /\$raw\s*<=\s*0[\s\S]*return 60/.test(worktimeSource) ||
      /return\s+\$raw\s*>\s*0\s*\?\s*\$raw\s*:\s*60/.test(worktimeSource)
  ],
  [
    'effective_time_seconds enforces at least 60 seconds for screened out rows',
    /SCREENED OUT/.test(worktimeSource) && /max\(\$raw,\s*60\)/.test(worktimeSource)
  ],
  [
    'unpaid worktime with missing completion uses fallback instead of stale running seconds',
    /function effective_unpaid_time_seconds\(array \$sub\): int/.test(worktimeSource) &&
      /completed_at/.test(worktimeSource) &&
      /normalize_worktime_status/.test(worktimeSource) &&
      /return 60/.test(worktimeSource)
  ],
  [
    'shared worktime_seconds_sql helper exists',
    /function worktime_seconds_sql\(string \$alias = ''\): string/.test(worktimeSource)
  ],
  [
    'worktime SQL helper uses CASE and COALESCE fallback',
    /CASE[\s\S]*COALESCE[\s\S]*60[\s\S]*END/.test(worktimeSource)
  ],
  [
    'sum_worktime_by_period helper exists',
    /function sum_worktime_by_period\(PDO \$pdo,\s*\?DateTime \$from,\s*\?DateTime \$to\): array/.test(worktimeSource)
  ],
  [
    'sum_worktime_by_period reads completion state for unpaid fallback',
    /SELECT status,\s*time_taken_seconds,\s*completed_at/.test(worktimeSource) &&
      /effective_unpaid_time_seconds\(\$row\)/.test(worktimeSource)
  ],
  [
    'worktime total is added once after bucket-specific fallback is selected',
    !/\$result\['total_seconds'\]\s*\+=\s*\$seconds;[\s\S]{0,240}\$result\['total_seconds'\]\s*\+=\s*\$seconds;/.test(worktimeSource) &&
      /else\s*\{\s*\$seconds\s*=\s*effective_time_seconds\(\$row\);/.test(worktimeSource)
  ],
  [
    'status normalization accepts hyphen and underscore variants',
    /str_replace\(\['-', '_'\],\s*' ',/.test(worktimeSource)
  ],
  [
    'worktime period filter uses completed_at fallback to started_at',
    /COALESCE\(completed_at,\s*started_at\)\s*>=\s*\?/.test(worktimeSource) &&
      /COALESCE\(completed_at,\s*started_at\)\s*<\s*\?/.test(worktimeSource)
  ],
  [
    'worktime buckets include paid statuses',
    /\$paidSet\s*=\s*\[[^\]]*'APPROVED'[^\]]*'AWAITING REVIEW'[^\]]*'SCREENED OUT'/.test(worktimeSource)
  ],
  [
    'worktime buckets include unpaid statuses',
    /\$unpaidSet\s*=\s*\[[^\]]*'RETURNED'[^\]]*'REJECTED'[^\]]*'TIMED OUT'/.test(worktimeSource)
  ],
  [
    'overview builds worktime periods',
    overviewSource.includes('$worktime = [') &&
      overviewSource.includes("'today'     => sum_worktime_by_period($pdo, $today, null)") &&
      overviewSource.includes("'week'      => sum_worktime_by_period($pdo, $weekStart, null)") &&
      overviewSource.includes("'month'     => sum_worktime_by_period($pdo, $monthStart, null)") &&
      overviewSource.includes("'lastMonth' => sum_worktime_by_period($pdo, $lastMonthStart, $lastMonthEnd)") &&
      overviewSource.includes("'allTime'   => sum_worktime_by_period($pdo, null, null)")
  ],
  [
    'overview response exposes worktime',
    overviewSource.includes("'worktime'        => $worktime")
  ],
  [
    'deploy uploads shared worktime helper',
    deploySource.includes('"api/_worktime.php"')
  ],
  [
    'hourly SQL uses worktime fallback instead of filtering raw positive seconds',
    !/time_taken_seconds\s*>\s*0/.test(dataSource) &&
      !/\/\s*s\.time_taken_seconds/.test(dataSource) &&
      !/SUM\(time_taken_seconds\)\s+seconds_total/.test(dataSource) &&
      (dataSource.match(/worktime_seconds_sql\(/g) || []).length >= 4
  ],
  [
    'CSV reward per hour uses effective fallback seconds while display keeps raw duration',
    /effective_time_seconds\(\$row\)/.test(exportSource) &&
      /format_duration\(\$seconds\)/.test(exportSource) &&
      !/\$seconds\s*>\s*0\)[\s\S]*\(\$rewardMinor \* 3600\) \/ \$seconds/.test(exportSource)
  ]
];

let failed = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);

  if (!passed) {
    failed++;
  }
}

if (failed > 0) {
  process.exit(1);
}
