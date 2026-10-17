# starter

Vorlage für Web- und Mobile-Prototypen: Bun, Hono, SvelteKit, Drizzle und Postgres, dazu optional eine Flutter-App gegen dieselbe API. Deutsch und Englisch mit Umschalter in der Fußzeile, Login per Mail mit Link und Code (Web) oder Code (App) und per Passkey, Feedback-Knopf mit Screenshot, Update-Mails mit Opt-in, Link-Vorschau, Mail über SMTP im Design der App, Rate-Limit, Security-Header mit CSP, GlitchTip, PostHog, Healthcheck, CI mit Browser-Test, Secret-Scan, Dependabot, Coolify-Deploy und Screenshots nach jedem Deploy sind fertig eingebaut.

## Neues Projekt

1. Einen Slug aus ASCII-Kleinbuchstaben und Ziffern wählen, beginnend mit einem Buchstaben, ohne Bindestrich (z. B. `savor`). Repo und lokaler Ordner heißen gleich: `~/dev/<slug>`. Repo aus der Vorlage anlegen: `gh repo create robinchoice/<slug> --template robinchoice/starter --public --clone`. Repos sind öffentlich, danach Push Protection einschalten (siehe „Secret-Scan“), die Vorlage vererbt sie nicht: `gh api -X PATCH repos/robinchoice/<slug> --input - <<<'{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}'`
2. `APP_NAME` und `APP_BAND` in `packages/shared/src/index.ts` setzen. Welcher Ausschnitt aus dem Farbband passt, steht in DESIGN.md.
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
| `packages/shared` | App-Name, zod-Schemas und Typen für API und Web |
| `apps/mobile` | Flutter-App, siehe unten. Reine Web-Projekte löschen den Ordner und `.github/workflows/mobile.yml` |

