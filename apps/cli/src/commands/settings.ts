import { dateLocales } from '@app/shared';
import { z } from 'zod';
import { type Command, EXIT, Failure, str } from '../command';
import { SLUG } from '../config';
import { currentUser, userSchema } from './auth';

// Example of a command for the app's own thing: what /settings shows in the
// web, read and changed over the same API. New commands follow it (README, „CLI“).
export const settings: Command = {
  help: (m) => [['settings [--name <name>] [--updates on|off]', m.cliSettingsHelp]],
  options: { name: { type: 'string' }, updates: { type: 'string' } },
  async run(ctx) {
    const { values, m, locale, api, session } = ctx;
    const name = str(values.name);
    const flag = str(values.updates);
    if (flag !== undefined && flag !== 'on' && flag !== 'off') {
      throw new Failure(m.cliBadOptions('--updates on|off', SLUG), EXIT.usage);
    }
    if (!session) throw new Failure(m.notLoggedIn, EXIT.loggedOut);

    const updates = flag === undefined ? undefined : flag === 'on';
    const user =
      name === undefined && updates === undefined
        ? await currentUser(ctx)
        : (await api.patch('/auth/me', z.object({ user: userSchema }), { name, updates })).user;

    const since = user.updatesSince && new Date(user.updatesSince).toLocaleDateString(dateLocales[locale]);
    return {
      data: { user },
      text: [
        `${m.displayName}: ${user.name}`,
        `${m.email}: ${user.email}`,
        `${m.updatesByMail}: ${since ? m.updatesSince(since) : m.updatesOff}`,
      ].join('\n'),
    };
  },
};
