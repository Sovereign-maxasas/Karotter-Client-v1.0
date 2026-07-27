# Karotter Client

Firefox Manifest V3 extension that adds keyboard shortcuts to Karotter.

## Structure

- `manifest.json`: browser entry point and Karotter match pattern.
- `content/main.js`: keyboard handling, DOM interaction, and the shortcut help UI.
- `content/`: content-side source only. Keep site-specific selectors in `SELECTORS`
  inside `main.js` so later site markup changes stay isolated.

## Local loading in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Choose this directory's `manifest.json`.

## Future improvements

- Add real extension icons before publishing.
- Add a background service worker only when persistent extension-owned state or
  privileged APIs are needed.
- Split `SELECTORS` into a tested Karotter adapter when the site exposes stable
  `data-*` attributes.
- Add unit tests for shortcut routing and adapter integration tests using a DOM
  fixture.

The manifest uses only cross-browser MV3 fields; Chrome compatibility mainly
requires changing the Gecko-specific `browser_specific_settings` block and
testing the match pattern.
