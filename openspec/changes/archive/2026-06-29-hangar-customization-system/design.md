## Context

SmashCart already supports cosmetic values for `color`, `bodyShape`, `accent`, `trail`, and `livery`, and the renderer can build and recolor the player plane from those values. Today that experience is exposed through a left-rail hangar overlay with hand-wired buttons and split localStorage keys, while the home menu treats launch and social flows as separate controls rather than one deliberate "ready to launch" surface.

The local Wi-Fi room-browser work is already in motion in the current client: room naming, `Create Room`, and `Scan Rooms` are present as behaviors. This change builds on that by redesigning how those actions are presented, not by redefining the broker or transport contract.

The current UI problems are cross-cutting:
- loadout state is persisted as separate keys instead of one coherent model;
- customization is visually too small and structurally too shallow;
- combat chrome such as the minimap can compete with non-playing screens;
- mobile layout still behaves like a compressed desktop overlay rather than a designed preflight flow.

## Goals / Non-Goals

**Goals:**
- Make plane customization feel like a real loadout editor instead of a settings drawer.
- Keep the selected plane visible and meaningful throughout the preflight flow.
- Present local Wi-Fi create/join flows as first-class player actions while preserving existing fallback paths.
- Centralize non-playing UI state so menus, lobby, settings, leaderboard, and customization stop fighting with combat-only chrome.
- Preserve the current cosmetic payload shape sent to Colyseus and P2P sessions.

**Non-Goals:**
- No gameplay-affecting aircraft stats, classes, unlock economy, or progression system.
- No broker, signaling, or WebRTC protocol redesign; this change consumes existing local Wi-Fi behavior.
- No broad rework of in-match combat HUD information design beyond hiding or subordinating it outside active play.
- No change to server schema counts for cosmetics beyond what already exists.

## Decisions

### 1. Use a "preflight command surface" visual direction

The menu and customization flow will be designed as a pre-launch flight deck for an arcade dogfight, not as generic translucent cards. The subject is "carrier ops / radar room", the audience is players trying to get into public, private, or hotspot matches quickly, and the single job is "feel ready to launch in under ten seconds."

The visual system will be anchored by:
- a dark instrument palette with one strong launch accent;
- condensed, high-contrast headings for flight-deck labels;
- utility-style data treatment for room codes, call signs, and preset slots;
- one signature visual element: the aircraft staged against plotting/radar/runway marks rather than floating in dead space.

Alternative considered:
- keep the existing glass-panel language and refine spacing only.
- Rejected because the current "bolted on" feeling is mainly a hierarchy and identity problem, not just a spacing problem.

### 2. Unify cosmetics into one loadout model with backward-compatible migration

The client will move from split localStorage keys to a single persisted loadout object plus a small preset collection. On boot, the app will read legacy `smashcart.color`, `smashcart.bodyShape`, `smashcart.accent`, `smashcart.trail`, and `smashcart.livery` keys, hydrate the new model, and continue sending the same five numeric cosmetic fields through existing network code.

This keeps transport, schema, and renderer contracts stable while enabling:
- preset save/apply;
- a readable selected-plane summary;
- randomize/reset actions;
- simpler future expansion.

Alternative considered:
- keep separate keys and layer presets on top ad hoc.
- Rejected because every summary, migration, and preset path becomes brittle immediately.

### 3. Generate customization UI from option metadata, not hard-coded button wiring

Airframes, paints, accents, liveries, trails, and presets will be defined from metadata arrays rather than one-off DOM loops keyed to specific element ids. The UI can still render stable ids for testability, but the source of truth will be option objects containing labels, descriptions, and visual tokens.

This reduces duplication between:
- renderer labels and UI labels;
- current-selection summary text;
- randomize rules;
- preset serialization.

Alternative considered:
- keep hand-wired `hangar-*` buttons and embellish the existing overlay.
- Rejected because it does not scale cleanly once preset actions and richer summaries are added.

### 4. Make customization a dedicated full-screen mode

The current hangar left rail will be replaced by a true full-screen customization mode with three persistent zones:

```text
┌───────────────────────────────┬─────────────────────────────┐
│ Loadout summary / presets     │ Large live aircraft stage   │
│ Airframe / paint / pattern    │ With runway / radar marks   │
│ Trail / quick actions         │ and clear camera framing    │
└───────────────────────────────┴─────────────────────────────┘
```

On small screens this collapses to a staged vertical layout, but the preview remains central and the quick actions stay visible.

The home screen will then show a compact selected-plane card and a `Customize` entry point, so the player keeps seeing their aircraft without reopening the full editor.

Alternative considered:
- keep customization as a narrow side panel with tabs.
- Rejected because it never gives enough room for summary, presets, or mobile readability.

### 5. Promote local Wi-Fi create/scan actions and demote utilities

This change will consume the existing `startLocalRoom()` and room-scan behavior, but redesign the local-play surface so that:
- `Create Room` and `Scan Rooms` are the primary cards;
- room names and player counts are easy to read at a glance;
- manual hotspot server entry and Offline QR are clearly marked as fallback utilities.

This keeps the LAN-party flow aligned with the existing `lan-room-browser` behavior without forcing players through a technical setup page first.

Alternative considered:
- keep all local options on one long utility screen.
- Rejected because it hides the social hotspot flow behind server terminology and troubleshooting copy.

### 6. Centralize non-playing chrome visibility in one UI scene mode

The app and renderer need an explicit shared understanding of whether the player is in:
- `playing`
- `paused`
- `preflight`
- `customize`
- `lobby`
- `results`

That mode will control minimap/HUD visibility, menu-plane staging, and overlay framing. The renderer currently owns some DOM creation, so CSS-only hiding is not sufficient on its own.

Alternative considered:
- continue hiding widgets ad hoc per overlay with local CSS.
- Rejected because the current minimap leakage comes from split responsibility between app state and renderer-created DOM.

## Risks / Trade-offs

- [Concurrent menu or networking work in the repo] → Limit this change to presentation, client-state modeling, and renderer visibility. Reuse existing local Wi-Fi APIs instead of changing broker behavior.
- [Preset migration could overwrite saved cosmetics] → Perform one-time legacy key import into the new loadout model and keep the old keys untouched until the new store writes successfully.
- [A richer customize screen can become heavy on mobile] → Use staged disclosure and a strict priority order: preview, summary, primary actions first; advanced utilities collapse below.
- [Renderer mode branching can introduce visibility regressions] → Drive non-playing chrome from a single mode source and preview-verify every top-level state.

## Migration Plan

1. Add the unified loadout store and legacy-key migration while preserving current network payload fields.
2. Introduce the preflight/customize layouts and renderer scene-mode flags behind the existing menu flow.
3. Swap the current hangar entry point to the new full-screen customization mode.
4. Verify that public/private/local entry flows still host and join matches with the same cosmetic values.
5. Leave rollback simple: the network contract is unchanged and legacy localStorage keys remain readable during the transition.

## Open Questions

- None at proposal time. The proposal intentionally fixes scope to visual-only customization, four preset slots, and reuse of the existing local Wi-Fi behavior.
