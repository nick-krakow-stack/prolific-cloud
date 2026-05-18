const fs = require('fs');

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
}

const commands = read('api/_telegram_commands.php');
const webhook = read('api/telegram-webhook.php');
const data = read('api/data.php');
const deploy = read('scripts/deploy-webspace.ps1');
const app = read('dashboard/assets/app.js');
const css = read('dashboard/assets/style.css');

const approvedCommands = [
  '/start', '/help', '/status', '/balance', '/studies', '/earnings', '/quote', '/today',
  '/pending', '/month', '/goals', '/top', '/stats', '/sync', '/export', '/active', '/last',
  '/compare', '/heatmap', '/week', '/setgoal', '/sethourly', '/report', '/mute', '/unmute',
  '/delete_logs'
];

const checks = [
  [
    'shared command library exists with parser registry dispatcher dashboard executor and delete logs handler',
    commands &&
      /function telegram_parse_command_text\(string \$text\): array/.test(commands) &&
      /function telegram_command_definitions\(\): array/.test(commands) &&
      /function telegram_dispatch_command\(array \$parsed,\s*\?PDO \$pdo = null/.test(commands) &&
      /function telegram_execute_dashboard_command\(PDO \$pdo,\s*array \$payload\): array/.test(commands) &&
      /function telegram_delete_logs_message\(PDO \$pdo/.test(commands)
  ],
  [
    'command registry includes approved commands and excludes requester and study',
    approvedCommands.every(command => commands.includes(`'command' => '${command}'`)) &&
      !commands.includes("'command' => '/requester'") &&
      !commands.includes("'command' => '/study'")
  ],
  [
    'command metadata describes direct fields and confirm inputs',
    commands.includes("'input' => 'none'") &&
      commands.includes("'input' => 'fields'") &&
      commands.includes("'input' => 'confirm'") &&
      commands.includes("'fields' => [") &&
      commands.includes("'name' => 'scope'") &&
      commands.includes("'name' => 'amount'") &&
      commands.includes("'name' => 'time'") &&
      commands.includes("'name' => 'duration'")
  ],
  [
    'setting commands update dashboard and telegram preference settings',
    commands.includes("set_setting('dashboardGoals'") &&
      commands.includes("set_setting('dashboardThresholds'") &&
      commands.includes("set_setting('telegramPreferences'")
  ],
  [
    'webhook loads shared command library and delegates dispatch',
    webhook.includes("require_once __DIR__ . '/_telegram_commands.php';") &&
      webhook.includes('telegram_parse_command_text($text)') &&
      webhook.includes('telegram_dispatch_command($parsed, $pdo') &&
      !/function telegram_balance_message\(\): string/.test(webhook) &&
      !/function telegram_quote_message\(\): string/.test(webhook)
  ],
  [
    'data endpoint loads shared command library and exposes write protected telegramCommand POST',
    data.includes("require_once __DIR__ . '/_telegram_commands.php';") &&
      data.includes("case 'telegramCommand':") &&
      /case 'telegramCommand':[\s\S]*\$_SERVER\['REQUEST_METHOD'\] !== 'POST'[\s\S]*require_dashboard_write_request\(\)[\s\S]*telegram_execute_dashboard_command\(\$pdo,\s*read_json_body\(\)\)/.test(data)
  ],
  [
    'system telegram metadata comes from shared command definitions',
    /function build_telegram_system_status\(PDO \$pdo\): array[\s\S]*'commands'\s*=>\s*telegram_command_definitions\(\)/.test(data)
  ],
  [
    'deploy script uploads shared command runtime file',
    deploy.includes('"api/_telegram_commands.php"')
  ],
  [
    'dashboard renders telegram commands as clickable controls',
    app.includes('data-telegram-command') &&
      app.includes('telegramCommandNeedsModal') &&
      app.includes('openTelegramCommandModal') &&
      app.includes("`${API_BASE}?type=telegramCommand`") &&
      app.includes('composeTelegramCommandText')
  ],
  [
    'dashboard command UI supports modal fields and confirmation styling',
    css.includes('.telegram-modal-backdrop') &&
      css.includes('.telegram-modal-field') &&
      css.includes('.telegram-command-status') &&
      css.includes('.telegram-command-item:hover')
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
