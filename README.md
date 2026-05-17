# Prolific Watcher - Cloud-Dashboard

PHP/MySQL-Backend mit Dashboard für All-Inkl-Webspace. Empfängt Daten vom Chrome-Plugin
und stellt sie über ein mobil-taugliches Web-Dashboard dar.

## Verzeichnisstruktur

```
prolific-cloud/
├── .htaccess              # HTTPS, Security-Header, Schutz von config.php
├── config.example.php     # Vorlage für config.php
├── install.php            # Einmaliges DB-Setup
├── hash-generator.php     # Erzeugt Passwort-Hash + Zufallsstrings
├── api/
│   ├── _common.php        # gemeinsame Helpers
│   ├── sync.php           # POST-Endpoint fürs Plugin
│   └── data.php           # GET-Endpoint fürs Dashboard
└── dashboard/
    ├── session.php
    ├── index.php          # Login-Seite
    ├── app.php            # Dashboard
    ├── logout.php
    └── assets/
        ├── style.css
        └── app.js
```

## Installation auf All-Inkl

### 1. Dateien hochladen

Alle Dateien in das Verzeichnis der Sub-Domain `prolific.nickkrakow.de` hochladen
(per FTP/SFTP). Bei All-Inkl ist das typischerweise:

```
/www/htdocs/w021974e/prolific/
```

### 2. config.php anlegen

Auf dem Server: `config.example.php` zu `config.php` umbenennen/kopieren.

### 3. Geheimnisse generieren

Im Browser aufrufen: `https://prolific.nickkrakow.de/hash-generator.php`

- **Dashboard-Passwort** eingeben → Hash wird angezeigt
- **API-Key** und **Session-Secret** werden automatisch vorgeschlagen

Alle drei Werte in `config.php` eintragen.

### 4. DB-Zugangsdaten in config.php eintragen

```php
'db' => [
    'host'     => 'localhost',
    'name'     => 'd0471756',
    'user'     => 'd0471756',
    'password' => 'DEIN_DB_PASSWORT_HIER',
    'charset'  => 'utf8mb4',
],
```

### 5. Installation ausführen

Aufrufen: `https://prolific.nickkrakow.de/install.php`

Das Skript prüft die DB-Verbindung und legt alle Tabellen an.

### 6. Sicherheits-Bereinigung

**Wichtig**: Nach erfolgreicher Installation per FTP **diese Dateien löschen**:

- `install.php`
- `hash-generator.php`
- `config.example.php`

Diese sind nur für das Setup nötig.

### 7. Test

- Dashboard öffnen: `https://prolific.nickkrakow.de/dashboard/`
- Login mit dem in `config.php` gesetzten Benutzernamen + Passwort
- Dashboard sollte erscheinen, allerdings noch ohne Daten (Plugin-Sync kommt als nächstes)

## Plugin-Sync einrichten

Das Chrome-Plugin (Version 1.6.0+) muss mit folgenden Werten konfiguriert werden:

- **Endpoint-URL**: `https://prolific.nickkrakow.de/api/sync.php`
- **API-Key**: derselbe, wie in `config.php` unter `api_key` eingetragen

## Updates

Wenn das Plugin neue Felder synct: einfach die neuen Dateien per FTP überschreiben.
Die DB bleibt erhalten, das Schema-Update (falls nötig) wird über ein separates
`migrate.php`-Skript laufen (kommt mit Updates mit).

## Troubleshooting

### "Server nicht konfiguriert"
→ `config.php` existiert nicht oder ist nicht lesbar.

### "Datenbank nicht erreichbar"
→ DB-Zugangsdaten in `config.php` prüfen. Sind sie korrekt aus dem KAS übernommen?

### "Ungültiger API-Key"
→ Plugin und `config.php` müssen exakt denselben API-Key haben.

### Dashboard zeigt keine Daten
→ Prüfen, ob das Plugin sync't (siehe Plugin-Statusanzeige).
→ Im Dashboard unter "Log" sehen ob `sync_ok`-Events ankommen.

## Sicherheitshinweise

- **Niemals** `config.php` in ein öffentliches Git-Repo
- API-Key und Session-Secret sollten **mindestens 32 Zeichen** lang sein
- Dashboard-Passwort min. 12 Zeichen, möglichst zufällig
- Bei Verdacht auf kompromittierten API-Key: in `config.php` neuen erzeugen + im Plugin austauschen
