# Pre-local-rebuild specs (archived 2026-08)

These change directories predate the August 2026 local-only rebuild, which removed Colyseus, P2P host migration, and VPS/public-server play in favor of a single Express + plain-WebSocket room server (`src/server/RoomHost.ts`) driving the framework-free `src/sim/GameSim.ts`. Everything here — room codes, Colyseus schema/monitor work, leaderboard and error-tracking pipelines, reconnect windows — is historical reference only and is superseded by the current architecture described in the repository README and AGENTS.md.
