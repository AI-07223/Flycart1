#!/usr/bin/env node
// scripts/host.js
// SmashCart LAN host launcher — run with `npm run host`.
// Detects the machine's LAN IPv4 address, prints a banner + QR code,
// then spawns dist/index.js as the game server.

'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ---------------------------------------------------------------------------
// LAN IP detection
// ---------------------------------------------------------------------------
function getLanIp() {
  const ifaces = os.networkInterfaces();
  let fallback = null;

  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      // Skip loopback and non-IPv4
      if (iface.internal || iface.family !== 'IPv4') continue;

      const ip = iface.address;

      // Prefer private RFC-1918 ranges
      if (
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
      ) {
        return ip;
      }

      // Keep the first external IPv4 as fallback
      if (!fallback) fallback = ip;
    }
  }

  return fallback || 'localhost';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 2567;
const lanIp = getLanIp();
const url = `http://${lanIp}:${PORT}`;

// Check dist/index.js exists before trying to spawn
const serverEntry = path.join(__dirname, '..', 'dist', 'index.js');
if (!fs.existsSync(serverEntry)) {
  console.error('');
  console.error('  ERROR: dist/index.js not found.');
  console.error('  Run `npm run build` first, then try `npm run host` again.');
  console.error('');
  process.exit(1);
}

// Print banner — URL first so it's always readable even if QR is garbled
console.log('');
console.log('  ╔══════════════════════════════════════════════════╗');
console.log('  ║          SmashCart — LAN Party Launcher          ║');
console.log('  ╚══════════════════════════════════════════════════╝');
console.log('');
console.log(`  SmashCart is live — guests on this Wi-Fi can join at:`);
console.log('');
console.log(`      ${url}`);
console.log('');
console.log('  Scan to join:');
console.log('  (If the QR looks wrong, type the URL above in a browser)');
console.log('');

// Render QR using qrcode-terminal with small:true for compact output.
// On some Windows terminals block glyphs render poorly — the plain URL
// printed above and below the QR ensures the launcher is always usable.
try {
  const qrcode = require('qrcode-terminal');
  qrcode.generate(url, { small: true }, (qr) => {
    console.log(qr);
    console.log(`  Join at: ${url}`);
    console.log('');
  });
} catch (err) {
  // qrcode-terminal not installed yet — show a graceful fallback
  console.log('  (QR unavailable — run `npm install` to enable it)');
  console.log(`  Join at: ${url}`);
  console.log('');
}

// ---------------------------------------------------------------------------
// Spawn the server
// ---------------------------------------------------------------------------
console.log('  Starting server...');
console.log('  Press Ctrl+C to stop.');
console.log('');

const child = spawn(process.execPath, [serverEntry], {
  stdio: 'inherit',
  env: Object.assign({}, process.env, { PORT: String(PORT) }),
});

// Forward termination signals to the child so it can shut down cleanly
function forwardSignal(sig) {
  try { child.kill(sig); } catch (_) { /* child already gone */ }
}
process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code, signal) => {
  process.exit(code != null ? code : (signal ? 1 : 0));
});
