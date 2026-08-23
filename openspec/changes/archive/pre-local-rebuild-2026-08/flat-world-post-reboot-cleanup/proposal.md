## Why

The flat-world reboot is functionally in place, but it left behind a few globe-era artifacts that make the repo harder to maintain than it needs to be. Cleaning them up now keeps the new direction clear, reduces dead shipped assets, and makes future edits less error-prone.

## What Changes

- Replace the Windows-broken shell-based vendor refresh path with a cross-platform Node-based sync and stop vendoring Three.js CSS3D and post-processing addons that are no longer referenced by the flat-world client.
- Update the vendor copy script so future vendor refreshes only include assets the current renderer actually uses.
- Restore readability and maintainability for test artifacts that were rewritten into hard-to-review single-line output during the reboot.
- Rebuild generated browser files from source after cleanup so checked-in client artifacts match the maintained TypeScript sources.

## Capabilities

### New Capabilities
- `renderer-asset-hygiene`: vendored browser renderer assets match the runtime imports used by the flat-world client and exclude dead globe-era baggage.
- `artifact-maintainability`: maintained source and test files stay readable, and generated browser artifacts are refreshed from source after cleanup work.

### Modified Capabilities
<!-- None. No archived top-level specs exist yet. -->

## Impact

- `scripts/vendor-three-addons.mjs` and `public/vendor/jsm/` for vendored renderer assets
- `tests/arena.test.ts` and generated `public/js/*.js` browser artifacts
- Flat-world maintenance workflow and future vendor refreshes
