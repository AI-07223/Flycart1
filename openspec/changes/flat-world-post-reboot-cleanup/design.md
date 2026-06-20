## Context

The flat-world reboot replaced the old globe renderer and immersive CSS3D menu stack, but the repo still carries the vendor pipeline and checked-in assets that supported that older path. The current browser client imports only core `three`, yet `npm run vendor` still refreshes unused CSS3D and post-processing addons, the checked-in vendor tree still includes them, and the existing shell-based `cp` chain does not run on Windows.

At the same time, one of the rewritten test files ended up checked in as a single line. That does not break execution, but it does make review and maintenance materially harder. Because this repo intentionally checks in generated browser JavaScript, cleanup also needs to end with a regeneration step so committed artifacts stay aligned with the maintained TypeScript sources.

## Goals / Non-Goals

**Goals:**
- Align vendored renderer assets with the flat-world client's actual runtime imports.
- Remove dead globe-era vendor baggage from the repo and vendor refresh workflow.
- Restore readability for maintained test/source artifacts touched by the reboot.
- Rebuild checked-in browser JavaScript from source after cleanup.

**Non-Goals:**
- Changing gameplay, netcode, or the flat-world renderer behavior.
- Replacing the current build toolchain or asset strategy.
- Renaming every legacy `sphere` identifier in the reboot.

## Decisions

### 1. Remove unused addon vendoring at the script and HTML level

The cleanup will remove the `three/addons` import-map entry and make `scripts/vendor-three-addons.mjs` the cross-platform source of truth for browser vendoring, including pruning unused CSS3D/post-processing addons.

Why this over keeping dormant assets:
- The current renderer does not import them.
- Keeping dead vendor copies makes future contributors think those systems are still active.
- Removing the alias makes any accidental future addon dependency fail loudly instead of silently relying on stale baggage.

### 2. Treat checked-in browser JS as generated output that must be refreshed, not hand-fixed

Cleanup will be made in maintained source files first, then `npm run build-client` will regenerate the browser JavaScript.

Why this over patching `public/js/*.js` directly:
- Repository guidance already treats `src/client/` as the source of truth.
- Regeneration proves the build still produces the checked-in browser assets cleanly.

### 3. Keep maintainability fixes tightly scoped and behavior-neutral

Readability cleanup, such as restoring multi-line formatting in tests, will be limited to files already affected by the reboot and will avoid incidental stylistic churn elsewhere.

Why this over a broad formatting sweep:
- The repo does not use a dedicated formatter.
- Wide cosmetic diffs would make it harder to review the meaningful cleanup.

## Risks / Trade-offs

- Removing unused addon vendoring could break a hidden import path → Mitigation: verify with code search plus build/test after cleanup.
- Rebuilding generated browser files adds diff noise → Mitigation: regenerate only after the source cleanup is complete and keep the change scoped.
- Readability-only file normalization can look larger than the logic change → Mitigation: limit it to clearly affected files and pair it with the functional vendor cleanup in one documented change.

## Migration Plan

1. Remove dead addon references from the vendor script and HTML import map.
2. Delete the now-unused vendored addon files from `public/vendor/jsm/`.
3. Restore readable formatting for maintained test artifacts affected by the reboot.
4. Regenerate browser JS from `src/client/`.
5. Run build and tests to confirm behavior is unchanged.

Rollback strategy:
- Revert the cleanup change. No data migration or runtime state migration is involved.

## Open Questions

- None. The flat-world client import surface is already small enough to verify directly from the repo.
