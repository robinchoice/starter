// Passkeys belong to the domain of APP_URL, the relying party. Under another
// domain they stop working and users log in by mail once (README, „Passkeys“).
// The Android app signs in as its signing certificate instead of the domain.
export function relyingParty() {
  const url = new URL(process.env.APP_URL);
  const android = androidCertificates().map(
    (fingerprint) =>
      `android:apk-key-hash:${Buffer.from(fingerprint.replaceAll(':', ''), 'hex').toString('base64url')}`,
  );
  return { rpID: url.hostname, origins: [url.origin, ...android] };
}

// SHA-256 fingerprints as AA:BB:…, comma-separated: Play's app signing key,
// the upload key and for tests on a device the debug key
export function androidCertificates() {
  return (process.env.ANDROID_CERT_SHA256 ?? '')
    .split(',')
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
}
