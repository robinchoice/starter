// The one place to rename a new project in Dart, see the README for the
// bundle IDs.
const appName = 'Starter';
const appId = 'org.pleasance.starter';

// Section of the family colour band, the same as APP_BAND in packages/shared.
// The starter shows the whole band until a project picks its own.
const appBand = (from: 1.0, to: 7.0);

// The same as LIVE in packages/shared: true once the project is live as 1.0.
// From then on the bug button waits for the test mode switch in the profile.
const live = false;

// Origin of the web app, which forwards /api to the API. Release builds get it
// from CI, debug builds talk to the local API from `bun run dev`.
const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://localhost:3000');

// Commit of the build, set by CI. Feedback sends it along.
const appVersion = String.fromEnvironment('APP_VERSION', defaultValue: 'dev');

// The CI run number, the same as the store build number. The API asks builds
// below MIN_BUILD_IOS/MIN_BUILD_ANDROID to update. Local builds have 0 and are never asked.
const buildNumber = int.fromEnvironment('BUILD_NUMBER');

// Apple ID of the app in App Store Connect (App Information), for the update
// screen. Set it before the first store build, README „Update-Pflicht“.
const appStoreId = '';

// OSM tiles are fine for prototypes. Heavier use needs a tile server of our own.
const mapTileUrl = String.fromEnvironment(
  'MAP_TILE_URL',
  defaultValue: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
);
