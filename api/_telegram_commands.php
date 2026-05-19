<?php
/**
 * Shared Telegram command parser, registry, and dispatcher.
 */

declare(strict_types=1);

require_once __DIR__ . '/_rewards.php';
require_once __DIR__ . '/_worktime.php';
require_once __DIR__ . '/_telegram.php';

function telegram_parse_command_text(string $text): array {
    $raw = trim($text);
    $parts = preg_split('/\s+/', $raw) ?: [];
    $first = (string)($parts[0] ?? '');
    $withoutBotName = explode('@', $first, 2)[0];

    return [
        'command' => strtolower($withoutBotName),
        'args' => array_slice($parts, 1),
        'raw' => $raw,
    ];
}

function telegram_from_user_label(array $from): string {
    $parts = [];
    foreach (['username', 'first_name', 'last_name'] as $key) {
        $value = trim((string)($from[$key] ?? ''));
        if ($value !== '') {
            $parts[] = $value;
        }
    }

    if (empty($parts) && isset($from['id'])) {
        $parts[] = (string)$from['id'];
    }

    return implode(' ', $parts);
}

function telegram_command_definitions(): array {
    return [
        ['command' => '/status', 'description' => 'Aktueller Systemstatus', 'input' => 'none'],
        ['command' => '/earnings', 'description' => 'Verdienst nach Zeitraum', 'input' => 'none'],
        ['command' => '/worktime', 'description' => 'Arbeitszeit nach Zeitraum', 'input' => 'none'],
        ['command' => '/effective', 'description' => 'Effektiver Stundenlohn', 'input' => 'none'],
        ['command' => '/balance', 'description' => 'Auszahlbar und in Pruefung', 'input' => 'none'],
        ['command' => '/studies', 'description' => 'Aktive Studien', 'input' => 'none'],
        ['command' => '/quote', 'description' => 'Erfolgs- und Verdienst-Quote', 'input' => 'none'],
        ['command' => '/today', 'description' => 'Heutige Aktivitaet', 'input' => 'none'],
        ['command' => '/pending', 'description' => 'Offene Teilnahmen', 'input' => 'none'],
        ['command' => '/month', 'description' => 'Aktueller Monat', 'input' => 'none'],
        ['command' => '/goals', 'description' => 'Tages- und Monatsziel', 'input' => 'none'],
        ['command' => '/top', 'description' => 'Top-Studien', 'input' => 'none'],
        ['command' => '/stats', 'description' => 'Status-Verteilung', 'input' => 'none'],
        ['command' => '/sync', 'description' => 'Technischer Sync-Status', 'input' => 'none'],
        ['command' => '/export', 'description' => 'CSV-Export-Link', 'input' => 'none'],
        ['command' => '/active', 'description' => 'Kurzliste aktiver Studien', 'input' => 'none'],
        ['command' => '/last', 'description' => 'Letzte Teilnahmen', 'input' => 'none'],
        ['command' => '/compare', 'description' => 'Monatsvergleich', 'input' => 'none'],
        ['command' => '/heatmap', 'description' => 'Monats-Heatmap', 'input' => 'none'],
        ['command' => '/week', 'description' => 'Aktuelle Woche', 'input' => 'none'],
        [
            'command' => '/setgoal',
            'description' => 'Ziel in EUR setzen',
            'input' => 'fields',
            'fields' => [
                ['name' => 'scope', 'label' => 'Ziel', 'type' => 'select', 'options' => [
                    ['value' => 'day', 'label' => 'Tagesziel'],
                    ['value' => 'month', 'label' => 'Monatsziel'],
                ], 'required' => true],
                ['name' => 'amount', 'label' => 'Betrag EUR', 'type' => 'number', 'step' => '0.01', 'required' => true],
            ],
        ],
        [
            'command' => '/sethourly',
            'description' => 'Stundenlohn-Grenze in EUR setzen',
            'input' => 'fields',
            'fields' => [
                ['name' => 'scope', 'label' => 'Grenze', 'type' => 'select', 'options' => [
                    ['value' => 'good', 'label' => 'Sehr gut'],
                    ['value' => 'ok', 'label' => 'Okay'],
                ], 'required' => true],
                ['name' => 'amount', 'label' => 'Betrag EUR', 'type' => 'number', 'step' => '0.01', 'required' => true],
            ],
        ],
        [
            'command' => '/report',
            'description' => 'Tagesbericht ein- oder ausschalten',
            'input' => 'fields',
            'fields' => [
                ['name' => 'mode', 'label' => 'Status', 'type' => 'select', 'options' => [
                    ['value' => 'on', 'label' => 'Aktivieren'],
                    ['value' => 'off', 'label' => 'Deaktivieren'],
                ], 'required' => true],
                ['name' => 'time', 'label' => 'Uhrzeit', 'type' => 'time', 'required' => false],
            ],
        ],
        [
            'command' => '/mute',
            'description' => 'Telegram-Meldungen pausieren',
            'input' => 'fields',
            'fields' => [
                ['name' => 'duration', 'label' => 'Dauer', 'type' => 'select', 'options' => [
                    ['value' => '30m', 'label' => '30 Minuten'],
                    ['value' => '1h', 'label' => '1 Stunde'],
                    ['value' => '2h', 'label' => '2 Stunden'],
                    ['value' => '4h', 'label' => '4 Stunden'],
                    ['value' => 'today', 'label' => 'Bis Tagesende'],
                ], 'required' => true],
            ],
        ],
        ['command' => '/unmute', 'description' => 'Telegram-Pause aufheben', 'input' => 'none'],
        ['command' => '/delete_logs', 'description' => 'Telegram-Nachrichtenlog loeschen', 'input' => 'confirm'],
        ['command' => '/help', 'description' => 'Befehlsuebersicht', 'input' => 'none'],
        ['command' => '/start', 'description' => 'Startnachricht', 'input' => 'none'],
    ];
}

function telegram_dispatch_command(array $parsed, ?PDO $pdo = null, ?int $currentUpdateId = null): string {
    $pdo = $pdo ?: db();
    $command = (string)($parsed['command'] ?? '');
    $args = isset($parsed['args']) && is_array($parsed['args']) ? $parsed['args'] : [];

    switch ($command) {
        case '/start':
            return telegram_help_message(true);
        case '/help':
            return telegram_help_message(false);
        case '/status':
            return telegram_status_message($pdo);
        case '/balance':
            return telegram_balance_message();
        case '/studies':
            return telegram_studies_message($pdo, 10);
        case '/earnings':
            return telegram_earnings_message($pdo);
        case '/worktime':
            return telegram_worktime_message($pdo);
        case '/effective':
            return telegram_effective_message($pdo);
        case '/quote':
            return telegram_quote_message($pdo);
        case '/today':
            return telegram_today_message($pdo);
        case '/pending':
            return telegram_pending_message($pdo);
        case '/month':
            return telegram_month_message($pdo);
        case '/goals':
            return telegram_goals_message($pdo);
        case '/top':
            return telegram_top_message($pdo);
        case '/stats':
            return telegram_stats_message($pdo);
        case '/sync':
            return telegram_sync_message($pdo);
        case '/export':
            return telegram_export_message();
        case '/active':
            return telegram_studies_message($pdo, 3);
        case '/last':
            return telegram_last_message($pdo);
        case '/compare':
            return telegram_compare_message($pdo);
        case '/heatmap':
            return telegram_heatmap_message($pdo);
        case '/week':
            return telegram_week_message($pdo);
        case '/setgoal':
            return telegram_setgoal_message($args);
        case '/sethourly':
            return telegram_sethourly_message($args);
        case '/report':
            return telegram_report_message($args);
        case '/mute':
            return telegram_mute_message($args);
        case '/unmute':
            return telegram_unmute_message();
        case '/delete_logs':
            return telegram_delete_logs_message($pdo, $currentUpdateId);
        default:
            return 'Unbekannter Befehl: ' . tg_escape($command) . "\n\nTippe /help fuer eine Liste verfuegbarer Befehle\\.";
    }
}

