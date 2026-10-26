// Compiles the CLI into one file named like the app (README, „CLI“). The CI
// bakes in its APP_URL, so the file talks to the live app from the start.
// Further arguments go to bun build, such as --target=bun-darwin-arm64.
import { $ } from 'bun';
import { LIVE_URL, SLUG } from './src/config';

const url = process.env.APP_URL || LIVE_URL;
await $`bun build src/main.ts --compile --no-compile-autoload-dotenv --no-compile-autoload-bunfig --minify --outfile build/${SLUG} --define process.env.CLI_URL=${JSON.stringify(url)} ${process.argv.slice(2)}`;
