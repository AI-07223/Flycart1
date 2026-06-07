// Copies the vendored Three.js post-processing addon closure into
// public/vendor/jsm so the browser loads them offline via the import map
// ("three/addons/" -> "/vendor/jsm/"). Run via `npm run vendor`.
import { mkdirSync, copyFileSync } from "node:fs";

const PP = "node_modules/three/examples/jsm/postprocessing";
const SH = "node_modules/three/examples/jsm/shaders";
const RD = "node_modules/three/examples/jsm/renderers";

mkdirSync("public/vendor/jsm/postprocessing", { recursive: true });
mkdirSync("public/vendor/jsm/shaders", { recursive: true });
mkdirSync("public/vendor/jsm/renderers", { recursive: true });

const passes = ["EffectComposer", "Pass", "ShaderPass", "MaskPass", "RenderPass", "UnrealBloomPass", "OutputPass"];
const shaders = ["CopyShader", "LuminosityHighPassShader", "OutputShader"];
const renderers = ["CSS3DRenderer"]; // immersive-menu: crisp DOM panels transformed into the 3D scene

for (const f of passes) copyFileSync(`${PP}/${f}.js`, `public/vendor/jsm/postprocessing/${f}.js`);
for (const f of shaders) copyFileSync(`${SH}/${f}.js`, `public/vendor/jsm/shaders/${f}.js`);
for (const f of renderers) copyFileSync(`${RD}/${f}.js`, `public/vendor/jsm/renderers/${f}.js`);

console.log(`Vendored ${passes.length} passes + ${shaders.length} shaders + ${renderers.length} renderers -> public/vendor/jsm`);
