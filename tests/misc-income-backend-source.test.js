const fs = require('fs');
const assert = require('assert');

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
}

const helper = read('api/_misc_income.php');
const data = read('api/data.php');
const install = read('install.php');
const deploy = read('scripts/deploy-webspace.ps1');

assert(helper, 'api/_misc_income.php must exist');
assert(helper.includes('const MISC_INCOME_TABLE'));
assert(helper.includes("'misc_income_entries'"));
assert(helper.includes('function misc_income_schema_exists(PDO $pdo): bool'));
assert(helper.includes('information_schema.TABLES'));
assert(helper.includes('TABLE_SCHEMA = DATABASE()'));
assert(helper.includes('function misc_income_require_schema(PDO $pdo): void'));
assert(helper.includes('function build_misc_income_response(PDO $pdo): array'));
assert(helper.includes('function save_misc_income_entry(PDO $pdo): array'));
assert(helper.includes('function delete_misc_income_entry(PDO $pdo): array'));
assert(helper.includes('function misc_income_empty_response(): array'));
assert(helper.includes('schemaReady'));
assert(helper.includes('fxRates'));
assert(helper.includes("get_setting('fxRates')"));
assert(helper.includes('decode_setting_value'));
assert(helper.includes('category'));
assert(helper.includes('tech_support'));
assert(helper.includes('user_testing'));
assert(helper.includes('testable_minds'));
assert(helper.includes('entry_type'));
assert(helper.includes('test'));
assert(helper.includes('survey'));
assert(helper.includes('task'));
assert(helper.includes('MISC_INCOME_USD_AMOUNT_CATEGORIES'));
assert(helper.includes('MISC_INCOME_PORTAL_TYPES'));
assert(helper.includes('hours_hundredths'));
assert(helper.includes('hourly_rate_cents'));
assert(helper.includes('amount_minor'));
assert(helper.includes('currency'));
assert(helper.includes('entryDate'));
assert(helper.includes('hoursHundredths'));
assert(helper.includes('hourlyRateCents'));
assert(helper.includes('amountMinor'));
assert(helper.includes('entryType'));
assert(helper.includes('totalByCategoryCurrency'));
assert(helper.includes('totalByCurrency'));
assert(helper.includes('todayByCurrency'));
assert(helper.includes('monthByCurrency'));
assert(helper.includes('function misc_income_calculate_summary(array $entries): array'));
assert(helper.includes('function misc_income_validate_entry_payload(array $body'));
assert(helper.includes('read_json_body()'));
assert(helper.includes('json_error('));
assert(helper.includes("misc_income_string_ends_with($key, '_cents')"));

const responseStart = helper.indexOf('function build_misc_income_response');
const responseEnd = helper.indexOf('function save_misc_income_entry', responseStart);
const responseBody = helper.slice(responseStart, responseEnd);
assert(responseBody.includes('misc_income_schema_exists($pdo)'));
assert(responseBody.includes('misc_income_empty_response()'));
assert(!responseBody.includes('CREATE TABLE'), 'GET response must not create schema implicitly');

const saveStart = helper.indexOf('function save_misc_income_entry');
const saveEnd = helper.indexOf('function delete_misc_income_entry', saveStart);
const saveBody = helper.slice(saveStart, saveEnd);
assert(saveBody.includes('misc_income_require_schema($pdo)'));
assert(saveBody.includes('$pdo->prepare('));
assert(!saveBody.includes('CREATE TABLE'), 'writes must not create schema implicitly');

assert(data.includes("require_once __DIR__ . '/_misc_income.php';"));
for (const route of [
  "case 'miscIncome':",
  "case 'miscIncomeSave':",
  "case 'miscIncomeDelete':",
]) {
  assert(data.includes(route), `missing route ${route}`);
}
assert(data.includes('$miscIncome = build_misc_income_response($pdo);'));
assert(data.includes("'miscIncome'      => $miscIncome"));
assert(/case 'miscIncomeSave':[\s\S]*\$_SERVER\['REQUEST_METHOD'\] !== 'POST'[\s\S]*require_dashboard_write_request\(\)[\s\S]*save_misc_income_entry\(\$pdo\)/.test(data));
assert(/case 'miscIncomeDelete':[\s\S]*\$_SERVER\['REQUEST_METHOD'\] !== 'POST'[\s\S]*require_dashboard_write_request\(\)[\s\S]*delete_misc_income_entry\(\$pdo\)/.test(data));

assert(install.includes('misc_income_entries'));
assert(install.includes('`category`             VARCHAR(32) NOT NULL'));
assert(install.includes('`entry_type`           VARCHAR(16) NULL'));
assert(install.includes('`entry_date`           DATE NOT NULL'));
assert(install.includes('`hours_hundredths`     INT NOT NULL DEFAULT 0'));
assert(install.includes('`hourly_rate_cents`    INT NOT NULL DEFAULT 0'));
assert(install.includes('`amount_minor`         INT NOT NULL DEFAULT 0'));
assert(install.includes('`currency`             VARCHAR(3) NOT NULL'));

assert(deploy.includes('"api/_misc_income.php"'));
assert(deploy.includes('"dashboard/assets/testable-minds-logo.svg"'));
assert(deploy.includes('"dashboard/assets/user-testing-logo.svg"'));

console.log('misc income backend source contract ok');