function telegram_execute_dashboard_command(PDO $pdo, array $payload): array {
    $definitions = telegram_command_definitions();
    $byCommand = [];
    foreach ($definitions as $definition) {
        $byCommand[(string)$definition['command']] = $definition;
    }

    $command = strtolower(trim((string)($payload['command'] ?? '')));
    if (!isset($byCommand[$command])) {
        return ['ok' => false, 'error' => 'Unbekannter Telegram-Befehl.'];
    }

    $values = isset($payload['values']) && is_array($payload['values']) ? $payload['values'] : [];
    $text = telegram_compose_dashboard_command_text($byCommand[$command], $values);
    if ($text === null) {
        return ['ok' => false, 'error' => 'Ungueltige Telegram-Befehlswerte.'];
    }

    $parsed = telegram_parse_command_text($text);
    $response = telegram_dispatch_command($parsed, $pdo, null);
    $chatId = telegram_allowed_chat_id();
    $sent = $chatId !== null && send_telegram_message($chatId, $response);

    return [
        'ok' => true,
        'command' => $command,
        'sent' => $sent,
        'response' => $response,
    ];
}

function telegram_compose_dashboard_command_text(array $definition, array $values): ?string {
    $command = (string)$definition['command'];
    switch ($command) {
        case '/setgoal':
            $scope = strtolower(trim((string)($values['scope'] ?? '')));
            $amount = telegram_normalize_decimal_text($values['amount'] ?? null);
            return in_array($scope, ['day', 'month'], true) && $amount !== null ? "$command $scope $amount" : null;
        case '/sethourly':
            $scope = strtolower(trim((string)($values['scope'] ?? '')));
            $amount = telegram_normalize_decimal_text($values['amount'] ?? null);
            return in_array($scope, ['good', 'ok'], true) && $amount !== null ? "$command $scope $amount" : null;
        case '/report':
            $mode = strtolower(trim((string)($values['mode'] ?? '')));
            if ($mode === 'off') {
                return "$command off";
            }
            $time = trim((string)($values['time'] ?? ''));
            return $mode === 'on' && preg_match('/^\d{2}:\d{2}$/', $time) ? "$command on $time" : null;
        case '/mute':
            $duration = strtolower(trim((string)($values['duration'] ?? '')));
            if ($duration === 'today') {
                return "$command today";
            }
            return preg_match('/^\d+\s*(m|h|d)$/', $duration) ? "$command " . str_replace(' ', '', $duration) : null;
        default:
            return ($definition['input'] ?? 'none') === 'none' || ($definition['input'] ?? '') === 'confirm' ? $command : null;
    }
}

function telegram_allowed_chat_id(): ?int {
    $telegram = telegram_config();
    $chatId = trim((string)($telegram['allowed_chat_id'] ?? ''));

    return $chatId !== '' && preg_match('/^-?\d+$/', $chatId) ? (int)$chatId : null;
}

function telegram_help_message(bool $withGreeting): string {
    $lines = [];
    if ($withGreeting) {
        $lines[] = 'Willkommen beim *Prolific Watcher*';
        $lines[] = '';
    }

    $lines[] = 'Verfuegbare Befehle:';
    foreach (telegram_command_definitions() as $definition) {
        if (in_array($definition['command'], ['/start'], true)) {
            continue;
        }
        $lines[] = tg_escape($definition['command'] . ' - ' . $definition['description']);
    }

    return implode("\n", $lines);
}

function telegram_status_message(PDO $pdo): string {
    $activeStudies = (int)$pdo->query('SELECT COUNT(*) FROM studies WHERE is_active = 1')->fetchColumn();
    $lastSyncAt = get_setting('lastSyncAt');
    $lastSyncMeta = get_setting('lastSyncMeta');
    $meta = is_array($lastSyncMeta) ? $lastSyncMeta : [];

    $lines = [
        '*Status*',
        '',
        'Aktive Studien: ' . tg_escape((string)$activeStudies),
        'Letzter Sync: ' . tg_escape(telegram_relative_time($lastSyncAt)),
        'Auth: OK',
        'Plugin\\-Version: ' . tg_escape((string)($meta['extensionVersion'] ?? 'unbekannt')),
    ];

    if (telegram_sync_is_stale($lastSyncAt)) {
        $lines[] = '';
        $lines[] = 'Plugin synct nicht \\- PC vermutlich aus oder Sync deaktiviert\\.';
    }

    return implode("\n", $lines);
}

function telegram_balance_message(): string {
    $balance = get_setting('balance');
    $extracted = telegram_extract_balance(is_array($balance) ? $balance : []);

    return implode("\n", [
        '*Prolific\\-Konto*',
        '',
        'Auszahlbar: ' . telegram_fmt_money_map($extracted['available']),
        'In Pruefung: ' . telegram_fmt_money_map($extracted['pending']),
    ]);
}

function telegram_studies_message(PDO $pdo, int $limit): string {
    $total = (int)$pdo->query('SELECT COUNT(*) FROM studies WHERE is_active = 1')->fetchColumn();
    $stmt = $pdo->prepare(
        "SELECT id, name, reward_minor, reward_currency, estimated_minutes, total_places, reward_per_hour
         FROM studies
         WHERE is_active = 1
         ORDER BY first_seen DESC
         LIMIT ?"
    );
    $stmt->bindValue(1, max(1, min(10, $limit)), PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    if ($total === 0 || empty($rows)) {
        return 'Keine aktiven Studien gerade\\.';
    }

    $lines = ['*Aktive Studien \\(' . $total . '\\)*', ''];
    foreach ($rows as $index => $row) {
        $reward = telegram_fmt_amount((int)($row['reward_minor'] ?? 0), (string)($row['reward_currency'] ?? 'GBP'));
        $hourly = telegram_fmt_amount((int)($row['reward_per_hour'] ?? 0), (string)($row['reward_currency'] ?? 'GBP')) . '/h';
        $url = 'https://app.prolific.com/studies/' . rawurlencode((string)($row['id'] ?? ''));
        $lines[] = ($index + 1) . '\\. *' . tg_escape((string)($row['name'] ?? 'Ohne Namen')) . '*';
        $lines[] = '   ' . $reward . ' \\| ' . tg_escape((string)($row['estimated_minutes'] ?? 0) . ' Min') . ' \\| ' . tg_escape((string)($row['total_places'] ?? 0) . ' Plaetze') . ' \\| ' . $hourly;
        $lines[] = '   ' . tg_escape($url);
        $lines[] = '';
    }
    if ($total > count($rows)) {
        $lines[] = '\\+ ' . tg_escape((string)($total - count($rows))) . ' weitere';
    }

    return trim(implode("\n", $lines));
}

function telegram_earnings_message(PDO $pdo): string {
    $periods = telegram_current_periods();
    $earnedStatuses = telegram_earned_statuses();
    $pendingStatuses = telegram_pending_statuses();

    return implode("\n", [
        '*Verdienst\\-Uebersicht*',
        '',
        'Heute: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $earnedStatuses, $periods['today'], null))
            . ' \\(' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $pendingStatuses, $periods['today'], null)) . ' ausstehend\\)',
        'Diese Woche: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $earnedStatuses, $periods['weekStart'], null))
            . ' \\(' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $pendingStatuses, $periods['weekStart'], null)) . ' ausstehend\\)',
        'Dieser Monat: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $earnedStatuses, $periods['monthStart'], null)),
        'Vormonat: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $earnedStatuses, $periods['lastMonthStart'], $periods['monthStart'])),
        'Gesamt: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, $earnedStatuses, null, null)),
    ]);
}

