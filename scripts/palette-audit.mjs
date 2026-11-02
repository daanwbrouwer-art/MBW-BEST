// Objective scoring for the four-colour palettes in src/theme/palettes.ts.
//
//   node scripts/palette-audit.mjs
//
// The maths lives in src/theme/paletteScore.ts (shared with the in-app
// Palette Lab). This covers the "which palette reads best" half of an A/B
// test; the "which palette do people prefer" half is the blind test in
// Profile → Colour palette.
import { scorePalette } from "../src/theme/paletteScore.ts";
import { PALETTES } from "../src/theme/palettes.ts";

const rows = Object.values(PALETTES)
  .map((p) => {
    const s = scorePalette(p);
    return {
      palette: p.name,
      "min contrast on bg": s.minContrastOnBg.toFixed(2),
      "min dark-text contrast": s.minTextContrast.toFixed(2),
      "ΔE normal": s.separation.toFixed(1),
      "ΔE protan": s.separationProtan.toFixed(1),
      "ΔE deutan": s.separationDeutan.toFixed(1),
      "ΔE tritan": s.separationTritan.toFixed(1),
      sRGB: s.inSrgb ? "yes" : "clips",
      score: s.score,
    };
  })
  .sort((a, b) => b.score - a.score);

console.table(rows);
console.log("Targets: contrast ≥ 4.5 (WCAG AA text), ΔE ≥ ~10 to tell suits apart at a glance.");