Befehle: `bun run dev`, `check` (Biome und Typen), `format`, `test`, `build`, `db:generate`, `standards` (Übersicht der Standards auf http://localhost:4300), in `apps/web` außerdem `screenshots` (siehe „Screenshots“) und `og-image` (Vorschaubild für geteilte Links, DESIGN.md). `test` umfasst die API-Tests und Browser-Tests von Login, Feedback, Update-Mails, Link-Vorschau und Agenten-Zugang (Playwright, baut das Web und startet API und Web-Build selbst auf eigenen Ports 53100 und 54100, nie die laufenden Dev-Server, so greift die CSP wie in Produktion; testen zwei Worktrees gleichzeitig, bekommt einer andere per `TEST_API_PORT` und `TEST_WEB_PORT`). Beide laufen gegen `DATABASE_URL` und legen nur Testkonten mit frischen Adressen an.

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
- Den Screenshot liefert `/api/v1/feedback/<id>/screenshot` ohne Login, damit GitHub ihn im Issue anzeigen kann. Die zufällige ID ist der Schlüssel.
- Das Repo backt die CI als `GITHUB_REPOSITORY` ins API-Image. Ohne `FEEDBACK_GITHUB_TOKEN` entsteht kein Issue, ohne `FEEDBACK_EMAIL` keine Mail.

## Update-Mails

Nutzer bekommen neue Funktionen per Mail, wenn sie es wollen. Gespeichert wird alles in der Datenbank der App, verschickt über das SMTP aus `lib/mail.ts`.

- Opt-in: Standard ist aus, denn die Prototypen sind kostenlos und die Bestandskunden-Ausnahme aus § 7 Abs. 3 UWG greift nicht. Unter dem Login-Formular steht eine nicht vorausgewählte Checkbox, sie gilt erst, wenn der Login-Link oder Code eingelöst wird. Das ist zugleich das Double-Opt-in. Geschaltet wird jederzeit unter `/settings` (Web) bzw. im Profil (App). `users.updates_consent_at` hält den Zeitpunkt der Einwilligung als Nachweis, `users.locale` die Sprache der Mails.
- Abmelden: Jede Update-Mail hat einen Link auf `/unsubscribe?token=…`, der ohne Login abbestellt, dazu `List-Unsubscribe` und `List-Unsubscribe-Post` für One-Click im Mail-Programm. Der Token steht pro Konto in `users.unsubscribe_token`.
- Entwürfe schreiben Agenten als `updates/<datum>-<thema>.md`, etwa aus den Commits seit der letzten Datei dort. Je Sprache eine Überschrift `# de: Titel` bzw. `# en: Titel`, darunter die Features als Liste `- …`, optional ein Bild `![](bild.png)` neben der Datei (PNG oder JPEG). Die API legt jede Datei beim Start einmal als Entwurf an und überschreibt ihn danach nie. `bun run test` prüft alle Dateien.
- Senden: `/admin/updates`, nur für `ADMIN_EMAILS`, also nie für admin@pleasance.org. Dort Entwürfe bearbeiten oder neu anlegen, Vorschau je Sprache, „Testmail an mich“ in beiden Sprachen, dann „An … Abonnenten senden“. Den Versand löst nur Robin aus, denn das ist eine Mail in seinem Namen an Dritte. Versendete Updates bleiben mit Datum und Zahlen stehen und lassen sich nicht mehr ändern.
- Versand: Pro Empfänger entsteht eine Zeile in `update_deliveries`. Der Service `worker` (`apps/api/src/worker.ts`, gleiches Image wie die API) schickt sie gedrosselt, alle `UPDATE_MAIL_INTERVAL_MS` (Standard 6 s) eine Mail, mit drei Versuchen und einer Minute Pause nach einem Fehler. Wer zwischendurch abbestellt, wird übersprungen. Fehler stehen mit Update- und Zustell-ID im Log, ohne Adresse. Lokal: `bun run worker` in `apps/api`.
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

Agenten zeigen Änderungen hinter dem Login in der Savor-Vorschau mit dem Testkonto admin@pleasance.org, dem agentischen Admin. Admin-Rechte in der App hat es nicht (siehe „Registrierung öffnen“). `login-link <slug>` aus dem Kontor ruft dafür im API-Container `bun apps/api/src/login-link.ts <email>` auf. Das gibt einen einmaligen Login-Link aus, 15 Minuten gültig wie ein gemailter, den der Agent per `browser_navigate` öffnet. Die Vorschau hat pro Projekt ein festes Profil, und Sessions in Benutzung verlängern sich bei jedem Besuch auf 365 Tage. Also bleibt sie angemeldet.

## Registrierung öffnen

Prototypen sind von außen erreichbar, aber geschlossen, bis Robin ausdrücklich das Go gibt, externe Nutzer aufzunehmen. Bis dahin legen Magic Link und App-Code neue Konten nur für die Adressen in `SIGNUP_ALLOWLIST` an (kommagetrennt, dauerhafte Adressen wie Robins). Bestehende Konten melden sich immer an, Passkeys gibt es nur für sie. Fremde bekommen bei `/auth/magic-link` und `/auth/code` die Meldung „Die Registrierung ist noch geschlossen“, es geht keine Mail raus. Seiten ohne Login bleiben offen.

- Tester aufnehmen: Ein Admin klickt in der App oben auf „Tester einladen“ (`/invite`) und gibt die Adresse ein. Das legt das Konto an und schickt einen Login-Link, ohne Coolify und Redeploy. Danach meldet sich der Tester wie jedes bestehende Konto an, auch wenn der Link abläuft. Admins sind die Adressen in `ADMIN_EMAILS` (kommagetrennt, Standard robin@pleasance.org, der menschliche Admin), die API prüft das. Einladen öffnet nichts, `SIGNUP_OPEN` bleibt, wie es ist.
- admin@pleasance.org, der agentische Admin, kommt nie in `ADMIN_EMAILS`: Agenten melden sich damit in der Vorschau an und dürfen weder Konten an der Registrierung vorbei anlegen noch Dritte anmailen.
- Öffnen, erst nach Robins Go: `SIGNUP_OPEN=true` in Coolify setzen und neu deployen. Prüfen: Login-Link an eine neue Adresse anfordern.
- `login-link` legt Konten selbst an, das Testkonto der Savor-Vorschau braucht keinen Eintrag. Das Skript nimmt jede Adresse, die Grenze sitzt auf dem Server: Agenten kommen nicht in den Container, sondern nur über das root-eigene `login-link` aus dem Kontor, und das übergibt fest admin@pleasance.org. Wer selbst in den Container kommt, hat ohnehin die Datenbank.

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
4. DNS über die Porkbun-API: A-Einträge für `@` und `www` auf VPS 1, TTL 600.
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

### Release

`.github/workflows/mobile.yml` prüft jede Änderung an der App mit `flutter analyze` und `flutter test`. Auf `main` baut die CI für Android ein signiertes AAB als Artefakt. Zu TestFlight lädt sie iOS nur bei einem Release-Tag `v*` oder von Hand mit `gh workflow run mobile.yml`, denn ein macOS-Lauf kostet in privaten Repos etwa 60 Actions-Minuten.

- **GitHub-Variablen:** `API_URL` (`https://<domain>`, ohne werden beide Release-Jobs übersprungen), `SENTRY_DSN` (eigenes GlitchTip-Projekt für die App), `ASC_KEY_ID` und `ASC_ISSUER_ID`.
- **GitHub-Secrets:** `ASC_KEY_P8` (App-Store-Connect-API-Key, base64), `IOS_DEV_CERTIFICATE` (festes „Apple Development“-Zertifikat als base64-PKCS12, läuft am 04.10.2027 ab), `IOS_DEV_CERTIFICATE_PASSWORD`, `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- Ohne `ASC_KEY_ID` wird der iOS-Job übersprungen, ohne `IOS_DEV_CERTIFICATE` bricht er ab. Ohne festes Zertifikat legt Xcode pro Lauf ein neues an, bis die Zertifikatsgrenze des Teams erreicht ist. Ohne Keystore signiert Android mit Debug-Keys (nur zum Testen).
- Die App vorher in App Store Connect mit der Bundle-ID anlegen. Team-ID steht in `ios/ExportOptions.plist` und im Xcode-Projekt.
- Release-Builds sind mit `--obfuscate` gebaut, Stacktraces aus der App (auch in GlitchTip) zeigen nur verschleierte Namen. Die Symbole liegen 90 Tage als Artefakt `symbols-android` bzw. `symbols-ios` am CI-Lauf, die Build-Nummer der App ist dessen Run-Nummer (`gh run list -w mobile.yml --json number,databaseId` liefert die Run-ID dazu). Lesbar machen:
  ```sh
  gh run download <run-id> -n symbols-android -D /tmp/symbols
  flutter symbolize -i trace.txt -d /tmp/symbols/app.android-arm64.symbols   # iOS: app.ios-arm64.symbols
  ```
  `trace.txt` ist der rohe Stacktrace mit `build_id` und `abs …/virt …`-Zeilen (z. B. aus `adb logcat`). Builds, die älter als 90 Tage sind, lassen sich nicht mehr symbolisieren.
