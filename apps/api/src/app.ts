import type { Database } from '@app/db';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { t } from './lib/i18n';
import { captureException } from './monitoring';
import { agentRoutes } from './routes/agents';
import { altchaRoutes } from './routes/altcha';
import { authRoutes } from './routes/auth';
import { feedbackRoutes } from './routes/feedback';
import { passkeyRoutes, wellKnownRoutes } from './routes/passkeys';
import { updateRoutes } from './routes/updates';
import type { AppEnv } from './types';

export function createApp(db: Database) {
  return (
    new Hono<AppEnv>()
      .use(logger())
      .use(async (c, next) => {
        c.set('db', db);
        await next();
      })
      .onError((err, c) => {
        // Client errors such as malformed JSON keep their status and stay out of GlitchTip
        if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
        console.error('Unhandled error:', err);
        captureException(err);
        return c.json({ error: t(c).internalError }, 500);
      })
      // Public through the web proxy, so Uptime Kuma checks web, API and database in one go.
      // The CI compares revision with the deployed commit.
      .get('/api/health', async (c) => {
        await db.execute(sql`select 1`);
        return c.json({ status: 'ok', revision: process.env.APP_VERSION || 'dev' });
      })
      // /llms.txt, /llms-full.txt and <page>.md, forwarded by the web server
      .route('/', agentRoutes)
      .route('/', wellKnownRoutes)
      // The app sends its platform and build number. Below the minimum from the env it gets 426
      // and shows only the update screen, feedback stays open. Web and local builds send nothing.
      .use('/api/v1/*', async (c, next) => {
        const platform = c.req.header('x-app-platform');
        const minimum =
          Number(
            platform === 'ios' ? process.env.MIN_BUILD_IOS : platform === 'android' ? process.env.MIN_BUILD_ANDROID : 0,
          ) || 0;
        const build = Number(c.req.header('x-app-build'));
        if (c.req.path !== '/api/v1/feedback' && Number.isInteger(build) && build > 0 && build < minimum) {
          return c.json({ error: t(c).updateRequired, code: 'UPDATE_REQUIRED' }, 426);
        }
        await next();
      })
      // The app asks this at launch, the check above answers it
      .get('/api/v1/app', (c) => c.json({ ok: true }))
      .basePath('/api/v1')
      .route('/altcha', altchaRoutes)
      .route('/auth', authRoutes)
      .route('/auth/passkeys', passkeyRoutes)
      .route('/feedback', feedbackRoutes)
      .route('/updates', updateRoutes)
  );
}