function telegram_worktime_message(PDO $pdo): string {
    $worktime = telegram_worktime_periods($pdo);

    return implode("\n", [
        '*Arbeitszeit*',
        '',
        telegram_worktime_line('Heute', $worktime['today']),
        telegram_worktime_line('Diese Woche', $worktime['week']),
        telegram_worktime_line('Dieser Monat', $worktime['month']),
        telegram_worktime_line('Vormonat', $worktime['lastMonth']),
        telegram_worktime_line('Gesamt', $worktime['allTime']),
    ]);
}

function telegram_effective_message(PDO $pdo): string {
    $periods = telegram_current_periods();
    $earnedStatuses = telegram_earned_statuses();
    $monthEarned = telegram_sum_by_started_period($pdo, $earnedStatuses, $periods['monthStart'], null);
    $allTimeEarned = telegram_sum_by_started_period($pdo, $earnedStatuses, null, null);
    $worktime = telegram_worktime_periods($pdo);

    return implode("\n", [
        '*Effektiver Stundenlohn*',
        '',
        telegram_effective_period_line('Dieser Monat', $monthEarned, $worktime['month']),
        '',
        telegram_effective_period_line('Gesamt', $allTimeEarned, $worktime['allTime']),
    ]);
}

function telegram_worktime_periods(PDO $pdo): array {
    $periods = telegram_current_periods();

    return [
        'today' => sum_worktime_by_period($pdo, $periods['today'], null),
        'week' => sum_worktime_by_period($pdo, $periods['weekStart'], null),
        'month' => sum_worktime_by_period($pdo, $periods['monthStart'], null),
        'lastMonth' => sum_worktime_by_period($pdo, $periods['lastMonthStart'], $periods['monthStart']),
        'allTime' => sum_worktime_by_period($pdo, null, null),
    ];
}

function telegram_worktime_line(string $label, array $bucket): string {
    $paidSeconds = (int)($bucket['paid_seconds'] ?? 0);
    $unpaidSeconds = (int)($bucket['unpaid_seconds'] ?? 0);
    $line = tg_escape($label) . ': ' . tg_escape(telegram_fmt_worktime_de($paidSeconds));

    if ($unpaidSeconds > 0) {
        $line .= "\n" . '   Davon ' . tg_escape(telegram_fmt_worktime_de($unpaidSeconds)) . ' unbezahlt';
    }

    return $line;
}

function telegram_effective_period_line(string $label, array $earned, array $worktime): string {
    $paidSeconds = (int)($worktime['paid_seconds'] ?? 0);
    if ($paidSeconds <= 0) {
        return tg_escape($label) . ': Noch keine bezahlte Arbeitszeit';
    }

    $earnedGbpMinor = telegram_currency_map_to_gbp_minor($earned, telegram_normalize_fx_rates(get_setting('fxRates')));
    if ($earnedGbpMinor === null) {
        return tg_escape($label) . ': nicht berechenbar \\(FX\\-Rate fehlt\\)';
    }

    $hourlyMinor = (int)round(($earnedGbpMinor * 3600) / $paidSeconds);

    return tg_escape($label) . ': ' . telegram_fmt_amount($hourlyMinor, 'GBP') . '/h'
        . "\n" . '   \\(' . telegram_fmt_money_map($earned) . ' in ' . tg_escape(telegram_fmt_worktime_de($paidSeconds)) . '\\)';
}

function telegram_fmt_worktime_de(int $seconds): string {
    if ($seconds < 60) {
        return '0 min';
    }

    $h = intdiv($seconds, 3600);
    $m = intdiv($seconds % 3600, 60);
    if ($h === 0) {
        return "{$m}min";
    }
    if ($m === 0) {
        return "{$h}h";
    }
    return "{$h}h {$m}min";
}

function telegram_today_message(PDO $pdo): string {
    $periods = telegram_current_periods();
    $todaySql = $periods['today']->format('Y-m-d H:i:s');
    $studyStmt = $pdo->prepare('SELECT COUNT(*) FROM studies WHERE first_seen >= ?');
    $studyStmt->execute([$todaySql]);
    $submissions = telegram_count_submissions_since($pdo, $todaySql);

    return implode("\n", [
        '*Heute*',
        '',
        'Neue Studien: ' . tg_escape((string)$studyStmt->fetchColumn()),
        'Teilgenommen: ' . tg_escape((string)$submissions),
        'Verdient: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, telegram_earned_statuses(), $periods['today'], null))
            . ' \\(' . telegram_fmt_money_map(telegram_sum_by_period($pdo, telegram_pending_statuses(), $periods['today'], null)) . ' ausstehend\\)',
    ]);
}

function telegram_pending_message(PDO $pdo): string {
    $pending = telegram_pending_summary($pdo);
    return implode("\n", [
        '*Pending*',
        '',
        'Offen: ' . tg_escape((string)$pending['count']),
        'Summe: ' . telegram_fmt_money_map($pending['total']),
        'Aelteste Teilnahme: ' . tg_escape(telegram_relative_time($pending['oldestCompletedAt'])),
        'Aelter als 7 Tage: ' . tg_escape((string)$pending['olderThan7Days']),
        'Aelter als 14 Tage: ' . tg_escape((string)$pending['olderThan14Days']),
    ]);
}

function telegram_month_message(PDO $pdo): string {
    $periods = telegram_current_periods();
    $earned = telegram_sum_by_period($pdo, telegram_earned_statuses(), $periods['monthStart'], null);
    $pending = telegram_sum_by_period($pdo, telegram_pending_statuses(), $periods['monthStart'], null);
    $settings = telegram_load_dashboard_settings();
    $goal = (int)($settings['goals']['monthly_gbp_minor'] ?? 0);
    $earnedGbp = (int)($earned['GBP'] ?? 0) + (int)($pending['GBP'] ?? 0);
    $percent = $goal > 0 ? round(($earnedGbp / $goal) * 100, 1) : null;
    $projection = telegram_month_projection($earnedGbp, $periods['now']);

    return implode("\n", [
        '*Aktueller Monat*',
        '',
        'Verdient: ' . telegram_fmt_money_map($earned),
        'Pending: ' . telegram_fmt_money_map($pending),
        'Ziel: ' . telegram_fmt_amount($goal, 'GBP') . ' \\| ' . telegram_fmt_percent($percent),
        'Prognose: ' . telegram_fmt_amount($projection, 'GBP'),
    ]);
}

