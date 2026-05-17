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
    'overview loads saved dashboard settings',
    buildOverview.includes('load_dashboard_settings()')
  ],
  [
    'daily goal comes from dashboard settings',
    buildOverview.includes("$dashboardGoals['daily_gbp_minor']")
  ],
  [
    'monthly goal comes from dashboard settings',
    buildOverview.includes("$dashboardGoals['monthly_gbp_minor']")
  ],
  [
    'overview does not read config goals directly',
    !buildOverview.includes("$config['goals']")
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
