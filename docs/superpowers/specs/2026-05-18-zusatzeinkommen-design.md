# Zusatzeinkommen Design

Datum: 2026-05-18

## Ziel

Der neue Tab `Zusatzeinkommen` erfasst Chatmoderator-Arbeit unabhaengig von
Prolific. Er soll Arbeitszeiten, bezahlte Nachrichten, Wochenstufen,
Nachtbonus, optionale Sonderboni, Auszahlungsschwelle und Gebuehren berechnen.
Die Werte werden nur als zusaetzliche Einnahme angezeigt und duerfen Prolific-
Ziele, Prolific-Stundenloehne und Prolific-Summen nicht veraendern.

## Umfang

Enthalten:

- neuer Dashboard-Tab `Zusatzeinkommen`
- manuelles Nachtragen von Sessions mit Start, Ende und bezahlten Nachrichten
- Live-Tracking mit `Start` und `Stop`
- serverseitig persistierte aktive Session
- maximal eine aktive Session
- automatische Aufteilung ueber Wochenwechsel
- Wochenabrechnung Montag bis Sonntag
- Wochenstufen fuer normale Nachrichten
- Standard-Nachtbonus fuer 00:00 bis 07:00 Uhr
- optionaler Sonderbonus pro Session
- Editieren und Loeschen gespeicherter Sessions
- Dashboard-Kachel `Zusatzverdienste`
- Zusatzzeilen in den bestehenden Zielkarten `Heute` und `Aktueller Monat`

Nicht enthalten im ersten Schritt:

- separate Sondernachrichtentypen wie Likes, Flirts oder Matches
- Import aus Anbieter-Backends
- Charts oder grosse Wochenhistorie
- Einbindung in Prolific-Ziele oder Prolific-Stundenloehne

## Verguetungsregeln

Die Abrechnungswoche laeuft Montag 00:00 bis Sonntag 23:59:59.

Der normale Nachrichtensatz richtet sich nach der Gesamtzahl bezahlter normaler
Nachrichten in der Abrechnungswoche und gilt rueckwirkend fuer alle normalen
Nachrichten dieser Woche:

- 1-1000 Nachrichten: 0,12 EUR pro Nachricht
- 1001-1250 Nachrichten: 0,13 EUR pro Nachricht
- 1251-1500 Nachrichten: 0,14 EUR pro Nachricht
- 1501-2000 Nachrichten: 0,15 EUR pro Nachricht
- ab 2001 Nachrichten: 0,17 EUR pro Nachricht

Der Standard-Nachtbonus gilt von 00:00 bis 07:00 Uhr und betraegt 0,01 EUR pro
Nachricht. Er ist pro Session standardmaessig aktiv, kann aber deaktiviert
werden. Wenn eine Session nur teilweise im Nachtfenster liegt, werden die
Nacht-Nachrichten proportional zum Zeitanteil geschaetzt.

Jede Session kann einen optionalen Sonderbonus haben:

- `einmalig`: fester Bonusbetrag, wenn die Mindestnachrichten erreicht sind
- `fortlaufend`: Zusatzbetrag pro Nachricht, wenn die Mindestnachrichten
  erreicht sind

Der fortlaufende Bonus wirkt rueckwirkend auf alle Nachrichten der Session,
sobald die Mindestnachrichten erreicht sind. Unterhalb der Mindestnachrichten
wird kein Sonderbonus gezahlt.

Alle Geldwerte werden intern als Integer-Cents gespeichert und berechnet.

## Zeit- und Splitregeln

Eine Session speichert Startzeit, Endzeit und bezahlte Nachrichten.

Wenn eine Session eine Wochen-Grenze ueberschreitet, wird sie automatisch in
Wochenanteile aufgeteilt. Die Nachrichten werden proportional zur Arbeitszeit
verteilt. Es werden immer ganze Nachrichten gespeichert; alle Teile zusammen
muessen exakt die urspruengliche Nachrichtenzahl ergeben. Restnachrichten durch
Rundung gehen an den laengeren Zeitanteil.

Der Stundenlohn im Tab `Zusatzeinkommen` basiert auf Brutto vor
Auszahlungsgebuehren.

## Auszahlung

Unter 50 EUR Brutto gibt es keine Auszahlung. Nicht ausgezahlte abgeschlossene
Wochen werden gesammelt, bis der kumulierte Auszahlungsbetrag mindestens 50 EUR
erreicht.

Die Gebuehr wird auf den kumulierten Auszahlungsbetrag gerechnet, nicht auf
einzelne Wochen:

- 50-250 EUR: 5,00 EUR
- 251-500 EUR: 7,50 EUR
- 501-600 EUR: 10,00 EUR
- 601-1000 EUR: 12,50 EUR
- ab 1001 EUR: 15,00 EUR

Eine Auszahlung darf nur abgeschlossene Wochen bis zum vorherigen Sonntag
umfassen. Die laufende Woche wird niemals durch `Als ausgezahlt markieren`
mitgerechnet.