function telegram_goals_message(PDO $pdo): string {
    $periods = telegram_current_periods();
    $settings = telegram_load_dashboard_settings();
    $goals = $settings['goals'];
    $today = telegram_sum_maps(
        telegram_sum_by_period($pdo, telegram_earned_statuses(), $periods['today'], null),
        telegram_sum_by_period($pdo, telegram_pending_statuses(), $periods['today'], null)
    );
    $month = telegram_sum_maps(
        telegram_sum_by_period($pdo, telegram_earned_statuses(), $periods['monthStart'], null),
        telegram_sum_by_period($pdo, telegram_pending_statuses(), $periods['monthStart'], null)
    );

    return implode("\n", [
        '*Ziele*',
        '',
        'Heute: ' . telegram_goal_line((int)($today['GBP'] ?? 0), (int)($goals['daily_gbp_minor'] ?? 0)),
        'Monat: ' . telegram_goal_line((int)($month['GBP'] ?? 0), (int)($goals['monthly_gbp_minor'] ?? 0)),
    ]);
}

function telegram_top_message(PDO $pdo): string {
    $rewardRows = telegram_top_rows($pdo, 'reward');
    $hourlyRows = telegram_top_rows($pdo, 'hourly');
    $lines = ['*Top\\-Studien*', '', 'Nach Verguetung:'];
    foreach ($rewardRows as $index => $row) {
        $lines[] = telegram_top_row_line($index, $row);
    }
    $lines[] = '';
    $lines[] = 'Nach Stundenlohn:';
    foreach ($hourlyRows as $index => $row) {
        $lines[] = telegram_top_row_line($index, $row);
    }

    return implode("\n", $lines);
}

function telegram_stats_message(PDO $pdo): string {
    $counts = telegram_status_counts($pdo, null, null);
    $total = array_sum($counts);
    $approved = (int)($counts['APPROVED'] ?? 0);
    $pending = (int)($counts['AWAITING REVIEW'] ?? 0);
    $rejected = (int)($counts['REJECTED'] ?? 0) + (int)($counts['RETURNED'] ?? 0);

    return implode("\n", [
        '*Status\\-Verteilung*',
        '',
        'Approved: ' . tg_escape((string)$approved),
        'Awaiting Review: ' . tg_escape((string)$pending),
        'Screened Out: ' . tg_escape((string)(($counts['SCREENED OUT'] ?? 0) + ($counts['SCREENED-OUT'] ?? 0))),
        'Returned: ' . tg_escape((string)($counts['RETURNED'] ?? 0)),
        'Rejected: ' . tg_escape((string)($counts['REJECTED'] ?? 0)),
        '',
        'Approval\\-Rate: ' . telegram_fmt_percent(telegram_percent($approved, $total)),
        'Reject\\-Rate: ' . telegram_fmt_percent(telegram_percent($rejected, $total)),
        'Pending\\-Rate: ' . telegram_fmt_percent(telegram_percent($pending, $total)),
    ]);
}

function telegram_sync_message(PDO $pdo): string {
    $lastSyncAt = get_setting('lastSyncAt');
    $lastOk = telegram_latest_event($pdo, ['sync_ok']);
    $lastError = telegram_latest_event($pdo, ['sync_error']);
    $webhook = telegram_get_webhook_info();

    return implode("\n", [
        '*Sync\\-Status*',
        '',
        'Letzter Sync: ' . tg_escape(telegram_relative_time($lastSyncAt)),
        'Letzter Erfolg: ' . tg_escape(telegram_relative_time($lastOk['timestamp'] ?? null)),
        'Letzter Fehler: ' . tg_escape((string)($lastError['message'] ?? 'keiner')),
        'Webhook: ' . tg_escape(!empty($webhook['ok']) ? 'OK' : 'Warnung'),
        'Pending Updates: ' . tg_escape((string)($webhook['pendingUpdateCount'] ?? 0)),
    ]);
}

function telegram_export_message(): string {
    return "CSV\\-Export:\n" . tg_escape('/api/export.php?type=submissions&format=csv');
}

