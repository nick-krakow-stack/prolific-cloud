const fs = require('fs');
const assert = require('assert');

const helper = fs.readFileSync('api/_extra_income.php', 'utf8');

assert(helper.includes('function ensure_extra_income_schema('));
assert(helper.includes('CREATE TABLE IF NOT EXISTS extra_income_sessions'));
assert(helper.includes('free_message_count INT NOT NULL DEFAULT 0'));
assert(helper.includes('CREATE TABLE IF NOT EXISTS extra_income_timer'));
assert(helper.includes('CREATE TABLE IF NOT EXISTS extra_income_payouts'));
assert(helper.includes('function extra_income_week_start('));
assert(helper.includes('function extra_income_split_session_by_week('));
assert(helper.includes('function extra_income_allocate_proportional_counts('));
assert(helper.includes('function extra_income_calculate_week_rate_cents('));
assert(helper.includes('function extra_income_calculate_session_bonus_cents('));
assert(helper.includes('function extra_income_calculate_payout_fee_cents('));
assert(helper.includes('function extra_income_schema_exists('));
assert(helper.includes('EXTRA_INCOME_REQUIRED_TABLES'));
assert(helper.includes('information_schema.TABLES'));
assert(helper.includes('TABLE_SCHEMA = DATABASE()'));
assert(helper.includes('information_schema.COLUMNS'));
assert(helper.includes('COLUMN_NAME = ?'));
assert(helper.includes("'extra_income_sessions'"));
assert(helper.includes("'extra_income_timer'"));
assert(helper.includes("'extra_income_payouts'"));
assert(helper.includes('function extra_income_require_schema('));
assert(helper.includes('function extra_income_empty_response('));
assert(helper.includes('function extra_income_empty_overview_summary('));
assert(helper.includes('function extra_income_add_period_share('));
assert(helper.includes('function extra_income_session_overlaps_paid_periods('));
assert(helper.includes('function build_extra_income_response('));
assert(helper.includes('function start_extra_income_timer('));
assert(helper.includes('function stop_extra_income_timer('));
assert(helper.includes('function save_extra_income_session('));
assert(helper.includes('function delete_extra_income_session('));
assert(helper.includes('function mark_extra_income_paid('));

assert(helper.includes('1000') && helper.includes('12'));
assert(helper.includes('1250') && helper.includes('13'));
assert(helper.includes('1500') && helper.includes('14'));
assert(helper.includes('2000') && helper.includes('15'));
assert(helper.includes('17'));
assert(helper.includes('50') && helper.includes('500'));
assert(helper.includes('night_bonus_enabled'));
assert(helper.includes('bonus_threshold_messages'));
assert(helper.includes('free_message_count'));
assert(helper.includes('freeMessageCount'));
assert(helper.includes('free_message_cents'));
assert(helper.includes('EXTRA_INCOME_FREE_MESSAGE_CENTS'));
assert(helper.includes("return $parts[$b]['duration_seconds'] <=> $parts[$a]['duration_seconds'];"));
assert(helper.includes("Diese Session liegt in einem bereits ausgezahlten Zeitraum."));
assert(helper.includes("Bereits ausgezahlte Sessions koennen nicht bearbeitet werden."));
assert(helper.includes("Bereits ausgezahlte Sessions koennen nicht geloescht werden."));

const overviewSummaryStart = helper.indexOf('function build_extra_income_overview_summary');
const overviewSummaryEnd = helper.indexOf('function start_extra_income_timer', overviewSummaryStart);
const overviewSummaryBody = helper.slice(overviewSummaryStart, overviewSummaryEnd);
assert(overviewSummaryBody.includes('extra_income_schema_exists($pdo)'));
assert(!overviewSummaryBody.includes('ensure_extra_income_schema($pdo)'));

const responseStart = helper.indexOf('function build_extra_income_response');
const responseEnd = helper.indexOf('function build_extra_income_overview_summary', responseStart);
const responseBody = helper.slice(responseStart, responseEnd);
assert(responseBody.includes('extra_income_schema_exists($pdo)'));
assert(responseBody.includes('extra_income_empty_response()'));
assert(!responseBody.includes('ensure_extra_income_schema($pdo)'));

const data = fs.readFileSync('api/data.php', 'utf8');
const install = fs.readFileSync('install.php', 'utf8');

assert(data.includes("require_once __DIR__ . '/_extra_income.php';"));
for (const route of [
  "case 'extraIncome':",
  "case 'extraIncomeStart':",
  "case 'extraIncomeStop':",
  "case 'extraIncomeSave':",
  "case 'extraIncomeDelete':",
  "case 'extraIncomeMarkPaid':",
]) {
  assert(data.includes(route), `missing route ${route}`);
}
assert(data.includes("'extraIncome'     => $extraIncome"));
assert(data.includes('build_extra_income_overview_summary($pdo)'));
assert(data.includes('require_dashboard_write_request();'));
assert(install.includes('extra_income_sessions'));
assert(install.includes('`free_message_count`       INT NOT NULL DEFAULT 0'));
assert(install.includes('extra_income_timer'));
assert(install.includes('extra_income_payouts'));

console.log('extra income backend source contract ok');
