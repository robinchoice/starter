import type { Band } from './band';

// The one place to rename a new project. API mails and web titles read it.
export const APP_NAME = 'Starter';

// Bundle ID and Android package of the app, the same as appId in
// apps/mobile/lib/config.dart. The API names it for passkeys in the app.
export const APP_ID = 'org.pleasance.starter';

// Section of the family colour band for this product, see DESIGN.md. The
// starter shows the whole band until a project picks its own.
export const APP_BAND: Band = { from: 1, to: 7 };

// Links on the landing page and in the footer. Store links stay empty, and
// their buttons hidden, until the app is listed there (README, "Landingpage").
export const LINKS = {
  repo: 'https://github.com/robinchoice/starter',
  imprint: 'https://pleasance.org/impressum.html',
  privacy: 'https://pleasance.org/datenschutz.html',
  appStore: '',
  googlePlay: '',
};

// True once the project is live as 1.0 (README, "Live als 1.0"). From then on
// the bug button waits for the test mode switch, see testMode in the web's feedback.svelte.ts.
export const LIVE = false;
