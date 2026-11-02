// Objective palette scoring, shared by the in-app Palette Lab and
// `scripts/palette-audit.mjs`. Measures, on each palette's own background:
//   • contrast   — WCAG 2 contrast of each brand colour as text/icons on the
//                  background, and of dark button text on each colour
//   • separation — smallest OKLab distance (ΔE×100) between any two suit
//                  colours, for normal vision and simulated protanopia /
//                  deuteranopia / tritanopia (Machado et al. 2009, severity 1)
//   • gamut      — whether every colour is displayable in sRGB
import type { Oklch, Palette } from "./palettes";

type Vec3 = [number, number, number];

function oklchToOklab({ l, c, h }: Oklch): Vec3 {
  const r = (h * Math.PI) / 180;
  return [l, c * Math.cos(r), c * Math.sin(r)];
}

function oklabToLinear([L, a, b]: Vec3): Vec3 {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function linearToOklab([r, g, b]: Vec3): Vec3 {
  const l = Math.cbrt(0.4122214708 * r + 0.5363288246 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const clip = (v: number) => Math.min(1, Math.max(0, v));
const clipRgb = (v: Vec3): Vec3 => [clip(v[0]), clip(v[1]), clip(v[2])];
const inGamut = (rgb: Vec3) => rgb.every((v) => v >= -0.001 && v <= 1.001);
const luminance = ([r, g, b]: Vec3) =>
  0.2126 * clip(r) + 0.7152 * clip(g) + 0.0722 * clip(b);
const contrast = (y1: number, y2: number) =>
  (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);
const deltaE = (p: Vec3, q: Vec3) =>
  Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) * 100;

const CVD: Record<"protan" | "deutan" | "tritan", Vec3[]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

const applyMatrix = (m: Vec3[], v: Vec3): Vec3 =>
  m.map((row) => clip(row[0] * v[0] + row[1] * v[1] + row[2] * v[2])) as Vec3;

function minPairwise(points: Vec3[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      min = Math.min(min, deltaE(points[i], points[j]));
  return min;
}

export interface PaletteScore {
  minContrastOnBg: number;
  minTextContrast: number;
  separation: number;
  separationProtan: number;
  separationDeutan: number;
  separationTritan: number;
  inSrgb: boolean;
  /** 0–100, readability first, then colour-blind separation. */
  score: number;
}

export function scorePalette(p: Palette): PaletteScore {
  const bg = oklabToLinear(oklchToOklab({ ...p.surface, h: p.neutralHue }));
  const darkText = oklabToLinear(
    oklchToOklab({ l: 0.16, c: 0.01, h: p.neutralHue }),
  );
  const linear = Object.values(p.colors).map((c) =>
    oklabToLinear(oklchToOklab(c)),
  );

  const minContrastOnBg = Math.min(
    ...linear.map((rgb) => contrast(luminance(rgb), luminance(bg))),
  );
  const minTextContrast = Math.min(
    ...linear.map((rgb) => contrast(luminance(rgb), luminance(darkText))),
  );
  const separation = minPairwise(
    linear.map((rgb) => linearToOklab(clipRgb(rgb))),
  );
  const cvd = (m: Vec3[]) =>
    minPairwise(
      linear.map((rgb) => linearToOklab(applyMatrix(m, clipRgb(rgb)))),
    );
  const separationProtan = cvd(CVD.protan);
  const separationDeutan = cvd(CVD.deutan);
  const separationTritan = cvd(CVD.tritan);
  const worstCvd = Math.min(
    separationProtan,
    separationDeutan,
    separationTritan,
  );
  const inSrgb = linear.every(inGamut);

  const s = (v: number, lo: number, hi: number) => clip((v - lo) / (hi - lo));
  const score = Math.round(
    100 *
      (0.25 * s(minContrastOnBg, 4.5, 9) +
        0.2 * s(minTextContrast, 4.5, 10) +
        0.2 * s(separation, 10, 30) +
        0.3 * s(worstCvd, 4, 18) +
        0.05 * (inSrgb ? 1 : 0)),
  );

  return {
    minContrastOnBg,
    minTextContrast,
    separation,
    separationProtan,
    separationDeutan,
    separationTritan,
    inSrgb,
    score,
  };
}
