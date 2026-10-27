import type { Database } from '@app/db';
import { APP_NAME, LINKS } from '@app/shared/app';
import type { Messages } from '@app/shared/messages';

// A page anyone sees without logging in. Agents get it as <path>.md, listed in
// llms.txt and joined in llms-full.txt (routes/agents.ts). body is Markdown
// below the title and description and carries the page's content, not its
// layout. path is the page's URL, so the browser test can open it.
export type PublicPage = { path: string; title: string; description: string; body?: string };

// Every public page with its own content, in the given language. Never
// anything behind the login, no accounts, no user data, no admin pages.
// Content of one user only counts if they published it for everyone.
export async function publicPages(_db: Database, m: Messages): Promise<PublicPage[]> {
  return [{ path: '/', title: APP_NAME, description: m.tagline, body: landing(m) }];
}

// The landing page (apps/web/src/routes/+page.svelte) from the same texts
function landing(m: Messages) {
  const list = (items: { title: string; text: string }[]) =>
    items.map((item) => `- **${item.title}**: ${item.text}`).join('\n');
  const links = [
    [m.appStore, LINKS.appStore],
    [m.googlePlay, LINKS.googlePlay],
    [m.sourceCode, LINKS.repo],
  ]
    .filter(([, url]) => url)
    .map(([label, url]) => `- [${label}](${url})`)
    .join('\n');
  return [
    m.pitch,
    `## ${m.highlightsTitle}`,
    list(m.highlights),
    `## ${m.valuesTitle}`,
    list(m.values),
    `## ${m.closingTitle}`,
    links,
  ].join('\n\n');
}
