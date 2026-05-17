const fs = require('fs');

const source = fs.readFileSync('api/data.php', 'utf8');

const checks = [
  [
    'settings GET passes PDO into settings response builder',
    source.includes('json_response(build_settings_response($pdo));')
  ],
  [
    'settings response builder accepts PDO',
    /function build_settings_response\(PDO \$pdo\): array/.test(source)
  ],
  [
    'settings response includes system health data',
    /function build_settings_response\(PDO \$pdo\): array \{[\s\S]*'system'\s*=>\s*build_system_response\(\$pdo\)\['system'\]/.test(source)
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
