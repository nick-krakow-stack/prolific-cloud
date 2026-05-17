<?php
/**
 * Prolific Watcher - Konfiguration
 *
 * ANLEITUNG:
 * 1. Diese Datei zu "config.php" kopieren (Originalname behalten!)
 * 2. Werte unten ausfüllen - alle Felder mit "HIER_..." müssen ersetzt werden!
 * 3. hash-generator.php aufrufen - das erzeugt 4 Werte:
 *      (A) Passwort-Hash    → dashboard.password_hash
 *      (B) API-Key          → api_key
 *      (C) Session-Secret   → session_secret
 *      (D) Webhook-Secret   → telegram.webhook_secret
 * 4. Niemals ins Git/öffentlich!
 *
 * Die .htaccess schützt config.php vor direktem Web-Zugriff.
 */

return [
    // ============================================================
    //   DATENBANK (All-Inkl MariaDB)
    // ============================================================
    'db' => [
        'host'     => 'localhost',
        'name'     => 'd0471756',     // Datenbankname
        'user'     => 'd0471756',     // Datenbank-Login
        'password' => 'HIER_DEIN_DB_PASSWORT',
        'charset'  => 'utf8mb4',
    ],

    // ============================================================
    //   (B) API-KEY fürs Plugin
    //   Aus hash-generator.php → "API-Key" einfügen
    // ============================================================
    'api_key' => 'HIER_API_KEY_AUS_HASH_GENERATOR_EINFUEGEN',

    // ============================================================
    //   (A) DASHBOARD-LOGIN
    //   Username frei wählbar. Passwort-Hash aus hash-generator.php
    //   → "Passwort-Hash" einfügen.
    // ============================================================
    'dashboard' => [
        'username'      => 'nick',
        'password_hash' => 'HIER_PASSWORT_HASH_AUS_HASH_GENERATOR_EINFUEGEN',
    ],

    // ============================================================
    //   (C) SESSION-SECRET
    //   Aus hash-generator.php → "Session-Secret" einfügen
    // ============================================================
    'session_secret' => 'HIER_SESSION_SECRET_AUS_HASH_GENERATOR_EINFUEGEN',

    // ============================================================
    //   TELEGRAM-BOT
    //   Bot-Token und Chat-ID kommen von Telegram. Webhook-Secret
    //   aus hash-generator.php → "Webhook-Secret" einfügen.
    // ============================================================
    'telegram' => [
        'bot_token'       => 'HIER_TELEGRAM_BOT_TOKEN_EINFUEGEN',
        'allowed_chat_id' => 'HIER_DEINE_CHAT_ID_EINFUEGEN',
        'webhook_secret'  => 'HIER_WEBHOOK_SECRET_AUS_HASH_GENERATOR_EINFUEGEN',
    ],

    // ============================================================
    //   OPTIONEN (müssen normalerweise nicht angepasst werden)
    // ============================================================
    'timezone'           => 'Europe/Berlin',
    'session_lifetime'   => 30 * 24 * 60 * 60,  // 30 Tage „angemeldet bleiben"
    'log_failed_logins'  => true,                // Failed Logins in DB loggen

    // ---- Ziele fürs Dashboard (Minor Units: 500 = GBP 5.00) ----
    'goals' => [
        'daily_gbp_minor'   => 500,
        'monthly_gbp_minor' => 15000,
    ],

    // ---- Debug ----
    // Im Produktivbetrieb auf false stellen!
    'debug' => false,
];
