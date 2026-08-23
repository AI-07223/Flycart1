// Cross-platform browser vendor sync for the flat-world client.
// Copies the runtime browser libraries we actually ship and prunes dead
// Three.js addon baggage left over from the old immersive/CSS3D renderer path.
//
// If the game ever loads .glb/.gltf assets, vendor GLTFLoader here
// (node_modules/three/examples/jsm/loaders/GLTFLoader.js -> public/vendor/jsm/)
// and add the matching "three/addons/" entry to the import map in index.html.
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";

mkdirSync("public/vendor", { recursive: true });

const files = [
  ["node_modules/three/build/three.module.min.js", "public/vendor/three.module.min.js"],
  ["node_modules/three/build/three.core.min.js", "public/vendor/three.core.min.js"],
];

for (const [from, to] of files) copyFileSync(from, to);

if (existsSync("public/vendor/jsm")) rmSync("public/vendor/jsm", { recursive: true, force: true });

console.log(`Vendored ${files.length} browser asset(s) -> public/vendor (no Three.js addons currently required)`);
