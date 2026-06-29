## Why

SmashCart now has working entry flows, local Wi-Fi room discovery, and cosmetic plane options, but the UI still feels assembled rather than authored. The current hangar is a thin tabbed picker, the selected plane is not treated as part of the pre-match experience, and local Wi-Fi play is functional without feeling like a first-class launch path.

## What Changes

- Introduce a proper **Customize Your Plane** system: a full-screen loadout editor for airframe, paint, accent, livery, and trail with a large live preview, a readable loadout summary, preset slots, plus reset and randomize actions. Cosmetics remain visual-only.
- Redesign the pre-match menu into a **preflight command surface** where the selected aircraft is always visible, room/share status has a deliberate place, and public, private, and local-Wi-Fi entry points are clearly separated.
- Integrate the existing local Wi-Fi room-browser flow into that surface: **Create Room** and **Scan Rooms** become the primary local-play actions, while manual hotspot server entry and Offline QR move into a secondary utility/fallback area.
- Clean up non-playing screens so combat-only chrome does not sit on top of menus, customization, settings, leaderboard, and lobby UI; provide intentional empty/error states and explicit mobile-landscape behavior.

## Capabilities

### New Capabilities
- `plane-customization`: a persistent plane-loadout system with live preview, summary, presets, and quick actions for reset and randomize.
- `preflight-command-surface`: a pre-match UI surface that keeps the selected plane visible, clarifies launch paths, and presents local Wi-Fi room creation/discovery as first-class actions.

### Modified Capabilities
<!-- none: no published specs in openspec/specs/ -->

## Impact

- `public/index.html` — home/play/local/customize markup, selected-plane summary, preset controls, and clearer local Wi-Fi action hierarchy.
- `public/css/style.css` — new preflight visual system, full-screen customization layout, local Wi-Fi room cards, empty/error states, and non-playing chrome visibility rules.
- `src/client/main.ts` — unified loadout state, preset persistence, selected-plane summary wiring, local Wi-Fi UI orchestration, and screen-mode transitions.
- `public/js/render3d.js` — larger preflight/customize plane staging, explicit non-playing chrome suppression, and live preview updates for the new customization flow.
- Existing local Wi-Fi browser behavior from `lan-room-browser` is reused; no broker or signaling protocol changes are required for this change.
