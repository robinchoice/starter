# starter-web

Vorlage für Web-Prototypen: Bun, Hono, SvelteKit, Drizzle und Postgres. Login per Magic Link, Mail über SMTP, Rate-Limit, GlitchTip, Healthcheck, CI und Coolify-Deploy sind fertig eingebaut.

## Neues Projekt

1. Repo aus der Vorlage anlegen: `gh repo create robinchoice/<name> --template robinchoice/starter-web --private --clone`
2. `APP_NAME` in `packages/shared/src/index.ts` setzen.
3. Lokal starten:
   ```sh
   cp .env.example .env
   docker compose up -d
   bun install
   bun run dev
   ```
   Web läuft auf http://localhost:5173, die API auf Port 3000. Ohne `SMTP_HOST` stehen die Login-Links im API-Log.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `apps/api` | Hono-API unter `/api/v1`, Migrationen beim Start, `/api/health` prüft auch die DB |
| `apps/web` | SvelteKit. Leitet `/api` an die API weiter, im Dev macht das der Vite-Proxy. Seiten hinter dem Login liegen unter `routes/(app)` |
| `packages/db` | Drizzle-Schema und Migrationen |
| `packages/shared` | App-Name, zod-Schemas und Typen für API und Web |

Befehle: `bun run dev`, `check`, `test`, `build`, `db:generate`. Die API-Tests laufen gegen `DATABASE_URL` und legen nur Testkonten mit frischen Adressen an.

## Deploy auf Coolify

1. Ressource aus dem GitHub-Repo im Projekt `pleasance-<name>` oder `privat-<name>`, Build Pack „Docker Compose“, Datei `docker-compose.prod.yml`.
2. Domain nur beim Service `web` eintragen, mit Port: `https://<domain>:3000`.
3. Variablen aus `.env.production.example` setzen.
4. Auto-Deploy der Ressource ausschalten. In GitHub die Secrets `COOLIFY_TOKEN` (Coolify-API-Token mit Deploy-Recht) und `COOLIFY_UUID` (UUID der Ressource) setzen. Ab dann deployt die CI jeden grünen Push auf `main`.
5. GlitchTip: Projekt anlegen, DSN in `SENTRY_DSN` und `PUBLIC_SENTRY_DSN`.
6. Uptime Kuma: HTTP-Monitor auf `https://<domain>/api/health`.
7. Neue Software in `vps1/advisory-alarm` aufnehmen, siehe `infra.md`.
