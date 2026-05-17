const fs = require('fs');

const htaccess = fs.readFileSync('.htaccess', 'utf8');
const exportSource = fs.readFileSync('api/export.php', 'utf8');
const sessionSource = fs.readFileSync('dashboard/session.php', 'utf8');
const loginSource = fs.readFileSync('dashboard/index.php', 'utf8');

const checks = [
  [
    'csv export sets fputcsv escape parameter explicitly for PHP 8.4',
    /fputcsv\(\$out,\s*\[[\s\S]*?\],\s*';',\s*'"',\s*''\)/.test(exportSource) &&
      /fputcsv\(\$handle,\s*array_map\('neutralize_csv_cell',\s*\$row\),\s*';',\s*'"',\s*''\)/.test(exportSource)
  ],
  [
    'webserver blocks setup helper files if accidentally uploaded',
    /install\\.php\|hash-generator\\.php/.test(htaccess)
  ],
  [
    'webserver sends a restrictive content security policy',
    /Header set Content-Security-Policy/.test(htaccess) &&
      /default-src 'self'/.test(htaccess) &&
      /script-src 'self'/.test(htaccess) &&
      /form-action 'self'/.test(htaccess)
  ],
  [
    'logout clears session cookie with modern samesite parameter',
    /setcookie\(\s*session_name\(\),\s*'',\s*\[[\s\S]*'expires'\s*=>\s*time\(\) - 42000[\s\S]*'samesite'\s*=>\s*\$params\['samesite'\] \?\? 'Lax'/.test(sessionSource)
  ],
  [
    'login blocks repeated failed attempts before checking credentials',
    /function client_ip_for_login\(\): string/.test(loginSource) &&
    /function assert_login_rate_limit\(string \$username\): bool/.test(loginSource) &&
      /function record_failed_login_attempt\(string \$username\): void/.test(loginSource) &&
      /assert_login_rate_limit\(\$username\)[\s\S]*do_login\(\$username,\s*\$password\)/.test(loginSource)
  ],
  [
    'login rate limit counts recent failures by ip and username',
    /login_failed/.test(loginSource) &&
      /JSON_EXTRACT\(data_json,\s*'\$\.ip'\)/.test(loginSource) &&
      /JSON_EXTRACT\(data_json,\s*'\$\.username'\)/.test(loginSource)
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
