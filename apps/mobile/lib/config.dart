// The one place to rename a new project in Dart, see the README for the
// bundle IDs.
const appName = 'Starter';
const appId = 'org.pleasance.starter';

// Origin of the web app, which forwards /api to the API. Release builds get it
// from CI, debug builds talk to the local API from `bun run dev`.
const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://localhost:3000');

// OSM tiles are fine for prototypes. Heavier use needs a tile server of our own.
const mapTileUrl = String.fromEnvironment(
  'MAP_TILE_URL',
  defaultValue: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
);
