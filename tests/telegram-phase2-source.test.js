const fs = require('fs');

const webhook = fs.readFileSync('api/telegram-webhook.php', 'utf8');
const helper = fs.readFileSync('api/_telegram.php', 'utf8');
const data = fs.readFileSync('api/data.php', 'utf8');
const app = fs.readFileSync('dashboard/assets/app.js', 'utf8');
const css = fs.readFileSync('dashboard/assets/style.css', 'utf8');
const webhookInfoFunction = helper.match(/function telegram_get_webhook_info\(\): array[\s\S]*?\n\}/)?.[0] || '';

const checks = [
  [
    'webhook dispatches phase two telegram commands',
    ["case '/balance':", "case '/studies':", "case '/earnings':", "case '/today':"]
      .every(fragment => webhook.includes(fragment))
  ],
  [
    'webhook help lists implemented phase two commands',
    ['/balance \\\\', '/studies \\\\', '/earnings \\\\', '/today \\\\']
      .every(fragment => webhook.includes(fragment))
  ],
  [
    'webhook implements balance from stored Prolific balance',
    /function telegram_balance_message\(\): string/.test(webhook) &&
      webhook.includes("get_setting('balance')") &&
      /telegram_extract_balance\(/.test(webhook)
  ],
  [
    'webhook implements active studies list with direct links',
    /function telegram_studies_message\(\): string/.test(webhook) &&
      /SELECT COUNT\(\*\) FROM studies WHERE is_active = 1/.test(webhook) &&
      /FROM studies\s+WHERE is_active = 1/.test(webhook) &&
      webhook.includes('https://app.prolific.com/studies/')
  ],
  [
    'webhook implements earnings and today summaries with effective rewards',
    /function telegram_earnings_message\(\): string/.test(webhook) &&
      /function telegram_today_message\(\): string/.test(webhook) &&
      /function telegram_sum_by_period\(PDO \$pdo/.test(webhook) &&
      webhook.includes('$countedStatuses = array_merge($earnedStatuses, $pendingStatuses);') &&
      webhook.includes('effective_reward_amount_sql()')
  ],
  [
    'telegram helper can read webhook info without exposing token or url',
    /function telegram_get_webhook_info\(\): array/.test(helper) &&
      helper.includes('/getWebhookInfo') &&
      !/['"]url['"]\s*=>/.test(webhookInfoFunction) &&
      !/return\s+\$token/.test(webhookInfoFunction)
  ],
  [
    'system endpoint includes telegram bot status',
    data.includes("require_once __DIR__ . '/_telegram.php';") &&
      /'telegram'\s*=>\s*build_telegram_system_status\(\$pdo\)/.test(data) &&
      /function build_telegram_system_status\(PDO \$pdo\): array/.test(data) &&
      data.includes('telegram_get_webhook_info()') &&
      /function build_settings_response\(PDO \$pdo\): array[\s\S]*build_system_stats\(\$pdo, \$lastSyncAt, \$lastSyncRow \?: null\)/.test(data)
  ],
  [
    'system renderer places telegram bot card below system status card',
    /function renderTelegramBotCard\(telegram\)/.test(app) &&
      /<h3>Telegram-Bot<\/h3>/.test(app) &&
      /<h3>Systemstatus<\/h3>[\s\S]*renderTelegramBotCard\(data\.telegram/.test(app)
  ],
  [
    'telegram bot card lists commands and status metrics',
    app.includes('Bot aktiv') &&
      app.includes('Befehle') &&
      app.includes('Letzter Befehl') &&
      css.includes('.telegram-command-list')
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
