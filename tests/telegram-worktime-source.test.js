const fs = require('fs');

const commands = fs.readFileSync('api/_telegram_commands.php', 'utf8');

const checks = [
  [
    'telegram command library loads shared worktime helper',
    commands.includes("require_once __DIR__ . '/_worktime.php';")
  ],
  [
    'command registry advertises worktime and effective commands',
    commands.includes("'command' => '/worktime'") &&
      commands.includes("'command' => '/effective'") &&
      commands.includes('Arbeitszeit') &&
      commands.includes('Effektiver Stundenlohn')
  ],
  [
    'dispatcher routes worktime and effective commands',
    commands.includes("case '/worktime':") &&
      commands.includes('return telegram_worktime_message($pdo);') &&
      commands.includes("case '/effective':") &&
      commands.includes('return telegram_effective_message($pdo);')
  ],
  [
    'worktime message uses shared period buckets and paid plus unpaid display',
    /function telegram_worktime_message\(PDO \$pdo\): string/.test(commands) &&
      commands.includes('sum_worktime_by_period($pdo') &&
      commands.includes('telegram_worktime_periods($pdo)') &&
      commands.includes('telegram_worktime_line(') &&
      commands.includes("['paid_seconds']") &&
      commands.includes("['unpaid_seconds']") &&
      commands.includes('Davon ') &&
      commands.includes('unbezahlt') &&
      !/function telegram_worktime_line[\s\S]*\\\\\+[\s\S]*return \$line;/.test(commands)
  ],
  [
    'effective message compares earned statuses against paid worktime seconds',
    /function telegram_effective_message\(PDO \$pdo\): string/.test(commands) &&
      commands.includes('$earnedStatuses = telegram_earned_statuses();') &&
      commands.includes('telegram_sum_by_started_period($pdo, $earnedStatuses') &&
      commands.includes('telegram_effective_period_line(') &&
      commands.includes("['paid_seconds']") &&
      commands.includes('paidSeconds <= 0') &&
      commands.includes('Noch keine bezahlte Arbeitszeit')
  ],
  [
    'effective earned sums use the same started-at period anchor as worktime',
    /function telegram_sum_by_started_period\(PDO \$pdo,\s*array \$statuses,\s*\?DateTime \$from,\s*\?DateTime \$to\): array/.test(commands) &&
      /COALESCE\(started_at,\s*completed_at\)\s*>=\s*\?/.test(commands) &&
      /COALESCE\(started_at,\s*completed_at\)\s*<\s*\?/.test(commands)
  ],
  [
    'effective helper renders month and all time values from paid seconds',
    /function telegram_effective_period_line\(string \$label,\s*array \$earned,\s*array \$worktime\): string/.test(commands) &&
      commands.includes('telegram_currency_map_to_gbp_minor($earned') &&
      commands.includes('$hourlyMinor = (int)round(($earnedGbpMinor * 3600) / $paidSeconds);') &&
      commands.includes('telegram_fmt_worktime_de($paidSeconds)')
  ],
  [
    'telegram worktime formatter exists with minute and hour output',
    /function telegram_fmt_worktime_de\(int \$seconds\): string/.test(commands) &&
      commands.includes("return '0 min';") &&
      commands.includes('intdiv($seconds, 3600)') &&
      commands.includes('intdiv($seconds % 3600, 60)')
  ],
  [
    'top hourly list uses owner effective time rule without positive raw time filter',
    /function telegram_top_rows\(PDO \$pdo,\s*string \$sort\): array[\s\S]*effective_time_seconds\(\$row\)/.test(commands) &&
      !commands.includes("AND s.time_taken_seconds > 0") &&
      !commands.includes('$timeFilter') &&
      commands.includes('s.status,') &&
      commands.includes("'effective_time_seconds'") &&
      commands.includes('raw <=0 oder SCREENED OUT raw<60 => 60')
  ],
  [
    'top row output uses effective seconds for hourly fallback',
    /function telegram_top_row_line\(int \$index,\s*array \$row\): string[\s\S]*effective_time_seconds\(\$row\)/.test(commands) &&
      commands.includes("($row['effective_time_seconds'] ?? null)")
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
