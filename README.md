# starter

Vorlage für Web- und Mobile-Prototypen: Bun, Hono, SvelteKit, Drizzle und Postgres, dazu eine CLI und optional eine Flutter-App gegen dieselbe API. Deutsch und Englisch mit Umschalter in der Fußzeile, Login per Mail mit Link und Code (Web) oder Code (App) und per Passkey, Feedback-Knopf mit Screenshot, Update-Mails mit Opt-in, ALTCHA vor Login-Mails, Link-Vorschau, Mail über SMTP im Design der App, Rate-Limit, Security-Header mit CSP, GlitchTip, PostHog, Healthcheck, CI mit Browser-Test, Secret-Scan, Dependabot, Coolify-Deploy und Screenshots nach jedem Deploy sind fertig eingebaut.

## Neues Projekt

1. Einen Slug aus ASCII-Kleinbuchstaben und Ziffern wählen, beginnend mit einem Buchstaben, ohne Bindestrich (z. B. `savor`). Repo und lokaler Ordner heißen gleich: `~/dev/<slug>`. Repo aus der Vorlage anlegen: `gh repo create robinchoice/<slug> --template robinchoice/starter --public --clone`. Repos sind öffentlich, danach Push Protection einschalten (siehe „Secret-Scan“), die Vorlage vererbt sie nicht: `gh api -X PATCH repos/robinchoice/<slug> --input - <<<'{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}'`
2. `APP_NAME`, `APP_ID` (`org.pleasance.<slug>`, daraus heißt auch die CLI) und `APP_BAND` in `packages/shared/src/index.ts` setzen. Welcher Ausschnitt aus dem Farbband passt, steht in DESIGN.md.
3. In `AGENTS.md` Titel, „Zweck & Links“, die Prüf-URL unter „Deploy“ und „Fallen“ für das Projekt ausfüllen und den einleitenden Absatz zur Vorlage löschen.
4. Lokal starten:
   ```sh
   cp .env.example .env
   docker compose up -d
   bun install
   bunx playwright install chromium   # einmalig, für den Browser-Test
   bun run dev
   ```
   Web läuft auf http://localhost:5173, die API auf Port 3000. Ohne `SMTP_HOST` stehen die Login-Links im API-Log. In Produktion startet die API ohne `SMTP_HOST` nicht, sonst könnte jeder mit Zugriff auf die Logs sich als beliebiger Nutzer anmelden.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `apps/api` | Hono-API unter `/api/v1`, Migrationen beim Start, `/api/health` prüft auch die DB |
| `apps/web` | SvelteKit. Leitet `/api` an die API weiter, im Dev macht das der Vite-Proxy. Seiten hinter dem Login liegen unter `routes/(app)`, `/health` ist der Healthcheck des Web-Servers |
| `packages/db` | Drizzle-Schema und Migrationen |
| `apps/cli` | Befehlszeile der App gegen dieselbe API, siehe „CLI“ |
| `packages/shared` | App-Name, zod-Schemas, Typen und Texte für API, Web und CLI |
| `apps/mobile` | Flutter-App, siehe unten. Reine Web-Projekte löschen den Ordner, `.github/workflows/mobile.yml` und den gesamten `pub`-Block in `.github/dependabot.yml` |

