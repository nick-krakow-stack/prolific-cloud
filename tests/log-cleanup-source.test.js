const fs = require('fs');

const source = fs.readFileSync('api/sync.php', 'utf8');
const cleanupMatch = source.match(/function cleanup_old_logs_once_per_day\(PDO \$pdo\): void \{[\s\S]*?\n\}/);
const cleanupSource = cleanupMatch ? cleanupMatch[0] : '';

const cleanupCallIndex = source.indexOf('cleanup_old_logs_once_per_day($pdo);');
const transactionIndex = source.indexOf('$pdo->beginTransaction();');

const checks = [
  [
    'sync defines daily log cleanup helper',
    cleanupSource.includes('lastLogCleanupDate') && cleanupSource.includes("date('Y-m-d')")
  ],
  [
    'cleanup deletes events older than seven days',
    cleanupSource.includes('DELETE FROM events') && cleanupSource.includes("modify('-7 days')")
  ],
  [
    'cleanup deletes sync log rows older than seven days',
    cleanupSource.includes('DELETE FROM sync_log') && cleanupSource.includes("modify('-7 days')")
  ],
  [
    'cleanup records the last cleanup date',
    cleanupSource.includes("set_setting('lastLogCleanupDate', $today)")
  ],
  [
    'sync runs cleanup once before sync transaction',
    cleanupCallIndex !== -1 && transactionIndex !== -1 && cleanupCallIndex < transactionIndex
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
