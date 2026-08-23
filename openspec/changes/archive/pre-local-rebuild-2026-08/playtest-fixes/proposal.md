## Why

Fly-testing the current flat-world build surfaced five concrete control/balance problems that make the game frustrating on touch devices and unwinnable against bots. They are independent of the larger menu/netcode work and small enough to ship as one batch.

The headline issue: bots aim **perfectly**. `thinkBot()` leads the target with no error and fires whenever roughly aligned, with no per-bot skill — effectively difficulty ~18 on a 1–10 scale. There is no way to make a match approachable.

## What Changes

- **AI difficulty option (3 tiers).** Add Easy / Medium / High bot difficulty. Each bot gains aim jitter, a fire cone, a lead-time factor, and a reaction delay, scaled by tier so even High is beatable (never pinpoint). Default Medium. Selectable in the menu (persisted in `localStorage`) and, for private rooms, settable by the host via the existing host-settings path.
- **Joystick steering handedness fix.** Joystick turn is reported reversed relative to the d-pad. Align all schemes (d-pad / joystick / tilt) to one handedness so drag-right = turn right; the `invertSteer` toggle still flips it. (Steering *direction* cannot be confirmed headless — relies on a fly-test / user screenshot.)
- **Proper multitouch on the d-pad.** On-screen d-pad/fire/boost buttons must each track their own pointer so steering + fire + boost register simultaneously. (Joystick already tracks its touch identifier and is unaffected.)
- **Force landscape from load.** Portrait on touch devices currently shows only a soft note. Replace with the rotate-to-landscape overlay blocking *all* portrait (menu + game) so the app insists on landscape from first load; keep best-effort `screen.orientation.lock('landscape')` where supported.
- **Bigger powerup hitboxes.** Increase the sim-authoritative pickup collection radius (`PICKUP_RADIUS` 24 → ~44) so powerups are easy to grab. Visual orb size unchanged.

## Capabilities

### New Capabilities
- `touch-controls`: mobile input contract — per-pointer multitouch for on-screen buttons, consistent steering handedness across all control schemes, and forced-landscape orientation gating.
- `combat-tuning`: match balance contract — selectable bot difficulty tiers with re-tuned bot aiming behaviour, and the powerup pickup collection radius.

### Modified Capabilities
<!-- none: no published specs in openspec/specs/ -->

## Impact

- `src/sim/GameSim.ts` — `thinkBot()` / `BotBrain` (aim jitter, fire cone, lead factor, reaction delay); difficulty plumbed through `setHostSettings` and room init. Shared by `ArenaRoom` (Colyseus) and the P2P host-sim — both paths must keep working.
- `src/shared/constants.ts` — `PICKUP_RADIUS` 24 → ~44; new difficulty tier constants.
- `src/client/input.ts` — joystick turn sign; verify scheme handedness alignment.
- `src/client/main.ts` — d-pad multitouch wiring; force-landscape overlay (menu + game); difficulty menu option + persistence; host-settings difficulty control.
- Client TypeScript must be rebuilt to `public/js/*` (esbuild) — `input.js`, `main.js`, `constants.js` bundles.
- Netcode: must not break input-sequencing (`Player.seq/turn/climb`) or the P2P/TDM/host-settings/lobby flow.
- Deploy: Coolify npm-ci is flaky (Dockerfile has a 5× retry loop) — be patient, don't cancel mid-build.
