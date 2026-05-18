const fs = require('fs');

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
}

const configExample = read('config.example.php');
const hashGenerator = read('hash-generator.php');
const install = read('install.php');
const telegramHelper = read('api/_telegram.php');
const telegramCommands = read('api/_telegram_commands.php');
const webhook = read('api/telegram-webhook.php');
const deploy = read('scripts/deploy-webspace.ps1');

const checks = [
  [
    'config example documents telegram settings',
    /'telegram'\s*=>\s*\[/.test(configExample) &&
      configExample.includes("'bot_token'") &&
      configExample.includes("'allowed_chat_id'") &&
      configExample.includes("'webhook_secret'")
  ],
  [
    'hash generator renders webhook secret value D',
    hashGenerator.includes('$webhookSecret') &&
      hashGenerator.includes('(D) Webhook-Secret') &&
      hashGenerator.includes("'webhook_secret' => '...'")
  ],
  [
    'install creates telegram_messages table with replay-safe update id',
    /CREATE TABLE IF NOT EXISTS `telegram_messages`/.test(install) &&
      /`update_id`\s+BIGINT UNSIGNED NOT NULL UNIQUE/.test(install) &&
      install.includes("'telegram_messages'")
  ],
  [
    'telegram helper exposes core security and formatting helpers',
    /function telegram_config\(\): array/.test(telegramHelper) &&
      /function telegram_require_webhook_secret\(\): bool/.test(telegramHelper) &&
      /function telegram_verify_secret_token_header\(\): bool/.test(telegramHelper) &&
      /function telegram_is_allowed_chat\(\$chatId\): bool/.test(telegramHelper) &&
      /function telegram_has_seen_update\(PDO \$pdo,\s*int \$updateId\): bool/.test(telegramHelper) &&
      /function telegram_claim_update\(\s*PDO \$pdo,\s*int \$updateId/.test(telegramHelper) &&
      /function telegram_log_message\(\s*PDO \$pdo/.test(telegramHelper) &&
      /function tg_escape\(string \$text\): string/.test(telegramHelper) &&
      /function send_telegram_message\(int \$chatId,\s*string \$text,\s*array \$options = \[\]\): bool/.test(telegramHelper)
  ],
  [
    'telegram helper claims update before sending to avoid duplicate replies',
    /INSERT IGNORE INTO telegram_messages/.test(telegramHelper) &&
      /return \$stmt->rowCount\(\) === 1;/.test(telegramHelper) &&
      /UPDATE telegram_messages\s+SET response_sent/.test(telegramHelper)
  ],
  [
    'telegram webhook validates request and delegates phase one commands',
    webhook.includes("require_once __DIR__ . '/_telegram.php';") &&
      webhook.includes("require_once __DIR__ . '/_telegram_commands.php';") &&
      webhook.includes('telegram_require_webhook_secret()') &&
      webhook.includes('telegram_verify_secret_token_header()') &&
      webhook.includes('telegram_claim_update($pdo, $updateId') &&
      webhook.includes('telegram_is_allowed_chat($chatId)') &&
      webhook.includes('telegram_dispatch_command($parsed, $pdo') &&
      telegramCommands.includes("case '/start':") &&
      telegramCommands.includes("case '/help':") &&
      telegramCommands.includes("case '/status':")
  ],
  [
    'telegram help advertises status command',
    telegramCommands.includes("'command' => '/status'") &&
      telegramCommands.includes('Aktueller Systemstatus')
  ],
  [
    'deploy script uploads telegram runtime files',
    deploy.includes('"api/_telegram.php"') &&
      deploy.includes('"api/_telegram_commands.php"') &&
      deploy.includes('"api/telegram-webhook.php"')
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
