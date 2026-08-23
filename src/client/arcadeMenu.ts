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
          <header class="arcade-hangar-header">
            <button type="button" class="arcade-back-btn arcade-back-btn--compact" data-arcade-back>Back</button>
            <h2 class="arcade-hangar-title">Create Room</h2>
            <span class="arcade-header-spacer" aria-hidden="true"></span>
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
            <p class="muted arcade-hint">Friends on your Wi-Fi join with the room code. Bot difficulty: ⚙ Settings.</p>
            <button type="button" id="arcade-local-create-btn" class="arcade-panel-action arcade-panel-action--wide arcade-panel-action--major">✅ Create Room</button>
          </section>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("join")}">
          <header class="arcade-hangar-header">
            <button type="button" class="arcade-back-btn arcade-back-btn--compact" data-arcade-back>Back</button>
            <h2 class="arcade-hangar-title">Join Room</h2>
            <span class="arcade-header-spacer" aria-hidden="true"></span>
          </header>

          <section class="arcade-panel arcade-join-scan-panel">
            <div class="arcade-panel-header">
              <div>
                <h3 class="arcade-panel-title">Nearby Rooms</h3>
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
          <header class="arcade-hangar-header">
            <button type="button" class="arcade-back-btn arcade-back-btn--compact" data-arcade-back>Back</button>
            <h2 class="arcade-hangar-title">Leaderboard</h2>
            <span class="arcade-header-spacer" aria-hidden="true"></span>
          </header>

          <section class="arcade-panel arcade-leaderboard-panel">
            <div class="arcade-panel-header">
              <div>
                <h3 class="arcade-panel-title">Top Pilots</h3>
              </div>
              <span class="arcade-panel-badge arcade-panel-badge--subtle">Top 10</span>
            </div>
            <div id="arcade-menu-leaderboard">
              <div class="lb-row muted">Loading...</div>
            </div>
          </section>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS} arcade-hangar-screen" id="${arcadeScreenId("customize")}">
          <header class="arcade-hangar-header">
            <button type="button" class="arcade-back-btn arcade-back-btn--compact" data-arcade-back>Back</button>
            <h2 class="arcade-hangar-title">Hangar</h2>
            <div class="arcade-hangar-header-actions">
              <button type="button" id="arcade-customize-randomize" class="arcade-icon-btn" aria-label="Randomize loadout" title="Randomize">🎲</button>
              <button type="button" id="arcade-customize-done" class="arcade-panel-action arcade-panel-action--compact" data-arcade-back>Done</button>
            </div>
          </header>

          <div class="arcade-hangar-stage" aria-hidden="true"></div>

          <p class="arcade-hangar-summary">
            <span id="arcade-customize-summary-name">Viper Fighter</span>
            <span id="arcade-customize-summary-text" class="arcade-hangar-summary-text">Scarlet paint, Midnight accent, Clean livery, White Smoke trail</span>
          </p>

          <div class="arcade-hangar-sheet">
            <div class="arcade-hangar-tabs" role="tablist">
              <button type="button" class="arcade-hangar-tab is-active" data-hangar-tab="airframe" role="tab" aria-selected="true">✈ Frame</button>
              <button type="button" class="arcade-hangar-tab" data-hangar-tab="paint" role="tab" aria-selected="false">🎨 Paint</button>
              <button type="button" class="arcade-hangar-tab" data-hangar-tab="accent" role="tab" aria-selected="false">◆ Accent</button>
              <button type="button" class="arcade-hangar-tab" data-hangar-tab="livery" role="tab" aria-selected="false">▨ Livery</button>
              <button type="button" class="arcade-hangar-tab" data-hangar-tab="trail" role="tab" aria-selected="false">✦ Trail</button>
              <button type="button" class="arcade-hangar-tab" data-hangar-tab="presets" role="tab" aria-selected="false">⭐ Presets</button>
            </div>

            <div class="arcade-hangar-sheet-body">
              <div id="arcade-customize-airframe" class="arcade-hangar-panel-content option-row option-row--cards is-active" data-hangar-panel="airframe"></div>
              <div id="arcade-customize-paint" class="arcade-hangar-panel-content option-row option-row--swatches" data-hangar-panel="paint"></div>
              <div id="arcade-customize-accent" class="arcade-hangar-panel-content option-row option-row--swatches" data-hangar-panel="accent"></div>
              <div id="arcade-customize-livery" class="arcade-hangar-panel-content option-row option-row--cards" data-hangar-panel="livery"></div>
              <div id="arcade-customize-trail" class="arcade-hangar-panel-content option-row option-row--swatches" data-hangar-panel="trail"></div>
              <div class="arcade-hangar-panel-content arcade-hangar-presets-panel" data-hangar-panel="presets">
                <div id="arcade-preset-grid" class="preset-grid preset-grid--row"></div>
                <button type="button" id="arcade-customize-reset" class="arcade-hangar-reset-btn">Reset to default</button>
              </div>
            </div>

            <p id="arcade-customize-feedback" class="arcade-hangar-feedback">Cosmetics are visual only. No effect on flight or damage.</p>
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
