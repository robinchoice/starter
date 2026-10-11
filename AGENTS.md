# starter

Diese Datei ist zugleich die Vorlage für neue Projekte. Dort ersetzen Titel, „Zweck & Links“, die Prüf-URL unter „Deploy“ und „Fallen“ die Angaben zur Vorlage. „Konventionen“ bleibt und folgt den Änderungen hier, das Nacht-Review prüft alle Prototypen dagegen.

## Zweck & Links

- Vorlage für Web- und Mobile-Prototypen: Bun, Hono, SvelteKit, Drizzle, Postgres, optional Flutter in `apps/mobile`. Neue Projekte: README.md, „Neues Projekt“.
- Selbst nicht deployt. Im Projekt: Live-URL `https://<slug>.pleasance.org`, ab 1.0 eine eigene Domain (README, „Live als 1.0“), Coolify-Projekt `pleasance-<slug>` oder `privat-<slug>`, Ressource `<slug>`.

## Checks

`bun run check && bun run test && bun run build`, bei App-Änderungen zusätzlich `flutter analyze && flutter test` in `apps/mobile`. Die Browser-Tests starten API und Web auf eigenen Ports (53100, 54100). Testet ein anderer Worktree gleichzeitig, mit anderen Ports aufrufen: `TEST_API_PORT=53101 TEST_WEB_PORT=54101 bun run test`.

## Deploy

- Ein Push auf `main` baut nach grüner CI die Images und deployt sie über die Coolify-API. Danach fotografiert sie die Live-Seite nach `docs/screenshots/`, committet geänderte Bilder mit `[skip ci]` und meldet den Deploy an `robinchoice/pleasance` (README, „Screenshots“). Ohne das Secret `COOLIFY_TOKEN` überspringt die CI Deploy, Screenshots und Meldung, so auch hier in der Vorlage. Ohne `PLEASANCE_DISPATCH_TOKEN` entfällt nur die Meldung.
- App (`apps/mobile`): Ein Push auf `main` baut das Android-AAB, iOS geht nur bei einem Tag `v*` oder mit `gh workflow run mobile.yml` zu TestFlight (macOS-Minuten zählen zehnfach).
- Prüfen: `gh run watch`. Der Deploy-Job ist erst grün, wenn `https://<slug>.pleasance.org/api/health` den Commit als `revision` meldet.
- Nur hier in der Vorlage: `.github/workflows/standards.yml` baut `standards/` als Image `starter-site` und deployt es über das Tailnet nach https://standards.pleasance.org (Coolify VPS 3, nur aus dem Tailnet). Aus der Vorlage erzeugte Repos überspringen den Workflow und können ihn mit `standards/` löschen.

## Fallen

- Was hier geändert wird, landet in jedem neuen Projekt und über das Nacht-Review als Befund in allen bestehenden. Konventionen nur ändern, wenn sie für alle Prototypen gelten.
- `standards/` liest die Tabellen „Farbband“ und „Produktfarbe“ aus DESIGN.md: Spaltenreihenfolge und Ausschnitte im Format `1,00–1,35` beibehalten. Zeichnungen der Zeichen stehen in `SIGNS` in `standards/main.js`, ein neues Produkt bekommt dort bis dahin einen Punkt.

## Konventionen

Stack und Aufbau: siehe README.md. Gestaltung: siehe DESIGN.md.

