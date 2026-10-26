import { sentryPrivacyOptions } from '@app/shared';
import * as Sentry from '@sentry/browser';
import type { HandleClientError } from '@sveltejs/kit/hooks';
import posthog from 'posthog-js';
import { PUBLIC_POSTHOG_KEY, PUBLIC_SENTRY_DSN } from '$app/env/public';

Sentry.init({
  ...sentryPrivacyOptions,
  dsn: PUBLIC_SENTRY_DSN,
  sendClientReports: false,
  integrations: (defaults) =>
    defaults.filter((integration) => !['BrowserSession', 'Breadcrumbs', 'HttpContext'].includes(integration.name)),
});

// Usage analytics, off without a key. Cookieless needs no consent banner but
// must also be switched on in the PostHog project settings. The server
// forwards /ingest to PostHog EU, so the CSP stays at 'self'.
if (PUBLIC_POSTHOG_KEY) {
  posthog.init(PUBLIC_POSTHOG_KEY, {
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-08-30',
    cookieless_mode: 'always',
    disable_session_recording: true,
    capture_exceptions: false,
  });
}

export const handleError: HandleClientError = ({ error }) => {
  Sentry.captureException(error);
};
