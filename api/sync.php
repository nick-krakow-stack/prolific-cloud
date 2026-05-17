<?php
/**
 * Sync-Endpoint für das Chrome-Plugin.
 *
 * POST mit JSON-Body und Header X-API-Key.
 *
 * Body-Format:
 * {
 *   "studies":    { "id1": {...}, "id2": {...} },     // optional, ganze Map
 *   "submissions":{ "id1": {...}, "id2": {...} },     // optional, ganze Map
 *   "balance":    {...},                              // optional
 *   "fxRates":    {...},                              // optional
 *   "meta": {
 *     "extensionVersion": "1.5.5",
 *     "syncType": "full" | "diff"
 *   }
 * }
 *
 * Strategie: UPSERT - alle gelieferten Datensätze in der DB ersetzen.
 * Datensätze, die das Plugin nicht mehr schickt, bleiben in der DB erhalten
 * (kein destruktives Löschen vom Server-Side aus).
 */

declare(strict_types=1);
require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/_rewards.php';

// Nur POST erlauben (CORS-Preflight separat behandeln)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
    header('Access-Control-Max-Age: 86400');
    exit;
}

// CORS-Header für Chrome-Extension-Requests
header('Access-Control-Allow-Origin: *');  // API-Key macht den Schutz; Origin ist egal
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Nur POST erlaubt.', 405);
}

require_api_key();

$body = read_json_body();
$studies     = $body['studies']     ?? [];
$submissions = $body['submissions'] ?? [];
$balance     = $body['balance']     ?? null;
$fxRates     = $body['fxRates']     ?? null;
$meta        = $body['meta']        ?? [];

$pdo = db();
cleanup_old_logs_once_per_day($pdo);
$pdo->beginTransaction();

$counts = ['studies' => 0, 'submissions' => 0];

