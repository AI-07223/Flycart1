## 1. Test Infrastructure

- [x] 1.1 Install vitest and @colyseus/testing as devDependencies
- [x] 1.2 Create `vitest.config.ts` with TypeScript support and `tests/` as test directory
- [x] 1.3 Add `test` script to `package.json` (`vitest run`)
- [x] 1.4 Create `tests/helpers.ts` with room setup/teardown utilities

## 2. Sphere Math Tests

- [x] 2.1 Create `tests/sphere.test.ts` with test cases for `vec`, `add`, `sub`, `scale`, `dot`, `cross`
- [x] 2.2 Add tests for `len`, `normalize` (including zero-vector edge case)
- [x] 2.3 Add tests for `rotateAxis` (0°, 90°, 180°, 360°)
- [x] 2.4 Add tests for `tangentize`, `advance`, `turn`
- [x] 2.5 Add tests for `angBetween`, `slerp`
- [x] 2.6 Add tests for `arcDistToPoint`, `arcClosestT`

## 3. Arena Integration Tests

- [x] 3.1 Create `tests/arena.test.ts` with player join test
- [x] 3.2 Add test for player fire → bullet appears in state
- [x] 3.3 Add test for bullet hit → HP decreases, bullet removed
- [x] 3.4 Add test for death → alive=false → respawn after delay
- [x] 3.5 Add test for bot auto-spawn when player is alone

## 4. Verification

- [x] 4.1 Run `npm test` and verify all tests pass
- [x] 4.2 Verify test suite completes in under 5 seconds
