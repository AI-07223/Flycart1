## 1. Build Infrastructure

- [ ] 1.1 Create `tsconfig.client.json` with DOM lib, ES2020 target, shared path aliases
- [ ] 1.2 Create `scripts/build-client.mjs` using esbuild to compile `src/client/*.ts` to `public/js/*.js`
- [ ] 1.3 Create `src/client/globals.d.ts` with ambient type declarations for window.* globals
- [ ] 1.4 Update `package.json` with `build-client` script and wire into `build`

## 2. Migrate Core Files

- [ ] 2.1 Migrate `constants.ts` — move from generated output to direct source, add POWERUPS and OBSTACLES builder
- [ ] 2.2 Migrate `net.ts` — typed Colyseus client, typed state access
- [ ] 2.3 Migrate `input.ts` — typed message payloads
- [ ] 2.4 Migrate `main.ts` — typed game loop, typed imports from other client modules

## 3. Migrate Remaining Files

- [ ] 3.1 Migrate `quality.ts` — small, typed quality settings
- [ ] 3.2 Migrate `audio.ts` — small, typed audio manager
- [ ] 3.3 Migrate `sphere.ts` — re-export from shared or typed mirror
- [ ] 3.4 Migrate `assets.ts` — small, typed asset loader

## 4. Cleanup

- [ ] 4.1 Delete `scripts/gen-constants.mjs` (no longer needed)
- [ ] 4.2 Remove `gen-constants` from package.json build script
- [ ] 4.3 Verify full `npm run build` produces correct output

## 5. Verification

- [ ] 5.1 Run `npx tsc -p tsconfig.client.json --noEmit` — no errors
- [ ] 5.2 Load game in browser — verify all features work identically
- [ ] 5.3 Verify no console errors
