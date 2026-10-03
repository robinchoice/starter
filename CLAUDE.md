# Konventionen

Stack und Aufbau: siehe README.md.

- Neue Tabelle: `packages/db/src/schema.ts` ändern, `bun run db:generate`. Die Migration läuft beim nächsten API-Start.
- Neue Route: Datei in `apps/api/src/routes`, in `app.ts` einhängen. `requireAuth` für eingeloggte Nutzer (danach `c.get('user')`), `validJson(schema)` mit dem Schema aus `packages/shared`.
- Fehler antworten immer als `{ error: string }`, Text auf Deutsch für Nutzer. Das Web zeigt ihn als Toast.
- Alles, was Mails verschickt oder Geheimnisse prüft, bekommt ein `rateLimit` aus `lib/rate-limit.ts`.
- Mails über `sendMail` aus `lib/mail.ts`.
- Web: API-Aufrufe über `api` aus `$lib/api`, Login-Zustand aus `$lib/auth.svelte`. Seiten hinter dem Login unter `routes/(app)`.
- Vor „fertig“: `bun run check && bun run test && bun run build`.
- Ein Push auf `main` deployt nach grüner CI.
