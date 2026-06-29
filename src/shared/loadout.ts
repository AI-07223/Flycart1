export interface CosmeticLoadout {
  color: number;
  bodyShape: number;
  accent: number;
  trail: number;
  livery: number;
}

export interface LoadoutStore {
  version: 1;
  active: CosmeticLoadout;
  presets: CosmeticLoadout[];
}

export interface CosmeticOption {
  value: number;
  label: string;
  note: string;
  swatch?: string;
}

export interface AirframeOption extends CosmeticOption {
  callsign: string;
}

export interface LegacyLoadoutSource {
  skin?: number | string | null;
  color?: number | string | null;
  bodyShape?: number | string | null;
  accent?: number | string | null;
  trail?: number | string | null;
  livery?: number | string | null;
}

export const LOADOUT_STORAGE_KEY = "smashcart.loadout.v1";
export const PRESET_SLOT_COUNT = 4;

export const DEFAULT_LOADOUT: CosmeticLoadout = {
  color: 0,
  bodyShape: 0,
  accent: 0,
  trail: 0,
  livery: 0,
};

export const LEGACY_LOADOUT_KEYS = {
  skin: "smashcart.skin",
  color: "smashcart.color",
  bodyShape: "smashcart.bodyShape",
  accent: "smashcart.accent",
  trail: "smashcart.trail",
  livery: "smashcart.livery",
} as const;

export const AIRFRAME_OPTIONS: AirframeOption[] = [
  { value: 0, label: "Fighter", callsign: "Viper", note: "Balanced silhouette with a steady mid-wing stance." },
  { value: 1, label: "Interceptor", callsign: "Razor", note: "Slim nose and swept wings for a fast strike profile." },
  { value: 2, label: "Bomber", callsign: "Mammoth", note: "Broad wings and a heavy center mass with twin nacelles." },
  { value: 3, label: "Biplane", callsign: "Stork", note: "Stacked wings and struts for a vintage dogfight look." },
];

export const PAINT_OPTIONS: CosmeticOption[] = [
  { value: 0, label: "Scarlet", note: "Classic red launch paint.", swatch: "#ff6b6b" },
  { value: 1, label: "Cobalt", note: "Cold blue squadron finish.", swatch: "#49c0ff" },
  { value: 2, label: "Olive", note: "Field-ready tactical green.", swatch: "#8be34a" },
  { value: 3, label: "Sunburst", note: "High-visibility yellow sweep.", swatch: "#ffd24a" },
  { value: 4, label: "Violet", note: "Arcade purple glow tone.", swatch: "#c07bff" },
  { value: 5, label: "Ember", note: "Hot orange carrier deck flare.", swatch: "#ff9f43" },
  { value: 6, label: "Teal", note: "Sea-glass cyan finish.", swatch: "#00d2d3" },
  { value: 7, label: "Cream", note: "Warm ivory patrol coat.", swatch: "#ffeaa7" },
  { value: 8, label: "Ghost", note: "Pale alloy shell.", swatch: "#dfe6e9" },
  { value: 9, label: "Stealth", note: "Low-light blacked-out finish.", swatch: "#2d3436" },
  { value: 10, label: "Rust", note: "Weathered copper strike paint.", swatch: "#e17055" },
  { value: 11, label: "Mint", note: "Bright coastal mint.", swatch: "#55efc4" },
];

export const ACCENT_OPTIONS: CosmeticOption[] = [
  { value: 0, label: "Midnight", note: "Dark utility trim.", swatch: "#273244" },
  { value: 1, label: "Signal White", note: "Clean instrument-white contrast.", swatch: "#ffffff" },
  { value: 2, label: "Iron Black", note: "Deep matte shadow line.", swatch: "#000000" },
  { value: 3, label: "Gold", note: "Showcase deck stripe highlight.", swatch: "#ffd24a" },
  { value: 4, label: "Crimson", note: "Red warning-band accent.", swatch: "#ff6b6b" },
  { value: 5, label: "Ice Blue", note: "Cold neon wing edge.", swatch: "#49c0ff" },
  { value: 6, label: "Vector Green", note: "Radar-green trim.", swatch: "#8be34a" },
];

export const LIVERY_OPTIONS: CosmeticOption[] = [
  { value: 0, label: "Clean", note: "Primary body with crisp wing contrast." },
  { value: 1, label: "Stripe", note: "Single bold centerline stripe." },
  { value: 2, label: "Two-Tone", note: "Split-color wing and tail treatment." },
  { value: 3, label: "Camo", note: "Patchwork accent markers across the shell." },
];

export const TRAIL_OPTIONS: CosmeticOption[] = [
  { value: 0, label: "White Smoke", note: "Neutral engine exhaust.", swatch: "#ffffff" },
  { value: 1, label: "Afterburner Orange", note: "Hot thrust flare.", swatch: "#ff9f43" },
  { value: 2, label: "Cryo Blue", note: "Cold plasma stream.", swatch: "#49c0ff" },
  { value: 3, label: "Plasma Violet", note: "Electric purple trail.", swatch: "#c07bff" },
  { value: 4, label: "Toxic Green", note: "Acid-green vapor wake.", swatch: "#8be34a" },
];

export const PRESET_SLOTS = [
  { index: 0, label: "Deck 1" },
  { index: 1, label: "Deck 2" },
  { index: 2, label: "Deck 3" },
  { index: 3, label: "Deck 4" },
] as const;