Statusmodell:

- `offen`: laufende Woche oder kumuliert unter 50 EUR
- `auszahlungsbereit`: abgeschlossene offene Wochen erreichen mindestens 50 EUR
- `ausgezahlt`: manuell als bezahlt markiert

## Datenmodell

Neue Tabellen:

`extra_income_sessions`

- `id`
- `started_at`
- `ended_at`
- `message_count`
- `night_bonus_enabled`
- `bonus_mode` (`none`, `fixed`, `per_message`)
- `bonus_threshold_messages`
- `bonus_amount_cents`
- `created_at`
- `updated_at`

`extra_income_timer`

- `id`
- `started_at`
- `created_at`

Es darf nur eine aktive Timer-Zeile geben.

`extra_income_payouts`

- `id`
- `period_start`
- `period_end`
- `gross_cents`
- `fee_cents`
- `net_cents`
- `marked_paid_at`
- `created_at`

Die API kann Payouts aus Sessions neu berechnen. Markierte Payouts bleiben als
abgeschlossener Zustand erhalten und werden aus offenen Dashboard-Summen
ausgeschlossen.

## API

Die bestehende `/api/data.php` bleibt der Einstiegspunkt.

Neue `type`-Werte:

- `extraIncome`: Uebersicht, aktive Session, Sessions, offene Auszahlung
- `extraIncomeStart`: Timer starten
- `extraIncomeStop`: Timer stoppen und Session erstellen
- `extraIncomeSave`: manuelle Session erstellen oder bestehende Session
  aktualisieren
- `extraIncomeDelete`: Session loeschen
- `extraIncomeMarkPaid`: abgeschlossene auszahlungsbereite Wochen als
  ausgezahlt markieren

Schreibende Requests bleiben sessiongeschuetzt und verwenden die bestehenden
Same-Origin-/XHR-Schutzmuster.

## UI

Der neue Tab `Zusatzeinkommen` nutzt den bestehenden Dashboard-Stil.

Oben stehen vier Kacheln:

1. `Aktueller Verdienst`: Brutto, darunter Auszahlungsbetrag nach Gebuehren
2. `Diese Woche`: Nachrichten, Brutto, Stundenlohn
3. `Offen zur Auszahlung`: kumuliert brutto/netto und Status
4. `Heute`: Arbeitszeit, Nachrichten, Verdienst

Darunter:

- Timer-Zeile mit Start/Stop
- Formular zum manuellen Nachtragen
- kompakte Liste der letzten Sessions mit Bearbeiten/Loeschen
- Auszahlungskachel mit `Als ausgezahlt markieren`, wenn zulaessig

Beim Stoppen oeffnet sich ein Modal mit:

- bezahlte Nachrichten
- Checkbox `Nachtbonus anwenden`
- Bonusmodus `Kein Bonus`, `Einmalig`, `Fortlaufend pro Nachricht`
- Mindestnachrichten
- Bonusbetrag
- Senden

Keine Notizen.

In der Uebersicht:

- neue Kachel `Zusatzverdienste` in der zweiten Reihe
- Anzeige der offenen Netto-Auszahlung
- in `Heute` und `Aktueller Monat` jeweils separate Zusatzzeile
  `Zusatzverdienste`
- keine Einrechnung in Kreisdiagramme, Prolific-Ziele oder Prolific-
  Stundenloehne

## Fehlerfaelle

- Start blockiert, wenn bereits eine aktive Session laeuft.
- Stop ohne aktive Session liefert eine klare Fehlermeldung.
- Ende darf nicht vor Start liegen.
- Nachrichten muessen ganze Zahlen groesser/gleich 0 sein.
- Bonusbetrag und Mindestnachrichten muessen zum Bonusmodus passen.
- Loeschen fragt bestaetigend nach.
- Payout-Markierung ist gesperrt, wenn nur die laufende Woche offen ist oder
  die 50-EUR-Schwelle noch nicht erreicht ist.

## Tests und Verifikation

Backend:

- PHP-Lint fuer geaenderte Runtime-Dateien
- Unit-/Contract-Test fuer Wochenstufen
- Test fuer Nachtbonus proportional
- Test fuer Wochen-Split mit Rundung und erhaltenem Total
- Test fuer Sonderbonus `einmalig`
- Test fuer Sonderbonus `fortlaufend`
- Test fuer Auszahlungsschwelle, Gebuehren und Ausschluss laufender Woche

Frontend:

- `node --check dashboard/assets/app.js`
- Render-Test fuer Tab, vier Kacheln, Timer, Stop-Modal und Dashboard-Kachel
- Browser-Check lokal oder live nach Deploy

Deployment:

- normale Runtime-Deploy-Route ueber `scripts/deploy-webspace.ps1`
- kein Upload von `config.php`, `install.php`, `hash-generator.php` oder
  `config.example.php`
