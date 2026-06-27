// host-sim.ts — re-exports WebRtcTransport for host use and wires it to window.
// esbuild will bundle this (and GameSim's transitive imports from src/shared/*)
// into main.js via the import in main.ts.
//
// This file exists as a thin shim so main.ts imports a single well-named
// symbol rather than importing net-p2p.ts directly.

export { WebRtcTransport } from "./net-p2p";
