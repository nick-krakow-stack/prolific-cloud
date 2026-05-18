const fs = require('fs');

const webhook = fs.readFileSync('api/telegram-webhook.php', 'utf8');
const data = fs.readFileSync('api/data.php', 'utf8');
const quoteMessage = webhook.match(/function telegram_quote_message\(\): string[\s\S]*?\n}\n\nfunction telegram_build_quote_stats/)?.[0] || '';

const checks = [
  [
    'webhook dispatches and advertises quote command',
      webhook.includes("case '/quote':") &&
      webhook.includes('return telegram_quote_message();') &&
      webhook.includes('/quote \\\\- Erfolgs\\\\- und Verdienst\\\\-Quote')
  ],
  [
    'quote message implements thirty day accepted missed and returned counts',
    /function telegram_quote_message\(\): string/.test(webhook) &&
      /function telegram_build_quote_stats\(PDO \$pdo/.test(webhook) &&
      webhook.includes("first_seen >= ?") &&
      webhook.includes("reward_minor > 0") &&
      webhook.includes("'accepted'") &&
      webhook.includes("'missed'") &&
      webhook.includes("'returned'")
  ],
  [
    'quote status priority follows specification',
    /function telegram_quote_submission_priority\(string \$status\): int/.test(webhook) &&
      webhook.includes("'APPROVED' => 40") &&
      webhook.includes("'AWAITING REVIEW' => 30") &&
      webhook.includes("'SCREENED OUT', 'SCREENED-OUT' => 20") &&
      webhook.includes("'RETURNED' => 10") &&
      webhook.includes("'REJECTED' => 5") &&
      webhook.includes("'TIMED OUT', 'TIMED-OUT' => 5")
  ],
  [
    'quote calculates earning ratio in GBP equivalent with fx rates and missing-rate guard',
    /function telegram_currency_map_to_gbp_minor\(array \$amounts/.test(webhook) &&
      /function telegram_fx_rate\(array \$fxRates,\s*string \$currency\)/.test(webhook) &&
      webhook.includes("get_setting('fxRates')") &&
      webhook.includes("'inconsistent'") &&
      webhook.includes("'fxComplete'") &&
      webhook.includes('FX-Rate fehlt')
  ],
  [
    'quote excludes pending and negative statuses from earned actuals',
    webhook.includes("elseif (in_array($status, ['REJECTED', 'TIMED OUT', 'TIMED-OUT'], true))") &&
      webhook.includes('continue;') &&
      webhook.includes("if (in_array($status, ['APPROVED', 'SCREENED OUT', 'SCREENED-OUT'], true) && $actualMinor > 0)")
  ],
  [
    'quote output has readable German text',
    !/(zurÃ¼ckgegeben|mÃ¶glich|â€“)/.test(quoteMessage) &&
      quoteMessage.includes('zurückgegeben') &&
      quoteMessage.includes('möglich')
  ],
  [
    'system telegram command list includes quote',
    /'command'\s*=>\s*'\/quote'/.test(data) &&
      data.includes('Erfolgs- und Verdienst-Quote')
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