try {
    // --- STUDIES ---
    if (!empty($studies) && is_array($studies)) {
        $sql = "INSERT INTO studies (
                  id, name, researcher_name, reward_minor, reward_currency,
                  estimated_minutes, total_places, reward_per_hour,
                  first_seen, last_seen,
                  is_active, expired, expired_at,
                  times_notified, notified, dismissed, verified_by
                ) VALUES (
                  :id, :name, :researcher_name, :reward_minor, :reward_currency,
                  :estimated_minutes, :total_places, :reward_per_hour,
                  :first_seen, :last_seen,
                  :is_active, :expired, :expired_at,
                  :times_notified, :notified, :dismissed, :verified_by
                ) ON DUPLICATE KEY UPDATE
                  name             = VALUES(name),
                  researcher_name  = VALUES(researcher_name),
                  reward_minor     = VALUES(reward_minor),
                  reward_currency  = VALUES(reward_currency),
                  estimated_minutes= VALUES(estimated_minutes),
                  total_places     = VALUES(total_places),
                  reward_per_hour  = VALUES(reward_per_hour),
                  last_seen        = VALUES(last_seen),
                  is_active        = VALUES(is_active),
                  expired          = VALUES(expired),
                  expired_at       = VALUES(expired_at),
                  times_notified   = VALUES(times_notified),
                  notified         = VALUES(notified),
                  dismissed        = VALUES(dismissed),
                  verified_by      = VALUES(verified_by)";
        $stmt = $pdo->prepare($sql);

        foreach ($studies as $id => $s) {
            if (empty($s['id'])) $s['id'] = $id;
            $stmt->execute([
                ':id'                => $s['id'],
                ':name'              => $s['name']            ?? null,
                ':researcher_name'   => $s['researcher_name'] ?? ($s['researcher'] ?? null),
                ':reward_minor'      => $s['reward_minor']    ?? ($s['reward'] ?? null),
                ':reward_currency'   => $s['reward_currency'] ?? 'GBP',
                ':estimated_minutes' => $s['time']            ?? null,
                ':total_places'      => $s['places']          ?? null,
                ':reward_per_hour'   => $s['rph']             ?? null,
                ':first_seen'        => iso_to_datetime($s['firstSeen'] ?? null),
                ':last_seen'         => iso_to_datetime($s['lastSeen']  ?? null),
                ':is_active'         => !empty($s['isActive']) ? 1 : 0,
                ':expired'           => !empty($s['expired'])  ? 1 : 0,
                ':expired_at'        => iso_to_datetime($s['expiredAt'] ?? null),
                ':times_notified'    => $s['timesNotified']  ?? 1,
                ':notified'          => !empty($s['notified'])   ? 1 : 0,
                ':dismissed'         => !empty($s['dismissed'])  ? 1 : 0,
                ':verified_by'       => $s['verifiedBy']      ?? null,
            ]);
            $counts['studies']++;
        }
    }

    // --- SUBMISSIONS ---
    if (!empty($submissions) && is_array($submissions)) {
        $sql = "INSERT INTO submissions (
                  id, study_id, study_name, researcher_name, researcher_country, institution,
                  status,
                  base_reward_minor, adjustment_amount_minor, adjustment_type,
                  bonus_amount_minor, screened_out_amount_minor,
                  reward_amount_minor, reward_currency,
                  started_at, completed_at, time_taken_seconds, provider
                ) VALUES (
                  :id, :study_id, :study_name, :researcher_name, :researcher_country, :institution,
                  :status,
                  :base_reward_minor, :adjustment_amount_minor, :adjustment_type,
                  :bonus_amount_minor, :screened_out_amount_minor,
                  :reward_amount_minor, :reward_currency,
                  :started_at, :completed_at, :time_taken_seconds, :provider
                ) ON DUPLICATE KEY UPDATE
                  study_id          = VALUES(study_id),
                  study_name        = VALUES(study_name),
                  researcher_name   = VALUES(researcher_name),
                  researcher_country= VALUES(researcher_country),
                  institution       = VALUES(institution),
                  status            = VALUES(status),
                  base_reward_minor = VALUES(base_reward_minor),
                  adjustment_amount_minor = VALUES(adjustment_amount_minor),
                  adjustment_type   = VALUES(adjustment_type),
                  bonus_amount_minor= VALUES(bonus_amount_minor),
                  screened_out_amount_minor = VALUES(screened_out_amount_minor),
                  reward_amount_minor = VALUES(reward_amount_minor),
                  reward_currency   = VALUES(reward_currency),
                  started_at        = VALUES(started_at),
                  completed_at      = VALUES(completed_at),
                  time_taken_seconds= VALUES(time_taken_seconds),
                  provider          = VALUES(provider)";
        $stmt = $pdo->prepare($sql);

        foreach ($submissions as $id => $sub) {
            if (empty($sub['id'])) $sub['id'] = $id;
            $effectiveRewardMinor = effective_reward_amount_minor(
                $sub['base_reward_minor'] ?? 0,
                $sub['adjustment_amount_minor'] ?? 0,
                $sub['bonus_amount_minor'] ?? 0,
                $sub['screened_out_amount_minor'] ?? 0,
                $sub['reward_amount_minor'] ?? 0
            );

            $stmt->execute([
                ':id'                => $sub['id'],
                ':study_id'          => $sub['study_id']            ?? null,
                ':study_name'        => $sub['study_name']          ?? null,
                ':researcher_name'   => $sub['researcher_name']     ?? null,
                ':researcher_country'=> $sub['researcher_country']  ?? null,
                ':institution'       => $sub['institution']         ?? null,
                ':status'            => $sub['status']              ?? null,
                ':base_reward_minor'        => $sub['base_reward_minor']        ?? 0,
                ':adjustment_amount_minor'  => $sub['adjustment_amount_minor']  ?? 0,
                ':adjustment_type'          => $sub['adjustment_type']          ?? null,
                ':bonus_amount_minor'       => $sub['bonus_amount_minor']       ?? 0,
                ':screened_out_amount_minor'=> $sub['screened_out_amount_minor']?? 0,
                ':reward_amount_minor'      => $effectiveRewardMinor,
                ':reward_currency'   => $sub['reward_currency']     ?? 'GBP',
                ':started_at'        => iso_to_datetime($sub['started_at']   ?? null),
                ':completed_at'      => iso_to_datetime($sub['completed_at'] ?? null),
                ':time_taken_seconds'=> $sub['time_taken_seconds']  ?? null,
                ':provider'          => $sub['provider']            ?? 'prolific',
            ]);
            $counts['submissions']++;
        }
    }

    // --- BALANCE & FX-RATES als settings ---
    if ($balance !== null)  set_setting('balance', $balance);
    if ($fxRates !== null)  set_setting('fxRates', $fxRates);
    if (!empty($meta))      set_setting('lastSyncMeta', $meta);
    set_setting('lastSyncAt', date('c'));

    // Sync-Log-Eintrag
    $stmt = $pdo->prepare(
        "INSERT INTO sync_log (studies_count, submissions_count, client_ip, user_agent)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([
        $counts['studies'],
        $counts['submissions'],
        $_SERVER['REMOTE_ADDR']     ?? '',
        substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
    ]);

    $pdo->commit();

    log_event('sync_ok', 'Sync abgeschlossen', $counts);

    json_response([
        'ok' => true,
        'received' => $counts,
        'serverTime' => date('c'),
    ]);

} catch (Throwable $e) {
    $pdo->rollBack();
    log_event('sync_error', $e->getMessage());
    json_error('Sync fehlgeschlagen: ' . $e->getMessage(), 500);
}

function cleanup_old_logs_once_per_day(PDO $pdo): void {
    try {
        $today = date('Y-m-d');

        if (get_setting('lastLogCleanupDate') === $today) {
            return;
        }

        $cutoff = (new DateTimeImmutable('now', new DateTimeZone(date_default_timezone_get())))
            ->modify('-7 days')
            ->format('Y-m-d H:i:s');

        $stmt = $pdo->prepare("DELETE FROM events WHERE `timestamp` < ?");
        $stmt->execute([$cutoff]);

        $stmt = $pdo->prepare("DELETE FROM sync_log WHERE `timestamp` < ?");
        $stmt->execute([$cutoff]);

        set_setting('lastLogCleanupDate', $today);
    } catch (Throwable $e) {
        // Cleanup darf den eigentlichen Sync nicht blockieren.
    }
}