function telegram_last_message(PDO $pdo): string {
    $stmt = $pdo->query("
        SELECT study_name, status, reward_currency, " . effective_reward_amount_sql() . " effective_reward_minor, completed_at
        FROM submissions
        ORDER BY COALESCE(completed_at, started_at, updated_at) DESC
        LIMIT 5
    ");
    $rows = $stmt->fetchAll();
    if (!$rows) {
        return 'Noch keine Teilnahmen vorhanden\\.';
    }

    $lines = ['*Letzte Teilnahmen*', ''];
    foreach ($rows as $row) {
        $lines[] = '*'. tg_escape((string)($row['study_name'] ?? 'Ohne Namen')) . '*';
        $lines[] = tg_escape((string)($row['status'] ?? 'UNKNOWN')) . ' \\| '
            . telegram_fmt_amount((int)($row['effective_reward_minor'] ?? 0), (string)($row['reward_currency'] ?? 'GBP'))
            . ' \\| ' . tg_escape(telegram_relative_time($row['completed_at'] ?? null));
    }

    return implode("\n", $lines);
}

function telegram_compare_message(PDO $pdo): string {
    $periods = telegram_current_periods();
    $current = telegram_sum_by_period($pdo, telegram_earned_statuses(), $periods['monthStart'], null);
    $previous = telegram_sum_by_period($pdo, telegram_earned_statuses(), $periods['lastMonthStart'], $periods['monthStart']);
    $currentGbp = (int)($current['GBP'] ?? 0);
    $previousGbp = (int)($previous['GBP'] ?? 0);
    $delta = $currentGbp - $previousGbp;
    $percent = $previousGbp > 0 ? round(($delta / $previousGbp) * 100, 1) : null;

    return implode("\n", [
        '*Monatsvergleich*',
        '',
        'Aktuell: ' . telegram_fmt_money_map($current),
        'Vormonat: ' . telegram_fmt_money_map($previous),
        'Delta: ' . telegram_fmt_amount($delta, 'GBP') . ' \\| ' . telegram_fmt_percent($percent),
    ]);
}

function telegram_heatmap_message(PDO $pdo): string {
    $periods = telegram_current_periods();
    $rows = telegram_daily_rows($pdo, $periods['monthStart'], (clone $periods['today'])->modify('+1 day'));
    $lines = ['*Heatmap ' . tg_escape($periods['monthStart']->format('Y-m')) . '*', ''];
    foreach ($rows as $row) {
        $lines[] = tg_escape(substr((string)$row['day'], -2)) . ': ' . telegram_fmt_money_map([$row['reward_currency'] => (int)$row['total']]);
    }

    return implode("\n", $lines);
}

function telegram_week_message(PDO $pdo): string {
    $periods = telegram_current_periods();
    return implode("\n", [
        '*Aktuelle Woche*',
        '',
        'Verdient: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, telegram_earned_statuses(), $periods['weekStart'], null)),
        'Pending: ' . telegram_fmt_money_map(telegram_sum_by_period($pdo, telegram_pending_statuses(), $periods['weekStart'], null)),
        'Teilnahmen: ' . tg_escape((string)telegram_count_submissions_since($pdo, $periods['weekStart']->format('Y-m-d H:i:s'))),
    ]);
}

function telegram_setgoal_message(array $args): string {
    $scope = strtolower((string)($args[0] ?? ''));
    $amountMinor = telegram_parse_eur_minor($args[1] ?? null);
    if (!in_array($scope, ['day', 'month'], true) || $amountMinor === null) {
        return 'Nutzung: /setgoal day\\|month <betrag>';
    }

    $settings = telegram_load_dashboard_settings();
    $eurKey = $scope === 'day' ? 'daily_eur_minor' : 'monthly_eur_minor';
    $gbpKey = $scope === 'day' ? 'daily_gbp_minor' : 'monthly_gbp_minor';
    $settings['goals'][$eurKey] = $amountMinor;
    $gbpMinor = telegram_eur_to_gbp_minor($amountMinor);
    if ($gbpMinor !== null) {
        $settings['goals'][$gbpKey] = $gbpMinor;
    }
    set_setting('dashboardGoals', $settings['goals']);

    return 'Gespeichert: ' . tg_escape($scope) . ' Ziel ' . telegram_fmt_amount($amountMinor, 'EUR');
}

function telegram_sethourly_message(array $args): string {
    $scope = strtolower((string)($args[0] ?? ''));
    $amountMinor = telegram_parse_eur_minor($args[1] ?? null);
    if (!in_array($scope, ['good', 'ok'], true) || $amountMinor === null) {
        return 'Nutzung: /sethourly good\\|ok <betrag>';
    }

    $settings = telegram_load_dashboard_settings();
    $eurKey = $scope === 'good' ? 'great_hourly_eur_minor' : 'ok_hourly_eur_minor';
    $gbpKey = $scope === 'good' ? 'great_hourly_gbp_minor' : 'ok_hourly_gbp_minor';
    $settings['thresholds'][$eurKey] = $amountMinor;
    $gbpMinor = telegram_eur_to_gbp_minor($amountMinor);
    if ($gbpMinor !== null) {
        $settings['thresholds'][$gbpKey] = $gbpMinor;
    }
    set_setting('dashboardThresholds', $settings['thresholds']);

    return 'Gespeichert: ' . tg_escape($scope) . ' Stundenlohn ' . telegram_fmt_amount($amountMinor, 'EUR') . '/h';
}

function telegram_report_message(array $args): string {
    $mode = strtolower((string)($args[0] ?? ''));
    $preferences = telegram_preferences();
    if ($mode === 'off') {
        $preferences['report'] = ['enabled' => false, 'time' => $preferences['report']['time'] ?? '20:00'];
        set_setting('telegramPreferences', $preferences);
        return 'Telegram\\-Tagesbericht deaktiviert\\.';
    }

    $time = (string)($args[1] ?? '');
    if ($mode !== 'on' || !preg_match('/^\d{2}:\d{2}$/', $time)) {
        return 'Nutzung: /report on <HH:MM> oder /report off';
    }

    $preferences['report'] = ['enabled' => true, 'time' => $time];
    set_setting('telegramPreferences', $preferences);
    return 'Telegram\\-Tagesbericht aktiviert um ' . tg_escape($time) . '\\.';
}

function telegram_mute_message(array $args): string {
    $duration = strtolower((string)($args[0] ?? ''));
    $seconds = telegram_duration_seconds($duration);
    if ($seconds === null) {
        return 'Nutzung: /mute <dauer>, z\\.B\\. 30m, 2h oder 1d';
    }

    $until = (new DateTime('now', new DateTimeZone(date_default_timezone_get())))->modify('+' . $seconds . ' seconds');
    $preferences = telegram_preferences();
    $preferences['muted_until'] = $until->format(DateTimeInterface::ATOM);
    set_setting('telegramPreferences', $preferences);

    return 'Telegram\\-Meldungen pausiert bis ' . tg_escape($until->format('Y-m-d H:i')) . '\\.';
}

function telegram_unmute_message(): string {
    $preferences = telegram_preferences();
    unset($preferences['muted_until']);
    set_setting('telegramPreferences', $preferences);

    return 'Telegram\\-Pause aufgehoben\\.';
}

function telegram_delete_logs_message(PDO $pdo, ?int $currentUpdateId = null): string {
    if ($currentUpdateId !== null && $currentUpdateId > 0) {
        $stmt = $pdo->prepare('DELETE FROM telegram_messages WHERE update_id <> ?');
        $stmt->execute([$currentUpdateId]);
    } else {
        $pdo->exec('DELETE FROM telegram_messages');
    }

    return 'Telegram\\-Nachrichtenlog geloescht\\.';
}

function telegram_relative_time($timestamp): string {
    if (!is_string($timestamp) || trim($timestamp) === '') {
        return 'nie';
    }
    try {
        $then = new DateTime($timestamp);
        $now = new DateTime('now', new DateTimeZone(date_default_timezone_get()));
    } catch (Throwable $e) {
        return 'unbekannt';
    }
    $diff = max(0, $now->getTimestamp() - $then->getTimestamp());
    if ($diff < 60) {
        return 'gerade eben';
    }
    $minutes = intdiv($diff, 60);
    if ($minutes < 60) {
        return 'vor ' . $minutes . ' Min';
    }
    $hours = intdiv($minutes, 60);
    if ($hours < 24) {
        return 'vor ' . $hours . ' Std';
    }
    return 'vor ' . intdiv($hours, 24) . ' Tg';
}

function telegram_sync_is_stale($timestamp): bool {
    if (!is_string($timestamp) || trim($timestamp) === '') {
        return true;
    }
    try {
        $then = new DateTime($timestamp);
        $now = new DateTime('now', new DateTimeZone(date_default_timezone_get()));
    } catch (Throwable $e) {
        return true;
    }
    return ($now->getTimestamp() - $then->getTimestamp()) > 30 * 60;
}

function telegram_sum_by_period(PDO $pdo, array $statuses, ?DateTime $from, ?DateTime $to): array {
    $placeholders = implode(',', array_fill(0, count($statuses), '?'));
    $rewardExpr = effective_reward_amount_sql();
    $sql = "SELECT reward_currency, SUM({$rewardExpr}) total FROM submissions WHERE status IN ($placeholders)";
    $params = $statuses;
    if ($from) {
        $sql .= ' AND completed_at >= ?';
        $params[] = $from->format('Y-m-d H:i:s');
    }
    if ($to) {
        $sql .= ' AND completed_at < ?';
        $params[] = $to->format('Y-m-d H:i:s');
    }
    $sql .= ' GROUP BY reward_currency';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $result = [];
    foreach ($stmt->fetchAll() as $row) {
        if (!empty($row['reward_currency'])) {
            $result[(string)$row['reward_currency']] = (int)$row['total'];
        }
    }
    return $result;
}

function telegram_sum_by_started_period(PDO $pdo, array $statuses, ?DateTime $from, ?DateTime $to): array {
    $placeholders = implode(',', array_fill(0, count($statuses), '?'));
    $rewardExpr = effective_reward_amount_sql();
    $sql = "SELECT reward_currency, SUM({$rewardExpr}) total FROM submissions WHERE status IN ($placeholders)";
    $params = $statuses;
    if ($from) {
        $sql .= ' AND COALESCE(started_at, completed_at) >= ?';
        $params[] = $from->format('Y-m-d H:i:s');
    }
    if ($to) {
        $sql .= ' AND COALESCE(started_at, completed_at) < ?';
        $params[] = $to->format('Y-m-d H:i:s');
    }
    $sql .= ' GROUP BY reward_currency';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $result = [];
    foreach ($stmt->fetchAll() as $row) {
        if (!empty($row['reward_currency'])) {
            $result[(string)$row['reward_currency']] = (int)$row['total'];
        }
    }
    return $result;
}

function telegram_extract_balance(array $balance): array {
    $available = telegram_extract_currency_map($balance['approved_per_currency'] ?? [], true);
    $pending = telegram_extract_currency_map($balance['pending_per_currency'] ?? [], true);
    if (empty($available) && isset($balance['total_gbp'])) {
        telegram_merge_currency_map($available, ['GBP' => $balance['total_gbp']], true);
    }
    if (empty($pending) && isset($balance['total_pending_gbp'])) {
        telegram_merge_currency_map($pending, ['GBP' => $balance['total_pending_gbp']], true);
    }

    return ['available' => $available, 'pending' => $pending];
}

function telegram_merge_currency_map(array &$target, $source, bool $forceMinor = false): void {
    foreach (telegram_extract_currency_map($source, $forceMinor) as $currency => $amount) {
        $target[$currency] = ($target[$currency] ?? 0) + $amount;
    }
}

function telegram_extract_currency_map($source, bool $forceMinor = false): array {
    if (is_string($source)) {
        $decoded = json_decode($source, true);
        $source = is_array($decoded) ? $decoded : [];
    }
    if (!is_array($source)) {
        return [];
    }

    $result = [];
    foreach ($source as $currency => $amount) {
        if (is_array($amount)) {
            $currency = $amount['currency'] ?? $currency;
            $amount = $amount['amount_minor'] ?? $amount['value_minor'] ?? $amount['total_minor'] ?? $amount['amount'] ?? null;
        }
        if ($amount === null || $amount === '') {
            continue;
        }
        $minor = $forceMinor ? (int)round((float)$amount) : (int)round((float)$amount * 100);
        $key = strtoupper((string)$currency);
        $result[$key] = ($result[$key] ?? 0) + $minor;
    }
    return $result;
}

function telegram_fmt_money_map(array $amounts): string {
    $amounts = array_filter($amounts, static fn($amount) => (int)$amount !== 0);
    if (empty($amounts)) {
        return '\\-';
    }
    $order = ['GBP' => 0, 'USD' => 1, 'EUR' => 2];
    uksort($amounts, static fn($a, $b) => ($order[$a] ?? 99) <=> ($order[$b] ?? 99) ?: strcmp($a, $b));

    $parts = [];
    foreach ($amounts as $currency => $minor) {
        $parts[] = telegram_fmt_amount((int)$minor, (string)$currency);
    }
    return implode(' \\+ ', $parts);
}

function telegram_fmt_amount(int $minor, string $currency): string {
    $symbols = ['GBP' => '£', 'USD' => '$', 'EUR' => '€'];
    $currency = strtoupper($currency);
    $symbol = $symbols[$currency] ?? $currency . ' ';

    return tg_escape($symbol . number_format($minor / 100, 2, ',', '.'));
}

function telegram_fmt_percent($value): string {
    if (!is_numeric($value)) {
        return '\\-';
    }
    return tg_escape(number_format((float)$value, 1, ',', '.') . ' %');
}

function telegram_quote_message(PDO $pdo): string {
    $stats = telegram_build_quote_stats($pdo);
    if ((int)$stats['sampleCount'] === 0) {
        return "*Quoten \\(letzte 30 Tage\\)*\n\nKeine passenden Studien im Auswertungszeitraum\\.";
    }

    $successDenominator = (int)$stats['accepted'] + (int)$stats['missed'];
    $successRate = $successDenominator > 0 ? ((int)$stats['accepted'] / $successDenominator) * 100 : null;
    $earningRate = $stats['fxComplete'] && $stats['possibleGbpMinor'] > 0
        ? ($stats['actualGbpMinor'] / $stats['possibleGbpMinor']) * 100
        : null;

    return implode("\n", [
        '*Quoten \\(letzte 30 Tage\\)*',
        '',
        'Erfolgsquote: ' . telegram_fmt_percent($successRate),
        tg_escape((string)$stats['accepted']) . '/' . tg_escape((string)$successDenominator) . ' Studien angenommen',
        '\\(\\+ ' . tg_escape((string)$stats['returned']) . ' zurueckgegeben\\)',
        '',
        'Verdienst\\-Quote: ' . (!$stats['fxComplete'] ? 'nicht berechenbar \\(FX\\-Rate fehlt\\)' : telegram_fmt_percent($earningRate)),
        telegram_fmt_money_map($stats['actualByCurrency']) . ' von ' . telegram_fmt_money_map($stats['possibleByCurrency']) . ' moeglich',
    ]);
}

function telegram_build_quote_stats(PDO $pdo): array {
    $from = (new DateTime('now', new DateTimeZone(date_default_timezone_get())))->modify('-30 days')->setTime(0, 0, 0);
    $studyStmt = $pdo->prepare("
        SELECT id, reward_minor, reward_currency
        FROM studies
        WHERE first_seen >= ?
          AND reward_minor > 0
          AND reward_minor IS NOT NULL
        ORDER BY first_seen DESC
    ");
    $studyStmt->execute([$from->format('Y-m-d H:i:s')]);
    $studies = $studyStmt->fetchAll();
    $studyIds = array_values(array_filter(array_map(static fn($study): string => (string)($study['id'] ?? ''), $studies)));
    $submissionsByStudy = telegram_quote_submissions_by_study($pdo, $studyIds);
    $actualByCurrency = [];
    $possibleByCurrency = [];
    $accepted = 0;
    $missed = 0;
    $returned = 0;

    foreach ($studies as $study) {
        $studyId = (string)($study['id'] ?? '');
        $currency = strtoupper((string)($study['reward_currency'] ?? 'GBP'));
        $possibleMinor = (int)($study['reward_minor'] ?? 0);
        $submission = $submissionsByStudy[$studyId] ?? null;
        $status = $submission ? telegram_normalize_status((string)($submission['status'] ?? '')) : '';
        $actualMinor = $submission ? (int)($submission['effective_reward_minor'] ?? 0) : 0;

        if ($status === 'RETURNED') {
            $returned++;
            continue;
        } elseif (in_array($status, ['REJECTED', 'TIMED OUT', 'TIMED-OUT'], true)) {
            continue;
        } elseif (in_array($status, ['APPROVED', 'AWAITING REVIEW', 'SCREENED OUT', 'SCREENED-OUT'], true)) {
            $accepted++;
        } elseif ($status === '') {
            $missed++;
        }

        if (in_array($status, ['SCREENED OUT', 'SCREENED-OUT'], true)) {
            $possibleMinor = $actualMinor;
        }
        $possibleByCurrency[$currency] = ($possibleByCurrency[$currency] ?? 0) + $possibleMinor;
        if (in_array($status, ['APPROVED', 'SCREENED OUT', 'SCREENED-OUT'], true) && $actualMinor > 0) {
            $actualCurrency = strtoupper((string)($submission['reward_currency'] ?? $currency));
            $actualByCurrency[$actualCurrency] = ($actualByCurrency[$actualCurrency] ?? 0) + $actualMinor;
        }
    }

    $actualGbpMinor = telegram_currency_map_to_gbp_minor($actualByCurrency, telegram_normalize_fx_rates(get_setting('fxRates')));
    $possibleGbpMinor = telegram_currency_map_to_gbp_minor($possibleByCurrency, telegram_normalize_fx_rates(get_setting('fxRates')));

    return [
        'sampleCount' => count($studies),
        'accepted' => $accepted,
        'missed' => $missed,
        'returned' => $returned,
        'actualByCurrency' => $actualByCurrency,
        'possibleByCurrency' => $possibleByCurrency,
        'actualGbpMinor' => $actualGbpMinor,
        'possibleGbpMinor' => $possibleGbpMinor,
        'fxComplete' => $actualGbpMinor !== null && $possibleGbpMinor !== null,
    ];
}

function telegram_quote_submissions_by_study(PDO $pdo, array $studyIds): array {
    if (empty($studyIds)) {
        return [];
    }
    $placeholders = implode(',', array_fill(0, count($studyIds), '?'));
    $rewardExpr = effective_reward_amount_sql();
    $stmt = $pdo->prepare("SELECT study_id, status, reward_currency, {$rewardExpr} AS effective_reward_minor FROM submissions WHERE study_id IN ($placeholders)");
    $stmt->execute($studyIds);
    $result = [];
    foreach ($stmt->fetchAll() as $row) {
        $studyId = (string)($row['study_id'] ?? '');
        $priority = telegram_quote_submission_priority((string)($row['status'] ?? ''));
        $existing = $result[$studyId] ?? null;
        $existingPriority = $existing ? telegram_quote_submission_priority((string)($existing['status'] ?? '')) : 0;
        if ($studyId !== '' && $priority > $existingPriority) {
            $result[$studyId] = $row;
        }
    }
    return $result;
}

function telegram_quote_submission_priority(string $status): int {
    return match (telegram_normalize_status($status)) {
        'APPROVED' => 40,
        'AWAITING REVIEW' => 30,
        'SCREENED OUT', 'SCREENED-OUT' => 20,
        'RETURNED' => 10,
        'REJECTED' => 5,
        'TIMED OUT', 'TIMED-OUT' => 5,
        default => 0,
    };
}

function telegram_normalize_status(string $status): string {
    return strtoupper(str_replace('_', ' ', trim($status)));
}

function telegram_normalize_fx_rates($fxRates): array {
    if (is_string($fxRates)) {
        $decoded = json_decode($fxRates, true);
        $fxRates = is_array($decoded) ? $decoded : [];
    }
    $rates = is_array($fxRates) ? ($fxRates['rates'] ?? $fxRates) : [];
    return ['base' => strtoupper((string)($fxRates['base'] ?? 'GBP')), 'rates' => is_array($rates) ? $rates : []];
}

function telegram_currency_map_to_gbp_minor(array $amounts, array $fxRates): ?int {
    $total = 0;
    foreach ($amounts as $currency => $minor) {
        $currency = strtoupper((string)$currency);
        if ($currency === 'GBP') {
            $total += (int)$minor;
            continue;
        }
        $rate = telegram_fx_rate($fxRates, $currency);
        if ($rate === null || $rate <= 0) {
            return null;
        }
        $total += (int)round((int)$minor / $rate);
    }
    return $total;
}

function telegram_fx_rate(array $fxRates, string $currency) {
    $rates = $fxRates['rates'] ?? [];
    $rate = $rates[strtoupper($currency)] ?? $rates[strtolower($currency)] ?? null;
    return is_numeric($rate) && (float)$rate > 0 ? (float)$rate : null;
}

function telegram_current_periods(): array {
    $tz = new DateTimeZone(date_default_timezone_get());
    $now = new DateTime('now', $tz);
    $today = (clone $now)->setTime(0, 0, 0);
    $weekStart = (clone $today)->modify('Monday this week');
    if ($weekStart > $today) {
        $weekStart->modify('-7 days');
    }
    $monthStart = (clone $today)->modify('first day of this month')->setTime(0, 0, 0);
    return [
        'now' => $now,
        'today' => $today,
        'weekStart' => $weekStart,
        'monthStart' => $monthStart,
        'lastMonthStart' => (clone $monthStart)->modify('-1 month'),
    ];
}

function telegram_earned_statuses(): array {
    return ['APPROVED', 'SCREENED OUT', 'SCREENED-OUT'];
}

function telegram_pending_statuses(): array {
    return ['AWAITING REVIEW'];
}

function telegram_load_dashboard_settings(): array {
    global $config;
    $goals = get_setting('dashboardGoals', []);
    $thresholds = get_setting('dashboardThresholds', []);
    return [
        'goals' => is_array($goals) ? array_merge([
            'daily_gbp_minor' => (int)($config['goals']['daily_gbp_minor'] ?? 500),
            'monthly_gbp_minor' => (int)($config['goals']['monthly_gbp_minor'] ?? 15000),
        ], $goals) : [],
        'thresholds' => is_array($thresholds) ? array_merge([
            'great_hourly_gbp_minor' => 1200,
            'ok_hourly_gbp_minor' => 800,
        ], $thresholds) : [],
    ];
}

function telegram_parse_eur_minor($value): ?int {
    $normalized = telegram_normalize_decimal_text($value);
    if ($normalized === null) {
        return null;
    }
    return (int)round(((float)$normalized) * 100);
}

function telegram_eur_to_gbp_minor(int $eurMinor): ?int {
    $fxRates = telegram_normalize_fx_rates(get_setting('fxRates'));
    $rate = telegram_fx_rate($fxRates, 'EUR');

    if ($rate === null || $rate <= 0) {
        return null;
    }

    return (int)round($eurMinor / $rate);
}

function telegram_normalize_decimal_text($value): ?string {
    if ($value === null || $value === '') {
        return null;
    }
    $normalized = str_replace(',', '.', trim((string)$value));
    if (!is_numeric($normalized) || (float)$normalized < 0) {
        return null;
    }
    return number_format((float)$normalized, 2, '.', '');
}

function telegram_preferences(): array {
    $preferences = get_setting('telegramPreferences', []);
    return is_array($preferences) ? $preferences : [];
}

function telegram_duration_seconds(string $duration): ?int {
    $normalized = strtolower(trim($duration));

    if ($normalized === 'today') {
        $now = new DateTime('now', new DateTimeZone(date_default_timezone_get()));
        $end = (clone $now)->modify('tomorrow')->setTime(0, 0, 0);
        return max(60, $end->getTimestamp() - $now->getTimestamp());
    }

    if (!preg_match('/^(\d+)\s*([mhd])$/', $normalized, $matches)) {
        return null;
    }
    $value = (int)$matches[1];
    return match ($matches[2]) {
        'm' => $value * 60,
        'h' => $value * 3600,
        'd' => $value * 86400,
        default => null,
    };
}

function telegram_sum_maps(array $a, array $b): array {
    $result = $a;
    foreach ($b as $currency => $minor) {
        $result[$currency] = (int)($result[$currency] ?? 0) + (int)$minor;
    }
    ksort($result);
    return $result;
}

function telegram_goal_line(int $earnedMinor, int $targetMinor): string {
    $percent = $targetMinor > 0 ? round(($earnedMinor / $targetMinor) * 100, 1) : null;
    $remaining = max(0, $targetMinor - $earnedMinor);
    return telegram_fmt_amount($earnedMinor, 'GBP') . ' von ' . telegram_fmt_amount($targetMinor, 'GBP')
        . ' \\| ' . telegram_fmt_percent($percent) . ' \\| offen ' . telegram_fmt_amount($remaining, 'GBP');
}

function telegram_month_projection(int $earnedGbpMinor, DateTime $now): int {
    $day = max(1, (int)$now->format('j'));
    $days = max(1, (int)$now->format('t'));
    return (int)round(($earnedGbpMinor / $day) * $days);
}

function telegram_pending_summary(PDO $pdo): array {
    $pendingStatuses = telegram_pending_statuses();
    $placeholders = implode(',', array_fill(0, count($pendingStatuses), '?'));
    $rewardExpr = effective_reward_amount_sql();
    $stmt = $pdo->prepare("
        SELECT reward_currency, COUNT(*) cnt, SUM({$rewardExpr}) total, MIN(completed_at) oldest_completed_at
        FROM submissions
        WHERE status IN ($placeholders)
        GROUP BY reward_currency
    ");
    $stmt->execute($pendingStatuses);
    $count = 0;
    $total = [];
    $oldest = null;
    foreach ($stmt->fetchAll() as $row) {
        $count += (int)$row['cnt'];
        if (!empty($row['reward_currency'])) {
            $total[(string)$row['reward_currency']] = (int)$row['total'];
        }
        if (!empty($row['oldest_completed_at']) && ($oldest === null || $row['oldest_completed_at'] < $oldest)) {
            $oldest = $row['oldest_completed_at'];
        }
    }
    return [
        'count' => $count,
        'total' => $total,
        'oldestCompletedAt' => $oldest,
        'olderThan7Days' => telegram_count_pending_older_than($pdo, '-7 days'),
        'olderThan14Days' => telegram_count_pending_older_than($pdo, '-14 days'),
    ];
}

function telegram_count_pending_older_than(PDO $pdo, string $modifier): int {
    $threshold = (new DateTime('now', new DateTimeZone(date_default_timezone_get())))->modify($modifier);
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM submissions WHERE status = 'AWAITING REVIEW' AND completed_at IS NOT NULL AND completed_at < ?");
    $stmt->execute([$threshold->format('Y-m-d H:i:s')]);
    return (int)$stmt->fetchColumn();
}

function telegram_status_counts(PDO $pdo, ?DateTime $from, ?DateTime $to): array {
    $sql = 'SELECT status, COUNT(*) cnt FROM submissions WHERE 1 = 1';
    $params = [];
    if ($from) {
        $sql .= ' AND completed_at >= ?';
        $params[] = $from->format('Y-m-d H:i:s');
    }
    if ($to) {
        $sql .= ' AND completed_at < ?';
        $params[] = $to->format('Y-m-d H:i:s');
    }
    $sql .= ' GROUP BY status';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $counts = [];
    foreach ($stmt->fetchAll() as $row) {
        $counts[(string)($row['status'] ?: 'UNKNOWN')] = (int)$row['cnt'];
    }
    return $counts;
}

function telegram_percent(int $part, int $total): float {
    return $total > 0 ? round(($part / $total) * 100, 1) : 0.0;
}

function telegram_latest_event(PDO $pdo, array $types): ?array {
    $placeholders = implode(',', array_fill(0, count($types), '?'));
    $stmt = $pdo->prepare("SELECT * FROM events WHERE type IN ($placeholders) ORDER BY timestamp DESC, id DESC LIMIT 1");
    $stmt->execute($types);
    $row = $stmt->fetch();
    return $row ?: null;
}

function telegram_count_submissions_since(PDO $pdo, string $fromSql): int {
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM submissions WHERE started_at >= ? OR completed_at >= ?');
    $stmt->execute([$fromSql, $fromSql]);
    return (int)$stmt->fetchColumn();
}

function telegram_top_rows(PDO $pdo, string $sort): array {
    $statuses = telegram_earned_statuses();
    $placeholders = implode(',', array_fill(0, count($statuses), '?'));
    $rewardExpr = effective_reward_amount_sql('s');
    $limitSql = $sort === 'hourly' ? '' : 'LIMIT 5';
    $stmt = $pdo->prepare("
        SELECT COALESCE(NULLIF(s.study_name, ''), s.study_id) name,
               s.status,
               s.reward_currency,
               {$rewardExpr} reward_minor,
               s.time_taken_seconds,
               st.estimated_minutes
        FROM submissions s
        LEFT JOIN studies st ON st.id = s.study_id
        WHERE s.status IN ($placeholders)
          AND {$rewardExpr} > 0
        ORDER BY {$rewardExpr} DESC
        $limitSql
    ");
    $stmt->execute($statuses);
    $rows = $stmt->fetchAll();

    if ($sort !== 'hourly') {
        return $rows;
    }

    foreach ($rows as &$row) {
        // Owner rule: raw <=0 oder SCREENED OUT raw<60 => 60 Sekunden.
        $row['effective_time_seconds'] = effective_time_seconds($row);
    }
    unset($row);

    usort($rows, static function (array $a, array $b): int {
        $aSeconds = max(1, (int)($a['effective_time_seconds'] ?? 0));
        $bSeconds = max(1, (int)($b['effective_time_seconds'] ?? 0));
        $aHourly = ((int)($a['reward_minor'] ?? 0) * 3600) / $aSeconds;
        $bHourly = ((int)($b['reward_minor'] ?? 0) * 3600) / $bSeconds;

        return $bHourly <=> $aHourly;
    });

    return array_slice($rows, 0, 5);
}

function telegram_top_row_line(int $index, array $row): string {
    $reward = telegram_fmt_amount((int)($row['reward_minor'] ?? 0), (string)($row['reward_currency'] ?? 'GBP'));
    $seconds = (int)($row['effective_time_seconds'] ?? null);
    if ($seconds <= 0) {
        $seconds = effective_time_seconds($row);
    }
    $hourly = $seconds > 0
        ? telegram_fmt_amount((int)round(((int)$row['reward_minor'] * 3600) / $seconds), (string)($row['reward_currency'] ?? 'GBP')) . '/h'
        : '\\-';
    return ($index + 1) . '\\. ' . tg_escape((string)($row['name'] ?? 'Ohne Namen')) . ' \\| ' . $reward . ' \\| ' . $hourly;
}

function telegram_daily_rows(PDO $pdo, DateTime $from, DateTime $to): array {
    $statuses = telegram_earned_statuses();
    $placeholders = implode(',', array_fill(0, count($statuses), '?'));
    $rewardExpr = effective_reward_amount_sql();
    $params = $statuses;
    $params[] = $from->format('Y-m-d H:i:s');
    $params[] = $to->format('Y-m-d H:i:s');
    $stmt = $pdo->prepare("
        SELECT DATE(completed_at) day, reward_currency, SUM({$rewardExpr}) total
        FROM submissions
        WHERE status IN ($placeholders)
          AND completed_at >= ?
          AND completed_at < ?
        GROUP BY DATE(completed_at), reward_currency
        ORDER BY day ASC
    ");
    $stmt->execute($params);
    return $stmt->fetchAll();
}
