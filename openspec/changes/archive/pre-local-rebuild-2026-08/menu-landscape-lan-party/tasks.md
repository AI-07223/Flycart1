## 1. Menu shell and flow

- [x] 1.1 Replace the start-screen markup with a landscape-first menu shell that separates quick play, private room, and LAN party entry points.
- [x] 1.2 Rework the menu styling for desktop and mobile so the shell reads cleanly in landscape and remains usable in portrait.
- [x] 1.3 Update client menu orchestration in `src/client/main.ts` to support the new sections, status text, share behavior, and mobile orientation guidance.

## 2. LAN party connection mode

- [x] 2.1 Add LAN server origin parsing, validation, and persistence in the browser client.
- [x] 2.2 Update network connection logic to support a server override for LAN sessions and preserve that override in invite links.
- [x] 2.3 Add user-facing messaging for hotspot/LAN limitations, especially HTTPS to insecure local server cases.
- [x] 2.4 Add a QR invite view that encodes the active room share URL so hotspot players can join by scanning instead of typing.

## 3. Battlefield landscape pass

- [x] 3.1 Expand the Three.js battlefield with layered terrain, runway/road features, and additional static dressing meshes.
- [x] 3.2 Improve landmark presentation and menu flyby background so the world feels complete without changing collisions.
- [x] 3.3 Keep the renderer resource-safe by reusing or disposing any new geometry and material allocations created by the landscape pass.

## 4. Validation

- [x] 4.1 Rebuild generated client assets and production output.
- [ ] 4.2 Run the automated test suite and fix any regressions caused by the new menu, LAN flow, or renderer changes.