- Neue Tabelle: `packages/db/src/schema.ts` ändern, `bun run db:generate`. Die Migration läuft beim nächsten API-Start, `migrateDb` lässt mehrere Instanzen nacheinander migrieren. Jede Migration muss mit dem noch laufenden alten Code funktionieren: Spalten nullable oder mit Default hinzufügen, Umbenennen und Löschen erst im Deploy danach. Nichts von Hand in der Datenbank ändern.
- Neue Route: Datei in `apps/api/src/routes`, in `app.ts` einhängen. `requireAuth` für eingeloggte Nutzer (danach `c.get('user')`), `validJson(schema)` mit dem Schema aus `packages/shared`.
- Jeder sichtbare Text steht auf Deutsch und Englisch: für Web und API in `packages/shared/src/messages.ts`, für die App in `lib/core/messages.dart`. Fehlt eine Sprache, schlagen `bun run check` bzw. `flutter analyze` fehl. Im Web `t()` aus `$lib/i18n`, in der API `t(c)` aus `lib/i18n.ts`, in der App `ref.watch(messagesProvider)`. Eigene zod-Meldungen sind Schlüssel aus `messages.ts`. Umgeschaltet wird im `PleasanceFooter`.
- Fehler antworten immer als `{ error: string }` mit einem Text aus `t(c)`, also in der Sprache, die der Client per `Accept-Language` schickt. Das Web zeigt ihn als Toast.
- Alles, was Mails verschickt oder Geheimnisse prüft, bekommt ein `rateLimit` aus `lib/rate-limit.ts`. Die Zähler liegen in Postgres und gelten für alle API-Instanzen.
- Mails über `sendMail` aus `lib/mail.ts`.
- Zustandslos, damit eine App ohne Umbau auf einen anderen Server umzieht oder repliziert hinter einem Load Balancer läuft (`infra.md`, „Skalierung“): Platte und Prozessspeicher halten keinen Zustand, der eine Instanz überlebt oder für alle gelten muss. Sessions, Rate-Limits und Feedback liegen schon in Postgres. Uploads und Medien gehen nach S3 (Hetzner Object Storage, Bucket nach Namensregel) über `Bun.s3`, das `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` und `S3_BUCKET` selbst aus der Env liest. Kein Volume außer `pgdata`. Locks per `pg_advisory_xact_lock`. Caches im Speicher nur, wenn jede Instanz sie verlieren darf, ein geteilter Cache läuft als Valkey-Container in `docker-compose.prod.yml`.
- Hintergrundjobs und Zeitpläne laufen nie im API-Prozess, sondern als eigene Rolle: Service `worker` in `docker-compose.prod.yml` aus dem API-Image mit eigenem Einstieg `apps/api/src/worker.ts`, erst wenn ein Prototyp ihn braucht. Aufträge sind Zeilen in Postgres, der Worker holt sie mit `FOR UPDATE SKIP LOCKED`. Fällige Zeitpläne beansprucht er atomar (`update … set next_run = … where name = … and next_run <= now() returning`). So führt auch bei mehreren Workern nur einer jeden Auftrag aus, und kein Job geht bei einem Neustart verloren. Nichts in `setTimeout`, `setInterval` oder Listen im Speicher. Kurze Nacharbeit einer Anfrage wie eine Mail bleibt in der Anfrage.
- Jede Rolle hat einen Healthcheck im Image: API `/api/health` (mit Datenbank), Web `/health` (nur der Prozess), ein Worker ein `/health` auf einem eigenen Port. Uptime Kuma und ein Load Balancer prüfen `/api/health` über die öffentliche Adresse.
- Konfiguration nur über die Env: Jede neue Variable steht in `.env.example`, `.env.production.example` und `docker-compose.prod.yml`. Im Code keine Domains, IPs, Hostnamen oder Pfade des Servers. Service-Namen aus der Compose-Datei (`api`, `postgres`) sind erlaubt.
- Postgres hat im Compose eine Speichergrenze (`POSTGRES_MEMORY`, Standard `512m`). Wird sie eng, in Coolify erhöhen, nicht entfernen.
- Der Feedback-Knopf bleibt in jedem Prototyp, auch ab 1.0: Dann ist der Käfer nur im Testmodus sichtbar, „Feedback geben“ immer (README, „Feedback“). Eigene Overlays, die nicht auf den Screenshot sollen, bekommen im Web `data-feedback-ignore`. Neue API-Aufrufe laufen über `api` bzw. `apiProvider`, sonst fehlen ihre Fehler in den Meldungen. Offene Meldungen eines Repos: `gh issue list --label feedback`.
- `users.name` ist ein freier Anzeigename ohne Filter. Bekommt ein Prototyp eindeutige öffentliche Handles (z. B. `/@name`): NFKC-normalisiert und kleingeschrieben speichern und eindeutig machen, reservierte Namen sperren (`admin`, `root`, `api`, `support`, `www`, `login`, `settings`, dazu alle eigenen Routen). Einen Wortfilter für Vulgäres gibt es nur bei öffentlichen Community-Apps, dann mit `obscenity`. Eigene Wortlisten erzeugen Fehltreffer.
- Web: API-Aufrufe über `api` aus `$lib/api`, Login-Zustand aus `$lib/auth.svelte`. Seiten hinter dem Login unter `routes/(app)`.
- Externe Quellen im Browser (Skripte, Fonts, Bilder, APIs) in die CSP in `apps/web/svelte.config.js` eintragen, sonst blockt der Browser sie. Der Browser-Test in `apps/web/tests` scheitert an jedem Konsolenfehler, also auch an CSP-Verstößen. Inline-`<style>` erlaubt die CSP nur im Dev-Modus.
- Mobile (`apps/mobile`): API-Aufrufe über `apiProvider`, Login-Zustand aus `authProvider`, Seiten in `lib/features/<name>`, Routen in `lib/core/router.dart`. DTOs von Hand schreiben wie `User` in `core/auth.dart`. OpenAPI aus zod mit generiertem Client erst, wenn die API stabil ist.
- Mobile-Karte: flutter_map mit OSM. Google Maps nur, wenn Google-Places-Daten nötig sind (wie doener).
- Mobile bei Bedarf: sembast für Offline und Sync (Vorbild doener). Kein eigener Dart-Server, kein Supabase.
- Screenshots für pleasance.org: Kernscreens als öffentliche Seiten in `PAGES` in `apps/web/screenshots.ts` eintragen, die CI fotografiert sie nach jedem Deploy (README, „Screenshots“). Seiten hinter dem Login nicht, die CI hat keinen Login und die Bilder zeigen keine echten Nutzerdaten. Der Bot committet die Bilder auf `main`, vor dem Push also holen.
- Link-Vorschau: Das Layout setzt die `og:`-Tags, das Bild rendert `bun run og-image` in `apps/web` (DESIGN.md, „Vorschaubild“). Danach neu rendern und committen, wenn sich `APP_NAME`, `APP_BAND`, `tagline` oder die Kachel ändern. Die Kachel liegt als `static/favicon.svg`, dieselbe wie `img/werkzeuge/<slug>.svg` im pleasance-Repo. Öffentliche Seiten mit eigenem Inhalt, etwa geteilte Links, geben im Server-Load `meta` mit Titel, Beschreibung und optional einem absoluten Bild-URL zurück. Private Inhalte, Links mit Passwort, abgelaufene und ungültige Links bekommen die allgemeine Vorschau. Link-Crawler führen kein JavaScript aus, also wirkt `meta` nur in `+page.server.ts` bzw. `+page.ts` auf Seiten mit SSR, nicht unter `routes/(app)` (`ssr = false`). WhatsApp speichert Vorschauen lange zwischen.
- Formatierung und Lint: Biome, Regeln in `biome.json`. `bun run format` behebt das meiste selbst.
- Apple-Zugangsdaten der Prototype Factory stehen zentral in `~/.secrets`: `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (base64), dazu das CI-Signing-Zertifikat `APPLE_CI_DEV_CERTIFICATE_BASE64` (base64-PKCS12) und `APPLE_CI_DEV_CERTIFICATE_PASSWORD`. Ablage und Kopien: `~/dev/kontor/infra.md`, Abschnitt „Zugangsdaten: wo liegt was“. Im selben Aufruf mit `set -a; . ~/.secrets; set +a` laden; Werte nie ausgeben oder ins Repo schreiben. Nach Freigabe richtet `~/dev/kontor/apple-ci-secrets.sh robinchoice/<repo>` die GitHub-CI ein: ASC-IDs als Variablen, `ASC_KEY_P8`, `IOS_DEV_CERTIFICATE` und `IOS_DEV_CERTIFICATE_PASSWORD` als Secrets.
