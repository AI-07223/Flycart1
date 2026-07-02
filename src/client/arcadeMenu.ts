export const ARCADE_MENU_HOST_ID = "arcade-start-screen";
export const ARCADE_MENU_SCREEN_CLASS = "arcade-menu-screen";

export function arcadeScreenId(screen: string): string {
  return `arcade-screen-${screen}`;
}

export function mountArcadeMenu(): HTMLElement | null {
  const host = document.getElementById(ARCADE_MENU_HOST_ID);
  if (!(host instanceof HTMLElement)) return null;

  if (!host.dataset.mounted) {
    host.innerHTML = getArcadeMenuMarkup();
    host.dataset.mounted = "1";
  }

  host.classList.remove("hidden");
  document.body.classList.add("arcade-menu-enabled");
  return host;
}

function getArcadeMenuMarkup(): string {
  return `
    <div class="arcade-menu-shell">
      <div class="arcade-menu-router">
        <section class="${ARCADE_MENU_SCREEN_CLASS} active" id="${arcadeScreenId("home")}">
          <div class="arcade-home-corner">
            <button type="button" id="arcade-menu-settings-btn" class="arcade-corner-btn" aria-label="Settings">⚙</button>
            <button type="button" class="arcade-corner-btn arcade-corner-btn--secondary" data-arcade-nav="leaders" aria-label="Leaderboard">🏆</button>
          </div>

          <div class="arcade-home-center">
            <div class="arcade-title-block">
              <h1>SMASHCART</h1>
              <p class="arcade-tagline">Local Wi-Fi dogfights. No servers, no waiting.</p>
            </div>

            <label class="arcade-field arcade-home-namefield">
              <span class="arcade-field-label">Call Sign</span>
              <input id="arcade-name-input" class="arcade-input" maxlength="14" placeholder="Pilot name" aria-label="Call sign" />
            </label>

            <div class="arcade-home-buttons">
              <button type="button" class="arcade-home-btn arcade-home-btn--primary" data-arcade-nav="create">
                <span class="arcade-home-btn-icon">🎮</span>
                <span class="arcade-home-btn-label">Create Room</span>
              </button>
              <button type="button" class="arcade-home-btn" data-arcade-nav="join">
                <span class="arcade-home-btn-icon">🔑</span>
                <span class="arcade-home-btn-label">Join Room</span>
              </button>
              <button type="button" class="arcade-home-btn" data-arcade-nav="customize">
                <span class="arcade-home-btn-icon">✈</span>
                <span class="arcade-home-btn-label">Customize Plane</span>
              </button>
            </div>
          </div>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("create")}">
          <header class="arcade-screen-header">
            <button type="button" class="arcade-back-btn" data-arcade-back>Back</button>
            <div class="arcade-screen-title-wrap">
              <p class="arcade-panel-kicker">Host On This Device</p>
              <h2 class="arcade-screen-title">Create Room</h2>
              <p class="arcade-screen-copy">Friends on your Wi-Fi join with the room code.</p>
            </div>
          </header>

          <section class="arcade-panel arcade-create-panel">
            <label class="arcade-field">
              <span class="arcade-field-label">Room name</span>
              <input id="arcade-local-room-name" class="arcade-input" maxlength="20" placeholder="Room name" aria-label="Room name" />
            </label>
            <label class="arcade-switch" for="arcade-local-bots-check">
              <input type="checkbox" id="arcade-local-bots-check" checked />
              <span>Fill with bots</span>
            </label>
            <p class="muted arcade-hint">Change bot difficulty in ⚙ Settings.</p>
            <button type="button" id="arcade-local-create-btn" class="arcade-panel-action arcade-panel-action--wide arcade-panel-action--major">✅ Create Room</button>
          </section>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("join")}">
          <header class="arcade-screen-header">
            <button type="button" class="arcade-back-btn" data-arcade-back>Back</button>
            <div class="arcade-screen-title-wrap">
              <p class="arcade-panel-kicker">Join Console</p>
              <h2 class="arcade-screen-title">Join Room</h2>
              <p class="arcade-screen-copy">Rooms on your Wi-Fi show up automatically. No code needed to scan.</p>
            </div>
          </header>

          <section class="arcade-panel arcade-join-scan-panel">
            <div class="arcade-panel-header">
              <div>
                <p class="arcade-panel-kicker">Nearby Rooms</p>
                <h3 class="arcade-panel-title">Live On Your Hotspot</h3>
              </div>
              <button type="button" id="arcade-local-scan-btn" class="arcade-panel-action arcade-panel-action--secondary">↻ Re-scan</button>
            </div>
            <div id="arcade-local-room-list" class="local-room-list arcade-local-room-list">
              <p class="muted local-empty">Scanning for rooms…</p>
            </div>
          </section>

          <div class="arcade-divider arcade-divider--label" data-label="or enter a code"></div>

          <section class="arcade-panel arcade-join-code-panel">
            <input id="arcade-join-code-input" class="arcade-input arcade-input--code" maxlength="200" placeholder="ABCDEF" autocomplete="off" spellcheck="false" aria-label="Room code or invite link" />
            <div class="arcade-join-code-actions">
              <button type="button" id="arcade-join-code-submit" class="arcade-panel-action arcade-panel-action--wide arcade-panel-action--major">Join</button>
              <button type="button" id="arcade-scan-open-btn" class="arcade-panel-action arcade-panel-action--secondary">📷 Scan QR</button>
            </div>
          </section>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("leaders")}">
          <header class="arcade-screen-header">
            <button type="button" class="arcade-back-btn" data-arcade-back>Back</button>
            <div class="arcade-screen-title-wrap">
              <p class="arcade-panel-kicker">Aces Board</p>
              <h2 class="arcade-screen-title">All-Time Leaders</h2>
              <p class="arcade-screen-copy">Persistent pilot rankings with enough weight to feel like part of the game front-end.</p>
            </div>
          </header>

          <section class="arcade-panel arcade-leaderboard-panel">
            <div class="arcade-panel-header">
              <div>
                <p class="arcade-panel-kicker">Top Pilots</p>
                <h3 class="arcade-panel-title">Current Scoreline</h3>
              </div>
              <span class="arcade-panel-badge arcade-panel-badge--subtle">Top 10</span>
            </div>
            <div id="arcade-menu-leaderboard">
              <div class="lb-row muted">Loading...</div>
            </div>
          </section>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("customize")}">
          <header class="arcade-screen-header">
            <button type="button" class="arcade-back-btn" data-arcade-back>Back</button>
            <div class="arcade-screen-title-wrap">
              <p class="arcade-panel-kicker">Hangar</p>
              <h2 class="arcade-screen-title">Customize Your Plane</h2>
              <p class="arcade-screen-copy">A proper loadout system: save presets, swap airframes, and carry the same plane into every local room.</p>
            </div>
          </header>

          <div class="arcade-customize-layout">
            <aside class="arcade-customize-sidebar">
              <section class="arcade-panel arcade-hangar-panel">
                <div class="arcade-panel-header">
                  <div>
                    <p class="arcade-panel-kicker">Armed Loadout</p>
                    <h3 id="arcade-customize-summary-name" class="arcade-panel-title">Viper Fighter</h3>
                  </div>
                  <span class="arcade-panel-badge">Live</span>
                </div>
                <p id="arcade-customize-summary-text" class="arcade-panel-copy">Scarlet paint, Midnight accent, Clean livery, White Smoke trail</p>
                <div id="arcade-customize-summary-grid" class="summary-grid"></div>
                <div class="arcade-fallback-actions">
                  <button type="button" id="arcade-customize-randomize" class="arcade-panel-action arcade-panel-action--secondary">Randomize</button>
                  <button type="button" id="arcade-customize-reset" class="arcade-panel-action arcade-panel-action--secondary">Reset</button>
                  <button type="button" id="arcade-customize-done" class="arcade-panel-action" data-arcade-back>Done</button>
                </div>
                <p id="arcade-customize-feedback" class="muted arcade-hint">Cosmetics are visual only. No effect on flight or damage.</p>
              </section>

              <section class="arcade-panel">
                <div class="arcade-panel-header">
                  <div>
                    <p class="arcade-panel-kicker">Preset Slots</p>
                    <h3 class="arcade-panel-title">Save And Swap</h3>
                  </div>
                  <span class="arcade-panel-badge arcade-panel-badge--subtle">4 slots</span>
                </div>
                <div id="arcade-preset-grid" class="preset-grid"></div>
              </section>
            </aside>

            <div class="arcade-customize-main">
              <section class="arcade-panel arcade-stage-panel">
                <div class="arcade-stage-grid">
                  <div class="arcade-stage-radar"></div>
                  <div>
                    <p class="arcade-panel-kicker">Runway Camera</p>
                    <h3 class="arcade-panel-title">Live Preview Behind The UI</h3>
                    <p class="arcade-panel-copy">The 3D scene keeps the selected aircraft visible while you tune paint, airframe, livery, and trail from a real hangar screen instead of a settings list.</p>
                  </div>
                </div>
              </section>

              <div class="arcade-option-columns">
                <section class="arcade-panel">
                  <div class="arcade-panel-header">
                    <div>
                      <p class="arcade-panel-kicker">Airframe</p>
                      <h3 class="arcade-panel-title">Choose The Silhouette</h3>
                    </div>
                  </div>
                  <div id="arcade-customize-airframe" class="option-grid option-grid--cards"></div>
                </section>

                <section class="arcade-panel">
                  <div class="arcade-panel-header">
                    <div>
                      <p class="arcade-panel-kicker">Paint</p>
                      <h3 class="arcade-panel-title">Primary Finish</h3>
                    </div>
                  </div>
                  <div id="arcade-customize-paint" class="option-grid option-grid--swatches"></div>
                </section>

                <section class="arcade-panel">
                  <div class="arcade-panel-header">
                    <div>
                      <p class="arcade-panel-kicker">Accent</p>
                      <h3 class="arcade-panel-title">Trim Color</h3>
                    </div>
                  </div>
                  <div id="arcade-customize-accent" class="option-grid option-grid--swatches"></div>
                </section>

                <section class="arcade-panel">
                  <div class="arcade-panel-header">
                    <div>
                      <p class="arcade-panel-kicker">Livery</p>
                      <h3 class="arcade-panel-title">Pattern Layout</h3>
                    </div>
                  </div>
                  <div id="arcade-customize-livery" class="option-grid option-grid--cards"></div>
                </section>

                <section class="arcade-panel">
                  <div class="arcade-panel-header">
                    <div>
                      <p class="arcade-panel-kicker">Trail</p>
                      <h3 class="arcade-panel-title">Engine Wake</h3>
                    </div>
                  </div>
                  <div id="arcade-customize-trail" class="option-grid option-grid--swatches"></div>
                </section>
              </div>
            </div>
          </div>
        </section>

        <div class="arcade-menu-footer">
          <p id="arcade-orientation-note" class="muted">Landscape is recommended on touch devices.</p>
          <p id="arcade-friends-note" class="muted"></p>
          <p id="arcade-status" class="muted arcade-status-line" aria-live="polite"></p>
        </div>
      </div>
    </div>
  `;
}