function toInt(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clampIndex(value: number | string | null | undefined, count: number, fallback: number): number {
  const parsed = toInt(value);
  return parsed !== null && parsed >= 0 && parsed < count ? parsed : fallback;
}

export function cloneLoadout(loadout: CosmeticLoadout): CosmeticLoadout {
  return {
    color: loadout.color,
    bodyShape: loadout.bodyShape,
    accent: loadout.accent,
    trail: loadout.trail,
    livery: loadout.livery,
  };
}

export function sameLoadout(a: CosmeticLoadout, b: CosmeticLoadout): boolean {
  return a.color === b.color
    && a.bodyShape === b.bodyShape
    && a.accent === b.accent
    && a.trail === b.trail
    && a.livery === b.livery;
}

export function clampLoadout(loadout: Partial<CosmeticLoadout>): CosmeticLoadout {
  return {
    color: clampIndex(loadout.color, PAINT_OPTIONS.length, DEFAULT_LOADOUT.color),
    bodyShape: clampIndex(loadout.bodyShape, AIRFRAME_OPTIONS.length, DEFAULT_LOADOUT.bodyShape),
    accent: clampIndex(loadout.accent, ACCENT_OPTIONS.length, DEFAULT_LOADOUT.accent),
    trail: clampIndex(loadout.trail, TRAIL_OPTIONS.length, DEFAULT_LOADOUT.trail),
    livery: clampIndex(loadout.livery, LIVERY_OPTIONS.length, DEFAULT_LOADOUT.livery),
  };
}

export function createDefaultLoadoutStore(): LoadoutStore {
  return {
    version: 1,
    active: cloneLoadout(DEFAULT_LOADOUT),
    presets: Array.from({ length: PRESET_SLOT_COUNT }, () => cloneLoadout(DEFAULT_LOADOUT)),
  };
}

export function parseLoadoutStore(raw: string | null): LoadoutStore | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LoadoutStore> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const store = createDefaultLoadoutStore();
    store.active = clampLoadout(parsed.active || {});
    const rawPresets = Array.isArray(parsed.presets) ? parsed.presets : [];
    store.presets = Array.from({ length: PRESET_SLOT_COUNT }, (_, index) =>
      clampLoadout(rawPresets[index] || DEFAULT_LOADOUT),
    );
    return store;
  } catch {
    return null;
  }
}

export function loadoutFromLegacy(source: LegacyLoadoutSource): CosmeticLoadout {
  const fallbackColor = clampIndex(source.skin, PAINT_OPTIONS.length, DEFAULT_LOADOUT.color);
  return {
    color: clampIndex(source.color, PAINT_OPTIONS.length, fallbackColor),
    bodyShape: clampIndex(source.bodyShape, AIRFRAME_OPTIONS.length, DEFAULT_LOADOUT.bodyShape),
    accent: clampIndex(source.accent, ACCENT_OPTIONS.length, DEFAULT_LOADOUT.accent),
    trail: clampIndex(source.trail, TRAIL_OPTIONS.length, DEFAULT_LOADOUT.trail),
    livery: clampIndex(source.livery, LIVERY_OPTIONS.length, DEFAULT_LOADOUT.livery),
  };
}

export function randomizeLoadout(random = Math.random): CosmeticLoadout {
  const pick = (count: number): number => Math.max(0, Math.min(count - 1, Math.floor(random() * count)));
  return {
    color: pick(PAINT_OPTIONS.length),
    bodyShape: pick(AIRFRAME_OPTIONS.length),
    accent: pick(ACCENT_OPTIONS.length),
    trail: pick(TRAIL_OPTIONS.length),
    livery: pick(LIVERY_OPTIONS.length),
  };
}

export function getLoadoutSummary(loadout: CosmeticLoadout): { title: string; subtitle: string } {
  const airframe = AIRFRAME_OPTIONS[loadout.bodyShape] || AIRFRAME_OPTIONS[0];
  const paint = PAINT_OPTIONS[loadout.color] || PAINT_OPTIONS[0];
  const accent = ACCENT_OPTIONS[loadout.accent] || ACCENT_OPTIONS[0];
  const livery = LIVERY_OPTIONS[loadout.livery] || LIVERY_OPTIONS[0];
  const trail = TRAIL_OPTIONS[loadout.trail] || TRAIL_OPTIONS[0];
  return {
    title: `${airframe.callsign} ${airframe.label}`,
    subtitle: `${paint.label} paint · ${accent.label} accent · ${livery.label} livery · ${trail.label} trail`,
  };
}

export function getLoadoutDetailRows(loadout: CosmeticLoadout): Array<{ label: string; value: string }> {
  return [
    { label: "Airframe", value: (AIRFRAME_OPTIONS[loadout.bodyShape] || AIRFRAME_OPTIONS[0]).label },
    { label: "Paint", value: (PAINT_OPTIONS[loadout.color] || PAINT_OPTIONS[0]).label },
    { label: "Accent", value: (ACCENT_OPTIONS[loadout.accent] || ACCENT_OPTIONS[0]).label },
    { label: "Livery", value: (LIVERY_OPTIONS[loadout.livery] || LIVERY_OPTIONS[0]).label },
    { label: "Trail", value: (TRAIL_OPTIONS[loadout.trail] || TRAIL_OPTIONS[0]).label },
  ];
}
