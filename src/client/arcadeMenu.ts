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
          <div class="arcade-home-hero">
            <div class="arcade-title-block">
              <p class="arcade-kicker">Sky League // Carrier Deck</p>
              <h1>SMASHCART</h1>
              <p class="arcade-tagline">Pick the mission, arm the plane, and launch from a menu that finally feels like a combat game.</p>
            </div>
            <div class="arcade-hero-console">
              <div class="arcade-chip-cluster">
                <span id="arcade-room-code-chip" class="signal-chip signal-chip--ready">Deck local</span>
                <span id="arcade-menu-server-badge" class="server-badge">Local play</span>
              </div>
              <div class="arcade-hero-actions">
                <button type="button" class="arcade-meta-btn" data-arcade-nav="join">Join Invite</button>
                <button type="button" id="arcade-menu-settings-btn" class="arcade-meta-btn arcade-meta-btn--secondary">Settings</button>
              </div>
              <p class="arcade-hero-copy">Fast entry, local hotspot support, and a full hangar customization pass all live on the same deck.</p>
            </div>
          </div>

          <div class="arcade-home-grid">
            <section class="arcade-panel arcade-loadout-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Active Aircraft</p>
                  <h2 id="arcade-selected-plane-name" class="arcade-panel-title">Viper Fighter</h2>
                </div>
                <button type="button" id="arcade-customize-open-btn" class="arcade-panel-action" data-arcade-nav="customize">Open Hangar</button>
              </div>
              <p id="arcade-selected-plane-summary" class="arcade-panel-copy">Scarlet paint, Midnight accent, Clean livery, White Smoke trail</p>
              <div id="arcade-selected-plane-chips" class="arcade-chip-strip"></div>
              <div class="arcade-field-row">
                <label class="arcade-field">
                  <span class="arcade-field-label">Call Sign</span>
                  <input id="arcade-name-input" class="arcade-input" maxlength="14" placeholder="Pilot name" aria-label="Call sign" />
                </label>
                <label class="arcade-switch" for="arcade-bots-check">
                  <input type="checkbox" id="arcade-bots-check" checked />
                  <span>Fill empty seats with bots</span>
                </label>
              </div>
            </section>

            <section class="arcade-panel arcade-mission-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Mission Select</p>
                  <h2 class="arcade-panel-title">Choose Your Route</h2>
                </div>
                <span class="arcade-panel-badge">Ready</span>
              </div>
              <div class="arcade-command-stack">
                <button type="button" class="arcade-command-btn arcade-command-btn--major" data-arcade-nav="play">
                  <span class="arcade-command-icon">01</span>
                  <span class="arcade-command-copy">
                    <strong>Launch Match</strong>
                    <span>Public, private, and hotspot dogfights branch from one proper start screen.</span>
                  </span>
                  <span class="arcade-command-tag">Primary</span>
                </button>
                <button type="button" class="arcade-command-btn" data-arcade-nav="join">
                  <span class="arcade-command-icon">02</span>
                  <span class="arcade-command-copy">
                    <strong>Join Invite</strong>
                    <span>Scan a QR, paste a link, or enter a room code without hunting through utility UI.</span>
                  </span>
                  <span class="arcade-command-tag">Fast</span>
                </button>
                <button type="button" class="arcade-command-btn" data-arcade-nav="lan">
                  <span class="arcade-command-icon">03</span>
                  <span class="arcade-command-copy">
                    <strong>Local Wi-Fi Ops</strong>
                    <span>Host on one device, scan on nearby phones, and keep hotspot matches one tap away.</span>
                  </span>
                  <span class="arcade-command-tag">OpsX</span>
                </button>
                <button type="button" class="arcade-command-btn" data-arcade-nav="leaders">
                  <span class="arcade-command-icon">04</span>
                  <span class="arcade-command-copy">
                    <strong>Leaderboard</strong>
                    <span>Check the all-time aces before rolling out to the runway.</span>
                  </span>
                  <span class="arcade-command-tag">Aces</span>
                </button>
              </div>
            </section>
          </div>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("play")}">
          <header class="arcade-screen-header">
            <button type="button" class="arcade-back-btn" data-arcade-back>Back</button>
            <div class="arcade-screen-title-wrap">
              <p class="arcade-panel-kicker">Launch Bay</p>
              <h2 class="arcade-screen-title">Pick A Match Type</h2>
              <p class="arcade-screen-copy">Your aircraft stays armed. Choose the room style that matches how people are joining.</p>
            </div>
          </header>

          <div class="arcade-banner">
            <span class="arcade-banner-label">Current loadout</span>
            <p id="arcade-play-loadout-summary">Viper Fighter - Scarlet - Clean - White Smoke</p>
          </div>

          <div class="arcade-mode-grid">
            <button type="button" id="arcade-quick-play-btn" class="arcade-command-btn arcade-command-btn--major">
              <span class="arcade-command-icon">A</span>
              <span class="arcade-command-copy">
                <strong>Public Scramble</strong>
                <span>Instant action. Launch straight into the live public fight with your current plane.</span>
              </span>
              <span class="arcade-command-tag">Fastest</span>
            </button>
            <button type="button" id="arcade-private-room-btn" class="arcade-command-btn">
              <span class="arcade-command-icon">B</span>
              <span class="arcade-command-copy">
                <strong>Private Squad Room</strong>
                <span>Create an invite code, wait in the lobby, and launch when your squad is ready.</span>
              </span>
              <span class="arcade-command-tag">Invite</span>
            </button>
            <button type="button" class="arcade-command-btn" data-arcade-nav="lan">
              <span class="arcade-command-icon">C</span>
              <span class="arcade-command-copy">
                <strong>Local Wi-Fi Field Play</strong>
                <span>For couch sessions and hotspot matches. One host creates the room, everyone else scans.</span>
              </span>
              <span class="arcade-command-tag">Nearby</span>
            </button>
          </div>

          <section class="arcade-panel arcade-route-panel">
            <div class="arcade-panel-header">
              <div>
                <p class="arcade-panel-kicker">Route Guide</p>
                <h3 class="arcade-panel-title">Which Button Should Players Use?</h3>
              </div>
              <span class="arcade-panel-badge arcade-panel-badge--subtle">Briefing</span>
            </div>
            <p class="arcade-panel-copy">Public Scramble is for immediate matchmaking. Private Squad Room is for invited players. Local Wi-Fi Field Play is the dedicated hotspot path and keeps the OpsX local-play flow front and center.</p>
          </section>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("join")}">
          <header class="arcade-screen-header">
            <button type="button" class="arcade-back-btn" data-arcade-back>Back</button>
            <div class="arcade-screen-title-wrap">
              <p class="arcade-panel-kicker">Join Console</p>
              <h2 class="arcade-screen-title">Scan Or Enter Invite</h2>
              <p class="arcade-screen-copy">Every join path funnels through one clear screen so players are never stuck guessing.</p>
            </div>
          </header>

          <div class="arcade-join-grid">
            <button type="button" id="arcade-scan-open-btn" class="arcade-command-btn arcade-command-btn--major">
              <span class="arcade-command-icon">QR</span>
              <span class="arcade-command-copy">
                <strong>Scan QR Invite</strong>
                <span>Use the host's on-screen code and join with the least friction.</span>
              </span>
              <span class="arcade-command-tag">Camera</span>
            </button>

            <section class="arcade-panel arcade-join-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Manual Entry</p>
                  <h3 class="arcade-panel-title">Paste Code Or Link</h3>
                </div>
              </div>
              <p class="arcade-panel-copy">Private-room links, short room codes, and local invites all resolve from the same input.</p>
              <input id="arcade-join-code-input" class="arcade-input arcade-input--wide" maxlength="200" placeholder="ABCDEF or paste invite link" autocomplete="off" spellcheck="false" aria-label="Room code or invite link" />
              <button type="button" id="arcade-join-code-submit" class="arcade-panel-action arcade-panel-action--wide">Join Room</button>
            </section>

            <section class="arcade-panel arcade-invite-guide">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Accepted Invites</p>
                  <h3 class="arcade-panel-title">One Input, Three Formats</h3>
                </div>
                <span class="arcade-panel-badge arcade-panel-badge--subtle">Simple</span>
              </div>
              <div class="arcade-rule-list">
                <div class="arcade-rule-row"><strong>Room code</strong><span>Enter the 6-character code from the host.</span></div>
                <div class="arcade-rule-row"><strong>Invite link</strong><span>Paste the full URL exactly as it was shared.</span></div>
                <div class="arcade-rule-row"><strong>Local QR</strong><span>Scan when the host shows a nearby or hotspot invite.</span></div>
              </div>
            </section>
          </div>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("lan")}">
          <header class="arcade-screen-header">
            <button type="button" class="arcade-back-btn" data-arcade-back>Back</button>
            <div class="arcade-screen-title-wrap">
              <p class="arcade-panel-kicker">OpsX Local Play</p>
              <h2 class="arcade-screen-title">Local Wi-Fi Command</h2>
              <p class="arcade-screen-copy">Built for one hotspot: host creates the room, nearby players scan, and fallback tools stay tucked below.</p>
            </div>
          </header>

          <div class="arcade-banner">
            <span class="arcade-banner-label">Selected plane</span>
            <p id="arcade-local-loadout-summary">Viper Fighter - Scarlet - Clean - White Smoke</p>
          </div>

          <div class="arcade-local-grid">
            <section class="arcade-panel arcade-local-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Host On This Device</p>
                  <h3 class="arcade-panel-title">Create Room</h3>
                </div>
                <span class="arcade-panel-badge">Primary</span>
              </div>
              <p class="arcade-panel-copy">Start the hotspot match here. Friends on the same Wi-Fi only need to scan and tap Join.</p>
              <div class="arcade-inline-field">
                <input id="arcade-local-room-name" class="arcade-input" maxlength="20" placeholder="Room name" aria-label="Room name" />
                <button type="button" id="arcade-local-create-btn" class="arcade-panel-action">Create Room</button>
              </div>
            </section>

            <section class="arcade-panel arcade-local-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Join Nearby</p>
                  <h3 class="arcade-panel-title">Scan Rooms</h3>
                </div>
                <span class="arcade-panel-badge arcade-panel-badge--subtle">Nearby</span>
              </div>
              <p class="arcade-panel-copy">See live rooms on the same hotspot, inspect player counts, and join without typing a server address.</p>
              <div class="arcade-local-actions">
                <button type="button" id="arcade-local-scan-btn" class="arcade-panel-action arcade-panel-action--wide">Scan Rooms</button>
                <div id="arcade-local-room-list" class="local-room-list arcade-local-room-list">
                  <p class="muted local-empty">No scan yet. If someone is already hosting, tap Scan Rooms.</p>
                </div>
              </div>
            </section>
          </div>

          <div class="arcade-local-grid arcade-local-grid--brief">
            <section class="arcade-panel arcade-opsx-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">OpsX Proposal</p>
                  <h3 class="arcade-panel-title">Upcoming Local Field Flow</h3>
                </div>
                <span class="arcade-panel-badge arcade-panel-badge--subtle">Pilot Plan</span>
              </div>
              <div class="arcade-rule-list">
                <div class="arcade-rule-row"><strong>Step 1</strong><span>Host launches from this screen and names the room.</span></div>
                <div class="arcade-rule-row"><strong>Step 2</strong><span>Guests on the same hotspot tap Scan Rooms and see the host immediately.</span></div>
                <div class="arcade-rule-row"><strong>Step 3</strong><span>Fallback server and offline QR tools stay available only when auto-discovery is not enough.</span></div>
              </div>
            </section>

            <section class="arcade-panel arcade-fallback-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Fallback Utilities</p>
                  <h3 class="arcade-panel-title">Manual Server And Offline QR</h3>
                </div>
                <span class="arcade-panel-badge arcade-panel-badge--subtle">Secondary</span>
              </div>
              <p class="arcade-panel-copy">Use these only when hotspot discovery is unavailable. The main intended flow is Create Room plus Scan Rooms.</p>
              <label class="arcade-field">
                <span class="arcade-field-label">Hotspot server</span>
                <input id="arcade-lan-server-input" class="arcade-input" maxlength="120" placeholder="http://192.168.43.1:2567" />
              </label>
              <div class="arcade-fallback-actions">
                <button type="button" id="arcade-lan-quick-btn" class="arcade-panel-action">LAN Quick Play</button>
                <button type="button" id="arcade-lan-friends-btn" class="arcade-panel-action arcade-panel-action--secondary">LAN Room</button>
              </div>
              <p id="arcade-lan-hint" class="muted arcade-hint"></p>
              <div class="arcade-divider"></div>
              <p class="arcade-panel-copy">No hotspot server? Use the offline browser-to-browser fallback below.</p>
              <div class="arcade-fallback-actions">
                <button type="button" id="arcade-p2p-offline-btn" class="arcade-panel-action arcade-panel-action--secondary">Offline QR</button>
              </div>
              <div id="arcade-p2p-offline-section" class="hidden arcade-offline-section">
                <p class="muted">Host: scan the QR below on the guest device. Guest: paste the answer payload here.</p>
                <canvas id="arcade-p2p-offline-canvas" class="arcade-offline-canvas"></canvas>
                <div class="arcade-inline-field">
                  <input id="arcade-p2p-answer-input" class="arcade-input" placeholder="Paste guest answer" />
                  <button type="button" id="arcade-p2p-answer-submit" class="arcade-panel-action arcade-panel-action--secondary">Connect</button>
                </div>
              </div>
            </section>
          </div>
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
              <p class="arcade-screen-copy">A proper loadout system: save presets, swap airframes, and carry the same plane into public, private, and local Wi-Fi matches.</p>
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
