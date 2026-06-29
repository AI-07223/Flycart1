## 1. Loadout Model

- [x] 1.1 Replace split cosmetic persistence with a unified loadout store that still reads legacy `smashcart.*` keys for backward compatibility.
- [x] 1.2 Add metadata definitions for airframes, paint colors, accents, liveries, trails, and preset slots so UI labels and preview summaries come from one source of truth.
- [x] 1.3 Keep the existing network cosmetic payload shape intact when hosting or joining Colyseus and P2P matches.

## 2. Preflight Surface

- [x] 2.1 Redesign the home and play-entry markup so the selected plane is visible on the preflight surface and public, private, and local launch paths are clearly separated.
- [x] 2.2 Recompose the local play surface so `Create Room` and `Scan Rooms` are the primary local Wi-Fi actions, while manual hotspot server entry and Offline QR move into a secondary fallback area.
- [x] 2.3 Add intentional empty, status, and error states for room scan results, share status, leaderboard, and mobile landscape guidance.

## 3. Customize Your Plane

- [x] 3.1 Replace the current hangar drawer with a full-screen customization flow containing loadout summary, grouped cosmetic controls, quick actions, and a large live preview stage.
- [x] 3.2 Implement preset save/apply, randomize, and reset behaviors with clear visual feedback and persistent storage.
- [x] 3.3 Ensure selected-state styling, labels, and copy are consistent across airframe, paint, accent, livery, and trail controls.

## 4. Renderer And Screen Modes

- [x] 4.1 Add explicit renderer/app scene modes for preflight, customize, lobby, results, playing, and paused states.
- [x] 4.2 Hide or subordinate combat-only chrome on non-playing screens while keeping the aircraft preview active where appropriate.
- [x] 4.3 Update preflight and customization camera framing so the aircraft is intentionally staged on desktop and mobile.

## 5. Validation

- [x] 5.1 Run `npm run build && npm test`.
- [x] 5.2 Verify in preview on desktop and narrow mobile that the selected plane remains visible on the preflight surface, customization is usable, and no combat chrome leaks into non-playing screens.
- [x] 5.3 Verify that old saved cosmetics migrate correctly and that public, private, and local Wi-Fi hosting/joining still send the same cosmetic values as before.
