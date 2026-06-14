## 1. Build Infrastructure

- [x] 1.1 Create `tsconfig.client.json` with DOM lib, ES2020 target, shared path aliases
- [x] 1.2 Create `scripts/build-client.mjs` using esbuild to compile `src/client/*.ts` to `public/js/*.js`
- [x] 1.3 Create `src/client/globals.d.ts` with ambient type declarations for window.* globals
- [x] 1.4 Update `package.json` with `build-client` script and wire into `build`

## 2. Migrate Core Files

- [x] 2.1 Migrate `constants.ts` — move from generated output to direct source, add POWERUPS and OBSTACLES builder
- [x] 2.2 Migrate `net.ts` — typed Colyseus client, typed state access
- [x] 2.3 Migrate `input.ts` — typed message payloads
- [x] 2.4 Migrate `main.ts` — typed game loop, typed imports from other client modules

## 3. Migrate Remaining Files

- [x] 3.1 Migrate `quality.ts` — small, typed quality settings
- [x] 3.2 Migrate `audio.ts` — small, typed audio manager
- [x] 3.3 Migrate `sphere.ts` — re-export from shared or typed mirror
- [x] 3.4 Migrate `assets.ts` — small, typed asset loader

## 4. Cleanup

- [x] 4.1 Delete `scripts/gen-constants.mjs` (no longer needed)
- [x] 4.2 Remove `gen-constants` from package.json build script
- [x] 4.3 Verify full `npm run build` produces correct output

## 5. Verification

- [x] 5.1 Run `npx tsc -p tsconfig.client.json --noEmit` — no errors
- [ ] 5.2 Load game in browser — verify all features work identically
- [ ] 5.3 Verify no console errors