Befehle: `bun run dev`, `check` (Biome und Typen), `format`, `test`, `build`, `db:generate`, `standards` (Übersicht der Standards auf http://localhost:4300), in `apps/web` außerdem `screenshots` (siehe „Screenshots“) und `og-image` (Vorschaubild für geteilte Links, DESIGN.md). `build` baut Web und CLI. `test` umfasst die API-Tests, die CLI-Tests und Browser-Tests von Login, Feedback, Update-Mails, Link-Vorschau und Agenten-Zugang (Playwright, baut das Web und startet API und Web-Build selbst auf eigenen Ports 31100 und 31101, nie die laufenden Dev-Server, so greift die CSP wie in Produktion; testen zwei Worktrees gleichzeitig, bekommt einer andere per `TEST_API_PORT` und `TEST_WEB_PORT`, etwa 31102 und 31103). Testports bleiben unter dem ephemeren Linux-Portbereich (32768–60999), damit ausgehende Verbindungen sie nicht kurzzeitig belegen. API- und Browser-Tests bekommen über `bun run test` jeweils eine eigene leere Datenbank auf dem Server aus `DATABASE_URL`. Der Datenbanknutzer braucht dafür `CREATEDB` (der lokale Compose- und der CI-Nutzer haben es bereits). Nach Erfolg, Fehler oder Abbruch per SIGINT/SIGTERM wird nur diese temporäre Datenbank gelöscht; die vorhandene Datenbank bleibt unverändert. Auch `bun run test` in `apps/api` bzw. `apps/web` nutzt diese Isolation; direkte Aufrufe von `bun test` oder `playwright test` umgehen sie.

## Secret-Scan

Prototyp-Repos sind öffentlich, Code, Historie und CI-Logs. Privat bleiben nur Repos mit Kundendaten, Kundenprojekte, Repos mit Mitinhabern und interne Admin-Tools. Der Workflow `.github/workflows/secrets.yml` läuft bei jedem Push auf jedem Branch und bei PRs aus Forks, ohne `paths-ignore`, und scannt mit gitleaks (Docker-Image, Version per Digest fest) die neuen Commits. Ein Fund macht den Lauf rot, der Wert steht dank `--redact` nicht im Log.

- Regeln: die Standardregeln von gitleaks, dazu `.gitleaks.toml`. Die nimmt nur `generic-api-key` in `patches/*.patch`, `bun.lock` und `pubspec.lock` aus, dort schlägt gebündelter Fremdcode an. Echte Token-Formate (`ghp_…`, `sk_live_…`) fallen dort weiter auf.
- Fehlalarm: den `Fingerprint` aus dem Log als Zeile in `.gitleaksignore` eintragen.
- Davor sitzt GitHubs Push Protection: Sie lehnt Pushes mit bekannten Token-Formaten ab, bevor sie öffentlich werden, Secret Scanning meldet Funde als Alert im Repo. Beides ist für öffentliche Repos kostenlos und wird pro Repo eingeschaltet (Schritt 1 unter „Neues Projekt“). Eine Sperre nur nach Prüfung umgehen, nie für einen echten Wert.
- Echter Fund: gitleaks läuft erst nach dem Push, das Secret ist also schon öffentlich. Sofort rotieren, Entfernen aus dem Code oder der Historie reicht nicht.

## Feedback

Eingeloggte Tester sehen auf jeder Seite einen Käfer-Knopf, im Web unter `routes/(app)`, in der App über allen Screens. Er lässt sich verschieben. Ein Tipp macht einen Screenshot des Bildschirms, der Tester kann die Stelle markieren und schreibt dazu, was nicht stimmt. Anregungen und Wünsche ohne Screenshot gehen über „Feedback geben“ im Kopf (Web) bzw. im Profil (App).

Den Käfer schaltet der Testmodus, in der Fußzeile (Web) bzw. im Profil (App), gespeichert pro Gerät. Bis 1.0 ist er an. Ab 1.0 (`LIVE` in `packages/shared`, `live` in `config.dart`) ist er aus, bis jemand ihn einschaltet: Du und Tester behalten den Käfer, alle anderen sehen nur „Feedback geben“.

Mitgeschickt werden Seite, Version, Gerät, Fenstergröße, Sprache und die letzten fünf fehlgeschlagenen API-Aufrufe. Der Tester sieht das im Formular unter „Was mitgeschickt wird“.

Die API speichert jede Meldung in `feedback` und legt dann ein Issue im Repo des Prototyps an, mit den Labels `feedback`, `bug` oder `idea` und der Plattform. Im Issue steht keine Mail-Adresse. Danach geht eine Mail an `FEEDBACK_EMAIL` mit Screenshot im Anhang und Link aufs Issue. Wer auf die Mail antwortet, schreibt dem Tester. Fällt GitHub oder die Mail aus, bleibt die Meldung gespeichert.

- Alle offenen Meldungen: `gh search issues --owner robinchoice --label feedback --state open`
- Screenshots stehen nicht im öffentlichen Issue. `/api/v1/feedback/<id>/screenshot` liefert sie nur an eingeloggte Admins aus `ADMIN_EMAILS` aus.
- Das Repo backt die CI als `GITHUB_REPOSITORY` ins API-Image. Ohne `FEEDBACK_GITHUB_TOKEN` entsteht kein Issue, ohne `FEEDBACK_EMAIL` keine Mail.

## Update-Mails

Nutzer bekommen neue Funktionen per Mail, wenn sie es wollen. Gespeichert wird alles in der Datenbank der App, verschickt über das SMTP aus `lib/mail.ts`.

- Opt-in: Standard ist aus, denn die Prototypen sind kostenlos und die Bestandskunden-Ausnahme aus § 7 Abs. 3 UWG greift nicht. Unter dem Login-Formular steht eine nicht vorausgewählte Checkbox, sie gilt erst, wenn der Login-Link oder Code eingelöst wird. Das ist zugleich das Double-Opt-in. Geschaltet wird jederzeit unter `/settings` (Web) bzw. im Profil (App). `users.updates_consent_at` hält den Zeitpunkt der Einwilligung als Nachweis, `users.locale` die Sprache der Mails.
- Abmelden: Jede Update-Mail hat einen Link auf `/unsubscribe?token=…`, der ohne Login abbestellt, dazu `List-Unsubscribe` und `List-Unsubscribe-Post` für One-Click im Mail-Programm. Der Token steht pro Konto in `users.unsubscribe_token`.
- Entwürfe schreiben Agenten als `updates/<datum>-<thema>.md`, etwa aus den Commits seit der letzten Datei dort. Je Sprache eine Überschrift `# de: Titel` bzw. `# en: Titel`, darunter die Features als Liste `- …`, optional ein Bild `![](bild.png)` neben der Datei (PNG oder JPEG). Die API legt jede Datei beim Start einmal als Entwurf an und überschreibt ihn danach nie. `bun run test` prüft alle Dateien.
- Senden: `/admin/updates`, nur für `ADMIN_EMAILS`, also nie für admin@pleasance.org. Dort Entwürfe bearbeiten oder neu anlegen, Vorschau je Sprache, „Testmail an mich“ in beiden Sprachen, dann „An … Abonnenten senden“. Den Versand löst nur Robin aus, denn das ist eine Mail in seinem Namen an Dritte. Versendete Updates bleiben mit Datum und Zahlen stehen und lassen sich nicht mehr ändern.
- Versand: Pro Empfänger entsteht eine Zeile in `update_deliveries`. Der Service `worker` (`apps/api/src/worker.ts`, gleiches Image wie die API) schickt sie gedrosselt, alle `UPDATE_MAIL_INTERVAL_MS` (Standard 6 s) eine Mail, mit drei Versuchen und einer Minute Pause nach einem Fehler. Wer zwischendurch abbestellt, wird übersprungen. Zwei Worker schicken nie dieselbe Zeile gleichzeitig, als gesendet gilt sie aber erst nach dem Commit: Stirbt der Worker zwischen SMTP-Annahme und Commit oder meldet der Server einen Fehler für eine zugestellte Mail, geht sie erneut raus. Eine doppelte Mail ist also selten möglich, eine nie angenommene gilt nie als gesendet. Fehler stehen mit Update- und Zustell-ID im Log, ohne Adresse. Lokal: `bun run worker` in `apps/api`.
- Design: Die Vorlage in `lib/mail.ts` gilt für alle Mails der App, auch Login-Link und Code (DESIGN.md, „Mails“).

## Deploy auf Coolify

VPS 1 baut nichts. Die CI baut bei jedem grünen Push auf `main` die Images `ghcr.io/<owner>/<repo>-web` und `-api` für arm64 (Tags `:<sha>` und `:latest`), Coolify zieht sie nur. Die GHCR-Packages bleiben privat. VPS 1 zieht sie mit dem vorhandenen Pull-Token `vps1-ghcr-pull`, pro Projekt ist dafür nichts einzurichten.

1. Ressource aus dem GitHub-Repo im Projekt `pleasance-<slug>` oder `privat-<slug>`, Build Pack „Docker Compose“, Datei `docker-compose.prod.yml`, Ressourcenname `<slug>`. Deploy-Key `github-deploy-<repo>`.
2. Domain nur beim Service `web` eintragen, mit Port: `https://<domain>:3000`.
3. Variablen aus `.env.production.example` setzen. `IMAGE_PREFIX` und `IMAGE_TAG` setzt die CI.
4. In GitHub die Secrets `COOLIFY_TOKEN` (eigener Coolify-API-Token `ci-<repo>` mit den Rechten `read`, `write` und `deploy`, nie den Laptop-Token aus `~/.secrets`) und `COOLIFY_UUID` (UUID der Ressource) setzen. Ohne `COOLIFY_TOKEN` überspringt die CI den Deploy. Mit Token setzt sie `IMAGE_PREFIX` und `IMAGE_TAG`, schaltet das Auto-Deploy der Ressource aus, ersetzt den Build durch `docker compose pull`, startet mit `up -d --no-build --remove-orphans` und wartet, bis Coolify den Deploy abgeschlossen hat und `/api/health` unter der öffentlichen URL den neuen Commit als `revision` meldet.
5. pleasance.org: Secret `PLEASANCE_DISPATCH_TOKEN` setzen, damit die CI jeden Deploy meldet (siehe „Screenshots“): `set -a; . ~/.secrets; set +a; printf '%s' "$GITHUB_PLEASANCE_DISPATCH_TOKEN" | gh secret set PLEASANCE_DISPATCH_TOKEN -R robinchoice/<slug>`. Ein Token für alle Prototypen, fein granuliert, nur für `robinchoice/pleasance` mit „Contents: Read and write“. Ohne das Secret überspringt die CI die Meldung.
6. GlitchTip: Projekt anlegen, DSN in `SENTRY_DSN` und `PUBLIC_SENTRY_DSN`.
7. Feedback: `FEEDBACK_EMAIL` und `FEEDBACK_GITHUB_TOKEN` setzen. Das Token ist eines für alle Prototypen, fein granuliert, nur „Issues: Read and write“, und liegt in `~/.secrets` als `GITHUB_FEEDBACK_TOKEN`.
8. PostHog (optional): `PUBLIC_POSTHOG_KEY` aus `~/.secrets` (`POSTHOG_PROTOTYPES_API_KEY`). Alle Prototypen teilen sich ein Projekt in der EU Cloud, Filter in den Insights per `$host`. Läuft cookieless ohne Session Replay, also ohne Cookie-Banner. Der Web-Server leitet `/ingest` an PostHog weiter, die CSP braucht keinen Eintrag. Replay oder Personenprofile nur mit Einwilligungsbanner.
9. Uptime Kuma: HTTP-Monitor auf `https://<domain>/api/health`.
10. Neue Software in `vps1/advisory-alarm` aufnehmen, siehe `infra.md`.

### Stoppen und weitere Instanzen

API und Worker behandeln `SIGTERM` und `SIGINT`: Die API nimmt keine neuen Verbindungen an und wartet auf laufende Antworten, der Worker holt keine weiteren Aufträge und beendet die laufende Zustellung samt Transaktion. Danach schließen sie den Postgres-Pool. Auch während des API-Starts wartet der Shutdown auf Migration und Import. Compose lässt dafür 30 Sekunden Zeit (`stop_grace_period`), erst danach erzwingt Docker den Abbruch. SMTP hat dafür begrenzte DNS-, Verbindungs- und Begrüßungswartezeiten (je 5 s) sowie 10 s für einen inaktiven Socket. Das ist keine Obergrenze für die gesamte Zustellung; ein langsamer, weiter antwortender Server oder eine lange Datenbankabfrage kann das Shutdown-Budget weiterhin überschreiten.

Zuerst Apps auf mehrere Server verteilen, erst bei Bedarf eine einzelne App replizieren (`infra.md`, „Skalierung“). Der Compose-Standard bleibt eine App mit lokalem Postgres. Eine weitere Instanz verwendet dieselbe Datenbank über das private Netz. Dafür neben `docker-compose.prod.yml` eine lokale, nicht eingecheckte Datei `compose.replica.yml` anlegen (Compose mit Unterstützung für `!reset`):

```yaml
services:
  api:
    environment:
      - DATABASE_URL=${DATABASE_URL:?Shared database URL is required}
    depends_on: !reset {}
  worker:
    environment:
      - DATABASE_URL=${DATABASE_URL:?Shared database URL is required}
```

`DATABASE_URL` in der Env dieser Instanz auf die gemeinsame Datenbank setzen und mit `docker compose -f docker-compose.prod.yml -f compose.replica.yml up -d web api worker` starten. Damit startet dort kein Postgres; der Worker wartet weiterhin auf die gesunde API. Alle Instanzen brauchen dieselbe App-Konfiguration und denselben Stand. Datenbankzugriff nur aus dem privaten Netz der App-Server erlauben, nicht öffentlich freigeben. Den Override auch bei späteren Deploys verwenden; die Standard-CI richtet diese Topologie nicht automatisch ein.

Die Client-IP für Rate-Limits ist der letzte Eintrag in `X-Forwarded-For`. Hinter einem einzelnen Proxy ist das dessen Gegenstelle. Bei Hetzner-LB → Traefik → Web reicht [`forwardedHeaders.trustedIPs`](https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/#forwarded-headers) allein nicht: Ohne Vertrauen verwirft Traefik den vom LB gesetzten Header; mit Vertrauen bleibt er erhalten, aber Traefik hängt standardmäßig die LB-IP an. Dann teilen sich alle Clients die IP-Limits. Vor dieser Topologie die ganze Header-Kette mit zwei verschiedenen Client-IPs und einem gefälschten Header prüfen. Am API-Eingang muss der letzte Eintrag die echte Client-IP sein. Bei Traefik-Versionen mit `forwardedHeaders.notAppendXForwardedFor` kann ein eigener, nur vom LB erreichbarer EntryPoint den Header unverändert weitergeben; `trustedIPs` dabei auf die tatsächlichen LB-Adressen begrenzen. Niemals pauschal dem ersten Header-Eintrag oder allen Absendern vertrauen. Der Lasttest vom 20.10.2026 hat nur den direkten Hetzner-LB geprüft, ohne Traefik und TLS.

## Screenshots

Nach jedem erfolgreichen Deploy fotografiert der CI-Job `screenshots` die Live-Seite mit headless Chromium: jede Seite aus `PAGES` in `apps/web/screenshots.ts` als Desktop (1440×900) und Handy (390×844, doppelte Dichte), als WebP in `docs/screenshots/<seite>-<gerät>-<sprache>.webp`. Haben sich Bilder geändert, committet der Bot sie mit `[skip ci]` auf `main`, das löst keinen neuen Deploy aus. Danach schickt derselbe Job ein `repository_dispatch` an `robinchoice/pleasance` (`event_type: prototype-deployed`, `client_payload: {slug, sha}`), damit pleasance.org die neuen Bilder übernimmt.

- Nur öffentliche Seiten: Die CI hat keinen Login, die Bilder zeigen nie Nutzerdaten. Kernscreens hinter dem Login kommen erst dazu, wenn der Prototyp sie öffentlich zeigt, z. B. als Demo-Seite mit Beispieldaten.
- Sprachen: `LOCALES` steht auf `de`. `en` nur ergänzen, wenn die englischen Bilder mehr zeigen als dieselben Screens in anderer Sprache.
- Fotografiert wird die GitHub-Variable `API_URL` (ab 1.0 die eigene Domain), ohne sie `https://<repo>.pleasance.org`. Aufrufe an `/ingest` blockt das Skript, PostHog zählt sie nicht.
- Lokal: `bun run screenshots [url]` in `apps/web`, ohne URL gegen `bun run dev`.
- Nach einem Deploy liegt oft ein Bot-Commit auf `main`, also vor dem nächsten Push holen.

## Für Agenten

Fremde Agenten lesen die öffentlichen Inhalte ohne HTML, nach [llms.txt](https://llmstxt.org) (Vorbild: bipexplorer.com). Quelle ist `publicPages` in `apps/api/src/lib/public-pages.ts`, die Routen stehen in `apps/api/src/routes/agents.ts`. Der Web-Server leitet die Pfade an die API weiter.

- `/llms.txt`: Einstieg mit Name, Tagline und allen öffentlichen Seiten als Links auf ihr Markdown.
- `/llms-full.txt`: alle Seiten in einer Datei.
- `<seite>.md`: jede Seite als Markdown, die Startseite als `/index.md`. Fragt ein Agent mit `Accept: text/markdown` nach einer Seite, die es als Markdown gibt, bekommt er unter derselben URL gleich das Markdown, alle anderen das HTML.
- Sprache: `?lang=de|en`, sonst `Accept-Language`, sonst Deutsch. Links behalten ein `?lang=`.
- Nur öffentliche Inhalte, die Registrierung bleibt unberührt. Was hineindarf: AGENTS.md, „Konventionen“.
- Ausprobieren: `curl localhost:5173/llms.txt` bei laufendem `bun run dev`.

## Login in der Savor-Vorschau

Agenten zeigen Änderungen hinter dem Login in der Savor-Vorschau mit dem Testkonto admin@pleasance.org, dem agentischen Admin. Admin-Rechte in der App hat es nicht (siehe „Registrierung öffnen“). `login-link <slug>` aus dem Kontor ruft dafür im API-Container `bun apps/api/src/login-link.ts <email>` auf. Das gibt einen einmaligen Login-Link aus, 15 Minuten gültig wie ein gemailter, den der Agent per `browser_navigate` öffnet. Die Vorschau hat pro Projekt ein festes Profil, und Sessions in Benutzung verlängern sich bei jedem Besuch auf 365 Tage. Also bleibt sie angemeldet. Für die CLI nimmt der Agent denselben Link per Pipe, siehe „CLI“.

## CLI

Jeder Prototyp hat eine eigene Befehlszeile in `apps/cli`, damit Agenten, Skripte und Tests die App über Befehle für die Sache selbst bedienen statt über die UI. Sie spricht nur mit der HTTP-API wie Web und App, nie mit der Datenbank. So gelten dieselben Rechte, Rate-Limits und die geschlossene Registrierung. Die Argumente liest `parseArgs` aus `node:util`, ohne weitere Abhängigkeit.

- Bauen: `bun run build` kompiliert `apps/cli/build/<slug>`, eine einzelne Datei mit Bun darin (gut 100 MB). Der Name kommt aus `APP_ID` in `packages/shared`. Die Adresse der App ist eingebacken: `APP_URL` aus der Umgebung beim Bauen (die CI setzt die Live-URL, ab 1.0 `API_URL`), sonst `https://<slug>.pleasance.org`. `--url` wählt eine andere, etwa `http://localhost:5173` gegen `bun run dev`, danach gilt die Adresse des letzten Logins. Ohne Bauen: `bun apps/cli/src/main.ts <befehl>`.
- Anmelden: `<slug> login` fragt nach der Adresse, löst die ALTCHA-Aufgabe selbst und fragt nach dem Code aus der Mail, wie die App. `<slug> login --link <link>` löst einen Login-Link ein, `--link -` liest ihn von stdin. Danach liegt der Token dieses Geräts mit `0600` in `$XDG_CONFIG_HOME/<slug>/session.json` (sonst `~/.config`, unter macOS `~/Library/Application Support`, unter Windows `%APPDATA%`), zusammen mit der Adresse, an andere Adressen geht er nie. Er ist eine gewöhnliche Session als Bearer: gehasht in `sessions`, 365 Tage, verlängert sich bei Nutzung, jedes Gerät hat seine eigene. `whoami` zeigt das Konto, `logout` widerruft den Token auf dem Server und löscht die Datei, ein neuer Login widerruft den alten.
- Ausgabe: Text für Menschen, mit `--json` genau ein JSON-Wert auf stdout, auch Fehler als `{ "error": "…" }` und die Hilfe als Liste der Befehle. Exit-Codes: 0 erledigt, 1 Fehler (auch Absagen der API wie die geschlossene Registrierung), 2 falscher Aufruf, 3 nicht angemeldet. Hilfe und Meldungen stehen als `cli…` in `packages/shared/src/messages.ts`, die Sprache kommt aus `LANG` oder `--lang`, die API antwortet per `Accept-Language` in derselben.
- Eigene Befehle: Datei in `apps/cli/src/commands` nach dem Beispiel `settings.ts` und in `commands` in `src/cli.ts` eintragen. Ein Befehl nennt Hilfezeilen, Optionen und `run`. Das ruft über `ctx.api` die API auf, liest die Antwort mit zod und gibt `{ data, text }` zurück, `data` für `--json`. `currentUser(ctx)` verlangt den Login, Fehler enden als `Failure` mit einem Code aus `EXIT`. Die Tests in `src/cli.test.ts` rufen die CLI im Prozess gegen die echte API mit der Testdatenbank auf.
- Agenten: nur mit dem Testkonto admin@pleasance.org, nie mit Kundenkonten. Den Token holen sie ohne Container über den Login-Link aus dem Kontor, per Pipe, so steht der Link nicht in ihrem Kontext: `login-link <slug> | apps/cli/build/<slug> login --link -`. Danach bleibt die CLI auf diesem Rechner angemeldet.
- Verteilen: Für andere Plattformen `bun run build --target=bun-darwin-arm64` in `apps/cli` (ebenso `bun-linux-x64`, `bun-linux-arm64`, `bun-windows-x64`), das überschreibt `build/<slug>`. Die CI baut die Datei bei jedem Lauf zur Probe, veröffentlicht sie aber nicht. Release-Artefakte erst, wenn ein Prototyp die CLI an Menschen außerhalb des Repos gibt.

## Registrierung öffnen

Prototypen sind von außen erreichbar, aber geschlossen, bis Robin ausdrücklich das Go gibt, externe Nutzer aufzunehmen. Bis dahin legen Magic Link und App-Code neue Konten nur für die Adressen in `SIGNUP_ALLOWLIST` an (kommagetrennt, dauerhafte Adressen wie Robins). Bestehende Konten melden sich immer an, Passkeys gibt es nur für sie. Fremde bekommen bei `/auth/magic-link` und `/auth/code` die Meldung „Die Registrierung ist noch geschlossen“, es geht keine Mail raus. Auch beim Einlösen von Links und Codes wird die aktuelle Freigabe geprüft: Eine inzwischen entfernte Adresse ohne Konto bekommt 403, selbst wenn der Link oder Code vorher verschickt wurde. Dieselbe Prüfung gilt zentral vor jeder Session-Erstellung, auch für Passkeys. Seiten ohne Login bleiben offen.

- Tester aufnehmen: Ein Admin klickt in der App oben auf „Tester einladen“ (`/invite`) und gibt die Adresse ein. Das legt das Konto an und schickt einen Login-Link, ohne Coolify und Redeploy. Danach meldet sich der Tester wie jedes bestehende Konto an, auch wenn der Link abläuft. Admins sind die Adressen in `ADMIN_EMAILS` (kommagetrennt, Standard robin@pleasance.org, der menschliche Admin), die API prüft das. Einladen öffnet nichts, `SIGNUP_OPEN` bleibt, wie es ist.
- admin@pleasance.org, der agentische Admin, kommt nie in `ADMIN_EMAILS`: Agenten melden sich damit in der Vorschau an und dürfen weder Konten an der Registrierung vorbei anlegen noch Dritte anmailen.
- Öffnen, erst nach Robins Go: `SIGNUP_OPEN=true` in Coolify setzen und neu deployen. Prüfen: Login-Link an eine neue Adresse anfordern.
- `login-link` legt Konten selbst an, das Testkonto der Savor-Vorschau braucht keinen Eintrag. Das Skript nimmt jede Adresse, die Grenze sitzt auf dem Server: Agenten kommen nicht in den Container, sondern nur über das root-eigene `login-link` aus dem Kontor, und das übergibt fest admin@pleasance.org. Wer selbst in den Container kommt, hat ohnehin die Datenbank.

## ALTCHA

Öffentliche Formulare, die Mails verschicken oder Daten anlegen, schützt [ALTCHA](https://altcha.org) (MIT, Proof of Work, ohne Cookies und ohne Drittanbieter): Vor dem Absenden rechnet der Browser oder die App eine kleine Aufgabe, die API prüft die Lösung. In der Vorlage gilt das für `/auth/magic-link` und `/auth/code`. Es ergänzt die Rate-Limits: Jede Anfrage kostet Rechenzeit, und ohne Lösung kann niemand die Limits einer fremden Adresse aufbrauchen.

- API: `GET /api/v1/altcha` gibt eine Challenge aus (`altcha-lib`, PBKDF2/SHA-256, 10 Minuten gültig). `requireAltcha` aus `lib/altcha.ts` steht vor `validJson`, liest das Feld `altcha` im JSON-Body und antwortet sonst mit 403 und `altchaFailed`. Jede Lösung gilt einmal, das merkt sich ein Zähler in `rate_limits`. Den HMAC-Schlüssel erzeugt die API beim ersten Aufruf und legt ihn in `server_secrets` ab, alle Instanzen teilen ihn, eine Env-Variable braucht es nicht.
- Web: `Altcha.svelte` ins Formular, mit `bind:payload` und `bind:this`. Das erste Absenden startet die Rechnung, danach schickt das Widget das Formular selbst noch einmal ab. Der Handler übergeht deshalb Absenden ohne Payload und ruft nach einem Fehler `reset()` auf, Vorbild `routes/login/+page.svelte`. Das Widget kommt aus `altcha/external` mit eigener CSS- und Worker-Datei, so bleibt die CSP ohne Ausnahme. Seine Texte bringt es auf Deutsch und Englisch mit, die Sprache folgt dem Umschalter. Das Sammeln von Zeiger- und Scrolldaten (`humanInteractionSignature`) ist aus.
- App: `requestCode` holt eine Challenge und löst sie mit [`altcha_lib`](https://pub.dev/packages/altcha_lib) in Isolates. Widget-Tests lösen über `altchaSolverProvider` im Haupt-Isolate, Vorbild `test/fake_api.dart`.
- Schwierigkeit: `COST` und Zählerbereich in `apps/api/src/lib/altcha.ts`. Auf einem Laptop rechnen Browser und App 0,1–0,5 s, das Widget zeigt mindestens 0,5 s. Nur erhöhen, wenn Bots durchkommen: Die App rechnet in reinem Dart, langsamer als WebCrypto im Browser.
- Tests: `apps/api/src/testing.ts` löst Challenges für die API-Tests, der Browser-Test rechnet mit dem echten Widget.

## Passkeys

Im Web meldet man sich neben der Login-Mail (Link und Code) auch mit einem Passkey an: `@simplewebauthn/server` und `@simplewebauthn/browser`, Routen in `apps/api/src/routes/passkeys.ts`. Eingeloggte legen Passkeys in den Einstellungen an und entfernen sie dort. Die Login-Seite bietet sie als Autofill im Adressfeld an (Conditional UI) und per Knopf „Mit Passkey anmelden“. Danach gilt dieselbe Session wie nach der Mail.

- Nur für bestehende Konten: Anlegen braucht eine Session, die Registrierung bleibt bei der Mail samt `SIGNUP_ALLOWLIST`. Ein neues Gerät ohne synchronisierten Passkey und die Wiederherstellung gehen ebenfalls über die Mail.
- Falle: Passkeys hängen an der Domain aus `APP_URL` (rpID = Hostname). Zieht ein Prototyp zu 1.0 auf eine eigene Domain, gelten die alten Passkeys dort nicht mehr: Nutzer melden sich einmal per Mail an und legen einen neuen an. Stimmt `APP_URL` nicht mit der Adresse im Browser überein, scheitert jeder Passkey.
- Ein entfernter Passkey bleibt auf dem Gerät. Beim nächsten Versuch antwortet die API „Diesen Passkey kennen wir nicht“, und das Web bittet den Browser per Signal-API, ihn zu vergessen.
- Lokal gehen Passkeys auf `localhost` ohne HTTPS, über eine LAN-Adresse nicht.
- Der Browser-Test (`apps/web/tests/login.test.ts`) legt sie mit dem virtuellen Authenticator von Chromium an (CDP `WebAuthn.addVirtualAuthenticator`).
- App: Das Paket [`passkeys`](https://pub.dev/packages/passkeys) meldet an („Mit Passkey anmelden“) und legt im Profil an, Entfernen geht im Web. Die App darf die Passkeys der Domain nur nutzen, wenn die Domain sie nennt: Die API liefert `/.well-known/apple-app-site-association` aus `APPLE_TEAM_ID` und `/.well-known/assetlinks.json` aus `ANDROID_CERT_SHA256` (SHA-256 der Signaturzertifikate, kommagetrennt), jeweils mit `APP_ID` aus `packages/shared`. Ohne die Variablen antworten beide mit 404. Android meldet sich mit dem Zertifikat statt der Domain an, die API akzeptiert dafür `android:apk-key-hash:…` aus denselben Fingerprints. In `ANDROID_CERT_SHA256` gehören der App-Signaturschlüssel aus der Play Console und der Upload-Key (`keytool -list -v -keystore <keystore>`), zum Testen mit `flutter run` auch der Debug-Key. iOS braucht die Associated Domain `webcredentials:<domain>` in `ios/Runner/Runner.entitlements`, mit automatischer Signierung (`-allowProvisioningUpdates` in `mobile.yml`) trägt Xcode die Fähigkeit selbst in die App-ID ein. Scheitert der TestFlight-Build daran, „Associated Domains“ bei der App-ID im Developer-Portal einschalten.

## Nostr-Login

Optional, nur wenn ein Prototyp ihn braucht. Vorbild ist findyourlogic (`~/dev/findyourlogic`): [nostr-login](https://github.com/nostrband/nostr-login) im Web, geprüft wird auf dem Server.

- Server: Das Web signiert ein NIP-98-Event (Kind 27235) mit einer Challenge aus der API und `u` = `APP_URL/api/v1/auth/nostr`, die API prüft es mit `nostr-tools` (`apps/api/src/lib/nostr.ts`, Route in `routes/auth.ts`). Stimmt `APP_URL` nicht mit der Adresse im Browser überein, scheitert jeder Login. E-Mail und npub hängen an einem Konto, `users.email` wird nullable.
- nsec.app und `relay.nsec.app` sind seit Mitte 2026 nicht erreichbar. nostr-login 1.7.12 wartet dann ohne Timeout und öffnet seinen Dialog nie. findyourlogic patcht es per `bun patch`: nsec.app aus der Liste, `wss://nos.lol/` als Pairing-Relay, `eval` im gebündelten tseep ersetzt. Neue Schlüssel entstehen im Browser („local signup“). Den Patch übernehmen, bis ein neues Release das selbst löst.
- CSP: Relays, Profilbilder und NIP-05 brauchen `wss:` und `https:` in `connect-src` und `https:` in `img-src`. Der Dialog setzt Inline-Styles im Shadow-DOM, ihre Hashes kommen in `style-src`. Fehlt einer, scheitert der Browser-Test des Nostr-Logins an der CSP-Meldung (NIP-07-Signer im Test, Vorbild `apps/web/tests/app.test.ts`).
- In findyourlogic meldete die CSP außerdem das `eval`, mit dem zod prüft, ob es Parser kompilieren darf. Abhilfe: `z.config({ jitless: true })` in `packages/shared`.

## Live als 1.0

Nur auf Robins ausdrücklichen Auftrag („X geht als 1.0 live“). Der Prototyp bekommt dann eine eigene Domain.

1. Namen prüfen, bevor es Domain-Vorschläge gibt. Marken: DPMAregister, EUIPO/TMview, bei internationaler Zielgruppe auch USPTO, vor allem in den Klassen 9 und 42 (Software, SaaS). Verwechslung: App Store, Google Play, GitHub und Websuche nach gleich oder ähnlich klingenden Produkten in derselben Branche. Treffer mit Fundstelle nennen. Ist der Name belegt oder zu nah dran, neue Namen vorschlagen. Der Slug bleibt, nur Anzeigename (`APP_NAME`) und Domain ändern sich. Dabei die Wettbewerbsprüfung aus `prototypes.md` wiederholen: Ist seit dem Start ein vergleichbares Produkt live gegangen, das melden, bevor es weitergeht.
2. 3–5 freie Domains vorschlagen, mit Empfehlung. Verfügbarkeit über die Porkbun-API (`/domain/checkDomain/<domain>`, Keys `PORKBUN_*` in `~/.secrets`), Preise aus `https://api.porkbun.com/api/json/v3/pricing/get`. Zu jedem Vorschlag Erst- und Verlängerungspreis nennen. Ziel ist das beste Preis-Leistungs-Verhältnis: kurz, eindeutig. Endung: erst `<name>.com` ohne Zusatz, dann `<name>.app`. Sind beide belegt oder zu teuer, einen anderen Namen vorschlagen statt eines Zusatzes (`get<name>.com`) oder einer anderen TLD. Länder-TLDs wie `.de` oder `.eu` nicht, sie binden an eine Region. Premium-Domains nur mit Begründung.
3. Robin kauft die Domain bei Porkbun, mit Auto-Renew und eingeschaltetem API-Zugriff für die Domain.
4. DNS über die Porkbun-API: A-Einträge für `@` und `www` auf VPS 1, TTL 600. Dazu ein CAA-Eintrag mit leerem Host, damit nur Let's Encrypt Zertifikate ausstellt (das nutzt Traefik ohnehin): `type: "CAA"`, `content: "0 issue \"letsencrypt.org\""`, TTL 600.
5. Coolify: Die neue Domain kommt beim Service `web` als erste dazu (`https://<domain>:3000,https://<slug>.pleasance.org:3000`). `APP_URL` auf die neue Domain setzen und neu deployen.
6. Umleitung: `/data/coolify/proxy/dynamic/<slug>-redirect.yaml` auf VPS 1. Ein Router mit höherer Priorität und `tls.certResolver: letsencrypt` leitet `<slug>.pleasance.org` und `www.<domain>` per `redirectRegex` (`permanent: true`) auf `https://<domain>` um. Gibt es eine App, bleibt `/api` unter der alten Adresse vom Redirect ausgenommen, bis keine Builds mit alter `API_URL` mehr im Umlauf sind: Apps folgen Redirects bei POST nicht.
7. Registrierung: Ist sie noch geschlossen, Robin fragen, ob sie mit 1.0 öffnet (siehe „Registrierung öffnen“). 1.0 allein ist noch kein Go dafür.
8. Nachziehen: `LIVE` in `packages/shared` und `live` in `apps/mobile/lib/config.dart` auf `true` (Testmodus, siehe „Feedback“), die Domain in `apps/mobile/ios/Runner/Runner.entitlements` (siehe „Passkeys“), GitHub-Variable `API_URL`, Monitor in Uptime Kuma, Referrer von API-Keys, `AGENTS.md` des Projekts (Live-URL, Prüf-URL) und die Zeile in `infra.md`.
9. Prüfen: `curl -sI` auf alte Adresse und `www.` (301 auf die neue Domain), `curl -s https://<domain>/api/health`, Login per Mail über die neue Domain. Passkeys der alten Domain gelten dort nicht mehr (siehe „Passkeys“).
10. Tag `v1.0.0` setzen, wenn `main` gleich `origin/main` ist und die CI auf genau diesem Commit grün ist. Vorher den CI-Status dieses Commits zeigen, dann `git push origin v1.0.0`. Gepushte Tags sind fest: nie löschen oder verschieben, geht etwas schief, folgt `v1.0.1`.

## Mobile-App

Flutter mit Riverpod und go_router, Karte mit flutter_map und OSM, Token in `flutter_secure_storage`, GlitchTip über `sentry_flutter`. Die App spricht dieselbe API wie das Web: Code per Mail anfordern (`POST /api/v1/auth/code`), Code gegen Session-Token tauschen (`/auth/code/verify`) oder per Passkey anmelden (`/auth/passkeys/login`), danach Bearer-Token. Einen eigenen Server braucht sie nicht.

### Neues Projekt

1. Umbenennen, `<slug>` ohne Bindestrich:
   ```sh
   cd apps/mobile
   grep -rlE 'org\.pleasance\.starter|starter\.pleasance\.org' lib android ios ../../packages/shared/src | xargs sed -i 's/org\.pleasance\.starter/org.pleasance.<slug>/g; s/starter\.pleasance\.org/<slug>.pleasance.org/g'
   mv android/app/src/main/kotlin/org/pleasance/starter android/app/src/main/kotlin/org/pleasance/<slug>
   ```
   Anzeigename in `lib/config.dart` (`appName`), `android/app/src/main/AndroidManifest.xml` (`android:label`) und `ios/Runner/Info.plist` (`CFBundleDisplayName`). Den Farbband-Ausschnitt wie im Web in `lib/config.dart` (`appBand`).
2. Lokal starten, die API läuft dabei über `bun run dev`:
   ```sh
   cd apps/mobile
   flutter run                                              # iOS-Simulator
   flutter run --dart-define=API_URL=http://10.0.2.2:3000   # Android-Emulator
   ```
   Auf einem echten Gerät die LAN-IP des Laptops nehmen. Ohne `SMTP_HOST` steht der Code im API-Log.

### Update-Pflicht

Ohne sie bleiben alte Versionen für immer im Umlauf, darum gehört sie vor den ersten Store-Build. Release-Builds kennen ihre Build-Nummer (`--dart-define=BUILD_NUMBER`, dieselbe CI-Run-Nummer wie `--build-number`) und senden sie mit der Plattform als `X-App-Build` und `X-App-Platform` an jede Anfrage. Liegt sie unter `MIN_BUILD_IOS` bzw. `MIN_BUILD_ANDROID` (Coolify, leer = kein Minimum), antwortet die API auf `/api/v1/*` mit 426 und `{ error, code: 'UPDATE_REQUIRED' }`, nur Feedback bleibt offen. Beim Start fragt die App `GET /api/v1/app` (höchstens 10 Sekunden, offline oder bei Fehlern startet sie normal) und zeigt bei 426 nur den Update-Screen mit Link in den Store. Web und lokale Builds (Build-Nummer 0) senden nichts und werden nie gesperrt.

- Vor dem ersten Store-Build die Apple-ID der App aus App Store Connect („App-Informationen“) als `appStoreId` in `lib/config.dart` eintragen. Der Play-Link nimmt `appId`.
- Ein Minimum erst anheben, wenn ein neuerer Build in diesem Store live ist, sonst sperrt es alle aus. Die Build-Nummer steht in App Store Connect bzw. der Play Console.
- Bekommt Android einen Offset auf `--build-number` (siehe „Release“), denselben auch bei `BUILD_NUMBER` setzen.
- Eine Share-Extension oder ein anderer nativer Client sendet dieselben Header, sonst wird er nie gesperrt.

### Release

`.github/workflows/mobile.yml` prüft jede Änderung an der App mit `flutter analyze`, `flutter test` und `node --test tool/testflight.test.mjs` (in `apps/mobile`). Auf `main` baut die CI für Android ein AAB als Artefakt und lädt es bei eingerichtetem Play-Zugang in den internen Test hoch. Auch Release-Tags und manuelle Starts laden Android in den internen Play-Test, bei manuellen Starts vom ausgewählten Branch oder Tag. Der Paketname kommt aus `applicationId` in `apps/mobile/android/app/build.gradle.kts`. Zu TestFlight lädt sie iOS nur bei einem Release-Tag `v*` oder von Hand mit `gh workflow run mobile.yml`, denn ein macOS-Lauf kostet in privaten Repos etwa 60 Actions-Minuten. Manuelle Läufe verteilen nur intern, auch wenn beim Start ein Tag gewählt wird. Nur ein gepushter Release-Tag verteilt zusätzlich an die externe Gruppe und reicht den Build zur Beta-Prüfung ein. Release-Tags setzen Agenten nur nach Robins Ja, denn die externe Verteilung benachrichtigt die Tester. Bei App-Änderungen, die Nutzer merken, fragen sie im Abschluss danach.

- **GitHub-Variablen:** `API_URL` (`https://<domain>`, ohne werden beide Release-Jobs übersprungen), `SENTRY_DSN` (eigenes GlitchTip-Projekt für die App), `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_BUNDLE_ID` (`org.pleasance.<slug>`, muss zur iOS-App passen), `TESTFLIGHT_INTERNAL_GROUP` und `TESTFLIGHT_EXTERNAL_GROUP` (exakte Gruppennamen in App Store Connect, extern nur für Release-Tags erforderlich).
- **GitHub-Secrets:** `ASC_KEY_P8` (App-Store-Connect-API-Key, base64), `IOS_DEV_CERTIFICATE` (festes „Apple Development“-Zertifikat als base64-PKCS12, läuft am 04.10.2027 ab), `IOS_DEV_CERTIFICATE_PASSWORD`, `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `PLAY_SERVICE_ACCOUNT_JSON` (Dienstkonto-JSON im Original, nicht base64).
- Ohne `ASC_KEY_ID` wird der iOS-Job übersprungen, ohne `IOS_DEV_CERTIFICATE` bricht er ab. Ohne festes Zertifikat legt Xcode pro Lauf ein neues an, bis die Zertifikatsgrenze des Teams erreicht ist. Ohne Keystore signiert Android mit Debug-Keys (nur zum Testen).
- **Android über Play einrichten:** Robin legt die App unter `play@pleasance.org` (Organisation Pleasance) in der Play Console an; nur Robin meldet sich dort an. Im GCP-Projekt der jeweiligen App die Android Publisher API (`androidpublisher.googleapis.com`) aktivieren und ein eigenes Dienstkonto anlegen. Robin lädt dessen E-Mail in der Play Console nur für diese App mit „App-Informationen ansehen“ und „Releases für Test-Tracks freigeben“ ein. Den JSON-Key als `PLAY_SERVICE_ACCOUNT_JSON` im App-Repo hinterlegen. [Google: API-Zugang einrichten](https://developers.google.com/android-publisher/getting_started).
- Zuerst die vier `ANDROID_KEYSTORE_*`-/`ANDROID_KEY_*`-Secrets für den Upload-Keystore hinterlegen, einen CI-Lauf starten und das Artefakt `android-aab` herunterladen. Robin lädt dieses AAB einmal von Hand in den internen Play-Test hoch und veröffentlicht den internen Release. Erst danach die Repo-Variable `PLAY_UPLOAD=true` setzen: Vor dem ersten manuellen Upload nimmt die Play-API das Paket nicht an. Weitere Läufe laden nur hoch, wenn Keystore, `PLAY_SERVICE_ACCOUNT_JSON` und `PLAY_UPLOAD=true` vorhanden sind. [Upload-Action und Ersteinrichtung](https://github.com/r0adkll/upload-google-play).
- Im internen Test eine E-Mail-Liste mit bis zu 100 Testern auswählen und den Beitrittslink teilen; jede Adresse muss zu einem Google-Konto gehören. Interne Tests benötigen keine reguläre Google-Prüfung. Tester installieren und aktualisieren über Play statt per APK. [Google: internen Test einrichten](https://support.google.com/googleplay/android-developer/answer/9845334?hl=de).
- Android nutzt bereits `GITHUB_RUN_NUMBER` als steigenden `versionCode`. Bei Übernahme in eine bestehende App muss dieser über allen bisher hochgeladenen Codes liegen; bei Bedarf im Android-Build dauerhaft einen festen Offset ergänzen (`--build-number=$((GITHUB_RUN_NUMBER + n))`, ebenso bei `BUILD_NUMBER`, siehe „Update-Pflicht“). Ein neuer Lauf erhöht die Nummer, „Re-run“ desselben Laufs nicht: Ein bereits hochgeladenes AAB nicht mit derselben Nummer erneut bauen und hochladen.
- **Play App Signing:** Google signiert die installierte App mit einem eigenen App-Signaturschlüssel. Falls Google Maps genutzt wird, dessen SHA-1 aus der Play Console zusätzlich beim Android-Maps-Key erlauben. Für App-Links und Passkeys dessen SHA-256 neben dem Upload-Key in `ANDROID_CERT_SHA256` hinterlegen; daraus liefert die API `/.well-known/assetlinks.json` (siehe „Passkeys“). Der Upload-Key allein genügt für die aus Play installierte App nicht.
- Die App vorher in App Store Connect mit der Bundle-ID anlegen. Team-ID steht in `ios/ExportOptions.plist` und im Xcode-Projekt.
- In App Store Connect eine interne Gruppe mit „Enable automatic distribution“ anlegen; das lässt sich per API nicht nachträglich einschalten. Eine bestehende Gruppe ohne diese Einstellung durch eine entsprechend angelegte ersetzen und die Tester übernehmen. Für Release-Tags außerdem eine externe Gruppe mit Testern anlegen und Beta-Testinformationen, Review-Kontakt, gegebenenfalls Testzugang sowie Export-Compliance vervollständigen. [Apples Anleitung für interne Gruppen](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers).
- Der Ubuntu-Job `testflight` wartet nach dem Upload bis zu einer Stunde auf Verarbeitung und nachgewiesene interne Sichtbarkeit. Release-Tags ordnen den Build außerdem der externen Gruppe zu und reichen ihn zur Beta-Prüfung ein; Apple entscheidet über die Freigabe. Fehlende Gruppen, falsche Gruppentypen, Verarbeitungsfehler oder fehlende Review-Voraussetzungen lassen den Job scheitern. Ein erfolgreicher Upload allein genügt nicht.
- `apps/mobile/tool/testflight.mjs` nutzt Node 22 ohne weitere Abhängigkeiten, sucht gezielt nach iOS-Builds der Version aus `pubspec.yaml` und kann nach einem Teilfehler mit denselben `ASC_*`- und `TESTFLIGHT_*`-Variablen erneut laufen: `node tool/testflight.mjs <build number>` für intern, `node tool/testflight.mjs --release <build number>` für intern und extern. Bereits erfolgte Zuordnungen und eingereichte oder freigegebene Reviews werden erkannt. Dafür den Stand mit der passenden `pubspec.yaml` auschecken. Den vorhandenen Build so erneut verteilen, statt den iOS-Build mit derselben Nummer erneut hochzuladen.
- Release-Builds sind mit `--obfuscate` gebaut, Stacktraces aus der App (auch in GlitchTip) zeigen nur verschleierte Namen. Die Symbole liegen 90 Tage als Artefakt `symbols-android` bzw. `symbols-ios` am CI-Lauf, die Build-Nummer der App ist dessen Run-Nummer (`gh run list -w mobile.yml --json number,databaseId` liefert die Run-ID dazu). Lesbar machen:
  ```sh
  gh run download <run-id> -n symbols-android -D /tmp/symbols
  flutter symbolize -i trace.txt -d /tmp/symbols/app.android-arm64.symbols   # iOS: app.ios-arm64.symbols
  ```
  `trace.txt` ist der rohe Stacktrace mit `build_id` und `abs …/virt …`-Zeilen (z. B. aus `adb logcat`). Builds, die älter als 90 Tage sind, lassen sich nicht mehr symbolisieren.
