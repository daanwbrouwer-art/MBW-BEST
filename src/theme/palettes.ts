// The four-colour deck. Every palette has exactly four brand colours, one
// per suit, plus a tinted neutral for surfaces:
//
//   primary  ♠ Spades   — main actions, selection, "play"
//   energy   ♥ Hearts   — streaks, effort, reps, warnings
//   prestige ♦ Diamonds — Aces/Kings, achievements, premium
//   pulse    ♣ Clubs    — social, info, secondary data
//
// plus a fifth, non-suit accent:
//
//   highlight          — things that must pop: "Recommended" tags, new/unseen
//                        dots, the current default. Picked to clash with
//                        primary, so use it sparingly.
//
// Values are OKLCH. Components never hardcode a colour: they use
// `oklch(var(--primary))`, Tailwind's `bg-energy` etc., or — for dark tinted
// surfaces — `oklch(0.17 0.03 var(--primary-h))`, which keeps the original
// depth and only borrows the palette's hue. Each palette also sets its own
// background (lightness + chroma of the tinted neutral), so palettes can
// change the whole mood of the app, not just the accents. `scripts/palette-audit.mjs`
// scores these definitions for contrast and colour-blind separation; this
// file is the single source both it and the app read.

export type BrandRole =
  | "primary"
  | "energy"
  | "prestige"
  | "pulse"
  | "highlight";

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export interface Palette {
  id: PaletteId;
  name: string;
  tagline: string;
  /** Hue used to tint every neutral surface (background, cards, borders). */
  neutralHue: number;
  /** Background lightness and chroma; cards, borders etc. step up from it. */
  surface: { l: number; c: number };
  colors: Record<BrandRole, Oklch>;
}

export type PaletteId = "volt" | "blaze" | "neon";

export const PALETTES: Record<PaletteId, Palette> = {
  volt: {
    id: "volt",
    name: "Volt",
    tagline:
      "Signature electric lime on gym-floor black — magenta for the big moments",
    neutralHue: 250,
    surface: { l: 0.14, c: 0.006 },
    colors: {
      primary: { l: 0.92, c: 0.21, h: 125 },
      energy: { l: 0.75, c: 0.15, h: 23 },
      prestige: { l: 0.79, c: 0.16, h: 90 },
      pulse: { l: 0.73, c: 0.15, h: 234 },
      highlight: { l: 0.78, c: 0.22, h: 328 },
    },
  },
  blaze: {
    id: "blaze",
    name: "Blaze",
    tagline:
      "Bright burgundy on ember-black, amber, ivory and teal — violet for the big moments",
    neutralHue: 28,
    surface: { l: 0.14, c: 0.026 },
    colors: {
      primary: { l: 0.63, c: 0.19, h: 10 },
      energy: { l: 0.78, c: 0.16, h: 85 },
      prestige: { l: 0.98, c: 0.06, h: 118 },
      pulse: { l: 0.78, c: 0.13, h: 210 },
      highlight: { l: 0.62, c: 0.17, h: 283 },
    },
  },
  neon: {
    id: "neon",
    name: "Neon",
    tagline:
      "Hot cyan on deep-violet night, pink and gold — lime for the big moments",
    neutralHue: 292,
    surface: { l: 0.14, c: 0.05 },
    colors: {
      primary: { l: 0.86, c: 0.13, h: 199 },
      energy: { l: 0.71, c: 0.2, h: 359 },
      prestige: { l: 0.81, c: 0.12, h: 69 },
      pulse: { l: 0.7, c: 0.17, h: 296 },
      highlight: { l: 0.96, c: 0.17, h: 115 },
    },
  },
};

/** Winner of `scripts/palette-audit.mjs`; also hardcoded in index.css for first paint. */
export const DEFAULT_PALETTE: PaletteId = "volt";

const STORAGE_KEY = "mbw_palette";

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === "string" && value in PALETTES;
}

export function getStoredPalette(): PaletteId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isPaletteId(stored) ? stored : DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}

const triple = ({ l, c, h }: Oklch) => `${l} ${c} ${h}`;

/**
 * Neutral tokens derived from a palette's surface — mirrors the calc() steps
 * in index.css's .dark block (card +0.04, popover +0.06, muted +0.10,
 * border +0.15 lightness).
 */
function surfaceTokens(p: Palette): Record<string, string> {
  const n = p.neutralHue;
  const { l, c } = p.surface;
  const t = (dl: number, dc: number) =>
    `${(l + dl).toFixed(3)} ${(c + dc).toFixed(3)} ${n}`;
  return {
    "--background": t(0, 0),
    "--card": t(0.04, 0.002),
    "--popover": t(0.06, 0.004),
    "--muted": t(0.1, 0.004),
    "--border": t(0.15, 0.004),
    "--foreground": `0.96 0.01 ${n}`,
    "--card-foreground": `0.96 0.01 ${n}`,
    "--muted-foreground": `0.74 ${Math.min(c * 0.5, 0.03).toFixed(3)} ${n}`,
  };
}

/**
 * Inline CSS variables that render a subtree in `id`'s palette regardless of
 * the app-wide one — used for side-by-side previews. Neutral tokens are
 * restated because custom properties resolve where they're declared, so
 * overriding --neutral-hue alone wouldn't re-tint them.
 */
export function paletteScopeStyle(id: PaletteId): Record<string, string> {
  const p = PALETTES[id];
  const n = p.neutralHue;
  const vars: Record<string, string> = {
    "--neutral-hue": String(n),
    "--bg-l": String(p.surface.l),
    "--bg-c": String(p.surface.c),
    ...surfaceTokens(p),
    "--on-brand": `0.16 0.01 ${n}`,
    "--primary-foreground": `0.16 0.01 ${n}`,
  };
  for (const role of Object.keys(p.colors) as BrandRole[]) {
    vars[`--${role}`] = triple(p.colors[role]);
    vars[`--${role}-h`] = String(p.colors[role].h);
  }
  return vars;
}

/** Writes a palette's CSS custom properties onto <html> and remembers the choice. */
export function applyPalette(id: PaletteId, persist = true): void {
  const palette = PALETTES[id];
  const root = document.documentElement;
  root.dataset.palette = id;
  root.style.setProperty("--neutral-hue", String(palette.neutralHue));
  root.style.setProperty("--bg-l", String(palette.surface.l));
  root.style.setProperty("--bg-c", String(palette.surface.c));
  for (const role of Object.keys(palette.colors) as BrandRole[]) {
    const color = palette.colors[role];
    root.style.setProperty(`--${role}`, triple(color));
    root.style.setProperty(`--${role}-h`, String(color.h));
  }
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Private mode / storage full: the palette still applies for this session.
    }
  }
}
