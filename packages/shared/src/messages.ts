// Every text that web and API show, one object per language. TypeScript reports
// any text that English lacks. The app has its own in lib/core/messages.dart.
const de = {
  // API errors. Custom zod messages in index.ts are keys from here.
  internalError: 'Interner Fehler',
  invalidInput: 'Ungültige Eingabe',
  invalidEmail: 'Die E-Mail-Adresse ist ungültig.',
  codeDigits: 'Der Code hat 6 Ziffern.',
  codeWrong: 'Der Code stimmt nicht oder ist abgelaufen.',
  linkExpired: 'Der Link ist abgelaufen oder wurde schon benutzt.',
  notLoggedIn: 'Nicht angemeldet',
  tooManyRequests: 'Zu viele Versuche — bitte später erneut probieren',
  notFound: 'Nicht gefunden',
  feedbackTooShort: 'Schreib bitte mindestens 5 Zeichen.',
  invalidImage: 'Der Screenshot muss ein PNG oder JPEG sein.',

  // Mails
  linkSubject: (app: string) => `Dein Login-Link für ${app}`,
  linkPrompt: 'Klick auf den Button, um dich einzuloggen:',
  linkPlain: 'Hier einloggen:',
  linkValid: 'Der Link gilt 15 Minuten. Wenn du ihn nicht angefordert hast, ignorier diese Mail.',
  codeSubject: (code: string, app: string) => `${code} ist dein Login-Code für ${app}`,
  codePrompt: 'Gib diesen Code in der App ein:',
  codePlain: 'Dein Code:',
  codeValid: 'Der Code gilt 15 Minuten. Wenn du ihn nicht angefordert hast, ignorier diese Mail.',

  // Web
  logIn: 'Einloggen',
  logOut: 'Abmelden',
  tagline: 'Ein Satz dazu, was dieser Prototyp kann.',
  openApp: 'Zur App',
  email: 'E-Mail',
  emailPlaceholder: 'du@example.com',
  linkIntro: 'Wir schicken dir einen Login-Link. Beim ersten Login legen wir dein Konto an.',
  sendLink: 'Login-Link senden',
  linkSent: 'Check deine E-Mails, der Login-Link ist unterwegs.',
  otherAddress: 'Andere Adresse',
  linkIncomplete: 'Der Link ist unvollständig.',
  loginFailed: 'Login fehlgeschlagen',
  requestNewLink: 'Neuen Login-Link anfordern',
  loggingIn: 'Login läuft …',
  hello: (name: string) => `Hallo ${name}`,
  prototypeStarts: 'Hier beginnt der Prototyp.',
  displayName: 'Anzeigename',
  save: 'Speichern',
  saved: 'Gespeichert',
  close: 'Schließen',
  madeBy: 'ein Werkzeug von',
  reportBug: 'Fehler melden',
  giveFeedback: 'Feedback geben',
  testMode: 'Testmodus',
  testModeHint: 'Zeigt den Käfer-Knopf, mit dem du Fehler samt Screenshot meldest.',
  bugPlaceholder: 'Was ist passiert? Was hast du erwartet?',
  ideaPlaceholder: 'Was fehlt dir, was wünschst du dir, was gefällt dir?',
  removeScreenshot: 'Screenshot entfernen',
  markSpot: 'Stelle markieren',
  markHint: 'Zieh einen Rahmen um die Stelle, die nicht stimmt.',
  done: 'Fertig',
  cancel: 'Abbrechen',
  sentAlong: 'Was mitgeschickt wird',
  contextPage: 'Seite',
  contextVersion: 'Version',
  contextDevice: 'Gerät',
  contextWindow: 'Fenster',
  contextLanguage: 'Sprache',
  contextErrors: 'Letzte Fehler',
  repliesTo: (email: string) => `Antworten bekommst du per Mail an ${email}.`,
  send: 'Senden',
  feedbackThanks: 'Danke! Wir melden uns per Mail.',
  // Label of the language button, in the language it switches to
  otherLanguage: 'English',
};

export type Messages = typeof de;

const en: Messages = {
  internalError: 'Internal error',
  invalidInput: 'Invalid input',
  invalidEmail: 'The email address is invalid.',
  codeDigits: 'The code has 6 digits.',
  codeWrong: 'The code is wrong or has expired.',
  linkExpired: 'The link has expired or was already used.',
  notLoggedIn: 'Not logged in',
  tooManyRequests: 'Too many attempts — please try again later',
  notFound: 'Not found',
  feedbackTooShort: 'Please write at least 5 characters.',
  invalidImage: 'The screenshot must be a PNG or JPEG.',

  linkSubject: (app) => `Your login link for ${app}`,
  linkPrompt: 'Click the button to log in:',
  linkPlain: 'Log in here:',
  linkValid: "The link is valid for 15 minutes. If you didn't request it, ignore this email.",
  codeSubject: (code, app) => `${code} is your login code for ${app}`,
  codePrompt: 'Enter this code in the app:',
  codePlain: 'Your code:',
  codeValid: "The code is valid for 15 minutes. If you didn't request it, ignore this email.",

  logIn: 'Log in',
  logOut: 'Log out',
  tagline: 'One sentence on what this prototype does.',
  openApp: 'Open the app',
  email: 'Email',
  emailPlaceholder: 'you@example.com',
  linkIntro: "We'll send you a login link. Your first login creates your account.",
  sendLink: 'Send login link',
  linkSent: 'Check your email, the login link is on its way.',
  otherAddress: 'Use another address',
  linkIncomplete: 'The link is incomplete.',
  loginFailed: 'Login failed',
  requestNewLink: 'Request a new login link',
  loggingIn: 'Logging in …',
  hello: (name) => `Hello ${name}`,
  prototypeStarts: 'This is where the prototype begins.',
  displayName: 'Display name',
  save: 'Save',
  saved: 'Saved',
  close: 'Close',
  madeBy: 'a tool by',
  reportBug: 'Report a bug',
  giveFeedback: 'Give feedback',
  testMode: 'Test mode',
  testModeHint: 'Shows the bug button for reporting bugs with a screenshot.',
  bugPlaceholder: 'What happened? What did you expect?',
  ideaPlaceholder: 'What are you missing, what would you like, what do you enjoy?',
  removeScreenshot: 'Remove screenshot',
  markSpot: 'Mark the spot',
  markHint: "Drag a frame around the spot that isn't right.",
  done: 'Done',
  cancel: 'Cancel',
  sentAlong: 'What gets sent along',
  contextPage: 'Page',
  contextVersion: 'Version',
  contextDevice: 'Device',
  contextWindow: 'Window',
  contextLanguage: 'Language',
  contextErrors: 'Recent errors',
  repliesTo: (email) => `Replies reach you by email at ${email}.`,
  send: 'Send',
  feedbackThanks: "Thanks! We'll get back to you by email.",
  otherLanguage: 'Deutsch',
};

export const messages = { de, en };

export type Locale = keyof typeof messages;

// The first language from a saved choice or an Accept-Language header that we
// speak, else German. Browsers list their languages by preference.
export function pickLocale(value: string | null | undefined): Locale {
  for (const part of value?.split(',') ?? []) {
    const lang = part.trim().slice(0, 2).toLowerCase();
    if (lang in messages) return lang as Locale;
  }
  return 'de';
}
