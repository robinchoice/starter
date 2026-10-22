import { sentryPrivacyOptions } from '@app/shared';
import * as Sentry from '@sentry/bun';

Sentry.init({
  ...sentryPrivacyOptions,
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION,
  defaultIntegrations: false,
  integrations: [Sentry.onUncaughtExceptionIntegration(), Sentry.onUnhandledRejectionIntegration({ mode: 'strict' })],
});

export const captureException = Sentry.captureException;
