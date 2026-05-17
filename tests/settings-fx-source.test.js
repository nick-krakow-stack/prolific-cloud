const fs = require('fs');

const source = fs.readFileSync('api/data.php', 'utf8');
const match = source.match(/function build_settings_response\(PDO \$pdo\): array \{[\s\S]*?\n\}/);
const buildSettings = match ? match[0] : '';

const checks = [
  [
    'settings response includes fx rates for EUR controls',
    buildSettings.includes("'fxRates' => decode_setting_value(get_setting('fxRates'))")
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
