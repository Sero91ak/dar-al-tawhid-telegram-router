# DAR AL TAWḤĪD Telegram Router

Produktionsnaher Telegram-Bot für DAR AL TAWḤĪD. Der Bot erkennt neue Posts aus einem fest definierten Hauptkanal und routet sie ausschließlich anhand erlaubter Fach-Hashtags in die passenden Themen einer Telegram-Forumgruppe.

## Kernregeln

- keine KI-Klassifizierung
- kein General-Fallback
- Routing nur über definierte Fach-Hashtags
- Quellkanal strikt prüfen
- Ziel-Forum strikt prüfen
- Idempotenz persistent speichern
- Admin-Befehle nur für erlaubte Telegram-User-IDs

## Routing-Tabelle

| Bereich | Schlüssel | Hashtags |
| --- | --- | --- |
| ʿAQĪDAH & TAWḤĪD | `aqidah` | `#Aqidah`, `#Tawhid` |
| TAKFĪR • KUFR • NAWĀQIḌ | `takfir` | `#Takfir`, `#Kufr`, `#Nawaqid` |
| QURʾĀN & TAFSĪR | `quran` | `#Quran`, `#Tafsir` |
| ḤADĪṮ & ĀṮĀR | `hadith` | `#Hadith`, `#Athar` |
| SALAF & AHL AL-ḤADĪṮ | `salaf` | `#Salaf`, `#AhlAlHadith` |
| FIQH & UṢŪL AL-FIQH | `fiqh` | `#Fiqh`, `#UsulAlFiqh` |
| SĪRAH & GESCHICHTE | `sirah` | `#Sirah`, `#Geschichte` |
| WIDERLEGUNGEN | `widerlegungen` | `#Widerlegung`, `#Widerlegungen` |
| MANHAJ & ADAB | `manhaj` | `#Manhaj`, `#Adab` |

## Architektur

### Module

- `src/config`: Environment und Routing-Definitionen
- `src/bot`: Telegram-Bot, Admin-Schutz, Befehle
- `src/services`: Routing-Logik, Topic-Registry, Media-Group-Verarbeitung, Telegram-Gateway, Logger
- `src/db`: Kysely-basierte Persistenz, Tabellen und Repositories
- `src/web`: kleine optionale Admin-Ansicht

### Persistenz

Unterstützt:

- SQLite für lokal und Tests
- PostgreSQL für Produktion

Gespeichert werden:

- Topic-Zuordnungen
- Routing-Ergebnisse
- Idempotenz-Datensätze
- Media-Group-Zwischenspeicher
- Fehlerprotokolle
- letzte Routing-Statusdaten

## Environment Variables

Siehe `.env.example`.

Pflicht:

- `TELEGRAM_BOT_TOKEN`
- `SOURCE_CHANNEL_ID`
- `TARGET_FORUM_ID`
- `ADMIN_USER_IDS`
- `ROUTING_MODE`
- `WEBHOOK_SECRET`
- `DATABASE_URL`

Optional:

- `PORT`
- `PUBLIC_BASE_URL`
- `LOG_LEVEL`
- `NODE_ENV`
- `ADMIN_WEB_USERNAME`
- `ADMIN_WEB_PASSWORD`

## BotFather / Telegram-Einrichtung

1. Neuen Bot bei BotFather anlegen
2. Token als `TELEGRAM_BOT_TOKEN` setzen
3. Bot dem Hauptkanal hinzufügen
4. Bot der Ziel-Forumgruppe hinzufügen
5. Minimal nötige Admin-Rechte geben
6. `SOURCE_CHANNEL_ID` setzen
7. `TARGET_FORUM_ID` setzen
8. Eigene Telegram User-ID in `ADMIN_USER_IDS` eintragen
9. Themen registrieren

## Topic-Registrierung

In jedem Zielthema:

- `/register aqidah`
- `/register takfir`
- `/register quran`
- `/register hadith`
- `/register salaf`
- `/register fiqh`
- `/register sirah`
- `/register widerlegungen`
- `/register manhaj`

## Admin-Befehle

- `/help`
- `/status`
- `/routes`
- `/test`
- `/register <bereich>`
- `/unregister <bereich>`

## Routing-Verhalten

- Standard: `ROUTING_MODE=forward`
- Alternative: `ROUTING_MODE=copy`
- mehrere Hashtags zum selben Bereich erzeugen nur einen Zielpost
- mehrere Fachbereiche erzeugen je Zielbereich genau einen Post
- unbekannte Hashtags führen zu keinem Post
- Branding- oder Person-Hashtags routen nie

## Lokaler Start

```bash
npm install
cp .env.example .env
npm run dev
```

Webhook-Endpunkt:

`POST /telegram/webhook`

Health:

`GET /health`

Admin:

`GET /admin`

## Tests

```bash
npm run lint
npm run test
npm run build
```

Abgedeckt sind:

- Hashtag-Routing
- Alias-Deduplizierung
- fehlende Topic-IDs
- Duplikatschutz
- Forward-/Copy-Modus
- Media-Album-Routing
- Health- und Webhook-Schutz

## Sicherheit

- keine Secrets im Code
- Secret-Redaction im Logger
- Webhook-Secret-Prüfung
- strikte Quellkanal-Prüfung
- strikte Zielgruppen-Prüfung für `/register`
- keine Statusausgabe sensibler Tokens
- kein Fallback nach General

## Deployment-Bewertung

Noch kein Deployment enthalten.

### Cloudflare geeignet?

Eher **nein** für die erste Produktionsversion.

### Vorteile

- schnell
- einfaches Webhook-Handling

### Nachteile

- Telegram-Bibliotheken und Datenbank-/Album-Persistenz sind auf klassischem Node-Hosting einfacher
- SQLite lokal, PostgreSQL produktiv, Retry-Logik und Album-Coalescing sind unter normalem Node-Server robuster

### Empfehlung

Für den ersten 24/7-Betrieb: **Railway**, **Render** oder **Fly.io** mit PostgreSQL.

## Offene Punkte vor echtem Telegram-Test

- echtes GitHub-Repository anlegen
- Entwicklungsbranch pushen
- Pull Request gegen `main` vorbereiten
- reales BotFather-Token setzen
- reale Channel-/Forum-IDs setzen
- Themen in Telegram registrieren
- optional Admin-Webseite weiter ausbauen
