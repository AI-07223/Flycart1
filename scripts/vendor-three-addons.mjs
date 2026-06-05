// Copies the vendored Three.js post-processing addon closure into
// public/vendor/jsm so the browser loads them offline via the import map
// ("three/addons/" -> "/vendor/jsm/"). Run via `npm run vendor`.
import { mkdirSync, copyFileSync } from "node:fs";

const PP = "node_modules/three/examples/jsm/postprocessing";
const SH = "node_modules/three/examples/jsm/shaders";

mkdirSync("public/vendor/jsm/postprocessing", { recursive: true });
mkdirSync("public/vendor/jsm/shaders", { recursive: true });

const passes = ["EffectComposer", "Pass", "ShaderPass", "MaskPass", "RenderPass", "UnrealBloomPass", "OutputPass"];
const shaders = ["CopyShader", "LuminosityHighPassShader", "OutputShader"];

for (const f of passes) copyFileSync(`${PP}/${f}.js`, `public/vendor/jsm/postprocessing/${f}.js`);
for (const f of shaders) copyFileSync(`${SH}/${f}.js`, `public/vendor/jsm/shaders/${f}.js`);

console.log(`Vendored ${passes.length} passes + ${shaders.length} shaders -> public/vendor/jsm`);
