const fs = require('fs');

const commands = fs.readFileSync('api/_telegram_commands.php', 'utf8');
const data = fs.readFileSync('api/data.php', 'utf8');
const quoteMessage = commands.match(/function telegram_quote_message\(PDO \$pdo\): string[\s\S]*?\n}\n\nfunction telegram_build_quote_stats/)?.[0] || '';

const checks = [
  [
    'shared dispatcher dispatches and registry advertises quote command',
      commands.includes("case '/quote':") &&
      commands.includes('return telegram_quote_message($pdo);') &&
      commands.includes("'command' => '/quote'") &&
      commands.includes('Erfolgs- und Verdienst-Quote')
  ],
  [
    'quote message implements thirty day accepted missed and returned counts',
    /function telegram_quote_message\(PDO \$pdo\): string/.test(commands) &&
      /function telegram_build_quote_stats\(PDO \$pdo/.test(commands) &&
      commands.includes("first_seen >= ?") &&
      commands.includes("reward_minor > 0") &&
      commands.includes("'accepted'") &&
      commands.includes("'missed'") &&
      commands.includes("'returned'")
  ],
  [
    'quote status priority follows specification',
    /function telegram_quote_submission_priority\(string \$status\): int/.test(commands) &&
      commands.includes("'APPROVED' => 40") &&
      commands.includes("'AWAITING REVIEW' => 30") &&
      commands.includes("'SCREENED OUT', 'SCREENED-OUT' => 20") &&
      commands.includes("'RETURNED' => 10") &&
      commands.includes("'REJECTED' => 5") &&
      commands.includes("'TIMED OUT', 'TIMED-OUT' => 5")
  ],
  [
    'quote calculates earning ratio in GBP equivalent with fx rates and missing-rate guard',
    /function telegram_currency_map_to_gbp_minor\(array \$amounts/.test(commands) &&
      /function telegram_fx_rate\(array \$fxRates,\s*string \$currency\)/.test(commands) &&
      commands.includes("get_setting('fxRates')") &&
      commands.includes("'fxComplete'") &&
      commands.includes('FX\\\\-Rate fehlt')
  ],
  [
    'quote excludes pending and negative statuses from earned actuals',
    commands.includes("elseif (in_array($status, ['REJECTED', 'TIMED OUT', 'TIMED-OUT'], true))") &&
      commands.includes('continue;') &&
      commands.includes("if (in_array($status, ['APPROVED', 'SCREENED OUT', 'SCREENED-OUT'], true) && $actualMinor > 0)")
  ],
  [
    'quote output has readable German text',
    !/(zurÃƒÂ¼ckgegeben|mÃƒÂ¶glich|Ã¢â‚¬â€œ)/.test(quoteMessage) &&
      quoteMessage.includes('zurueckgegeben') &&
      quoteMessage.includes('moeglich')
  ],
  [
    'system telegram command list includes quote',
    data.includes('telegram_command_definitions()') &&
      /'command'\s*=>\s*'\/quote'/.test(commands) &&
      commands.includes('Erfolgs- und Verdienst-Quote')
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
