import { APP_NAME } from '@app/shared/app';
import { messages } from '@app/shared/messages';
import type { PageLoad } from './$types';

// The landing page's title in search results and link previews
export const load: PageLoad = async ({ parent }) => {
  const { locale } = await parent();
  return { meta: { title: `${APP_NAME}: ${messages[locale].tagline}` } };
};
