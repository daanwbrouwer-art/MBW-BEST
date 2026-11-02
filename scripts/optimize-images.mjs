// Converts every PNG/JPG under public/assets to a resized WebP, rewrites the
// matching "/assets/....png" references in src/ to ".webp", and removes the
// originals so they stop shipping inside the Android/iOS bundle.
//
//   node scripts/optimize-images.mjs            # convert + rewrite + delete
//   node scripts/optimize-images.mjs --dry-run  # report only
//
// Safe to re-run: files that are already WebP are skipped. Originals remain
// in git history if one ever needs re-exporting.
import { readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_ASSETS = join(ROOT, "public", "assets");
const SRC = join(ROOT, "src");
const MAX_EDGE = 1080; // ~3x a 360px-wide card on a phone
const QUALITY = 82;
const dryRun = process.argv.includes("--dry-run");

function walk(dir, match) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, match));
    else if (match(name)) out.push(full);
  }
  return out;
}

const images = walk(PUBLIC_ASSETS, (n) => /\.(png|jpe?g)$/i.test(n));
let before = 0;
let after = 0;
const renamed = new Map(); // "/assets/x/y.png" -> "/assets/x/y.webp"

for (const file of images) {
  const size = statSync(file).size;
  const target = file.slice(0, -extname(file).length) + ".webp";
  const webPath = `/${relative(join(ROOT, "public"), file).split(sep).join("/")}`;
  renamed.set(webPath, webPath.replace(/\.(png|jpe?g)$/i, ".webp"));
  before += size;
  if (dryRun) continue;
  const buffer = await sharp(file)
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY, alphaQuality: 90, effort: 5 })
    .toBuffer();
  writeFileSync(target, buffer);
  after += buffer.length;
  unlinkSync(file);
}

// Rewrite references (plain and %20-encoded spellings).
let filesChanged = 0;
let refsChanged = 0;
for (const file of walk(SRC, (n) => /\.(tsx?|css)$/.test(n))) {
  let text = readFileSync(file, "utf8");
  let changed = false;
  for (const [from, to] of renamed) {
    for (const [a, b] of [
      [from, to],
      [encodeURI(from), encodeURI(to)],
    ]) {
      if (a !== b && text.includes(a)) {
        refsChanged += text.split(a).length - 1;
        text = text.split(a).join(b);
        changed = true;
      }
    }
  }
  if (changed) {
    filesChanged++;
    if (!dryRun) writeFileSync(file, text);
  }
}

const mb = (n) => `${(n / 1e6).toFixed(1)} MB`;
console.log(`${images.length} images: ${mb(before)}${dryRun ? "" : ` -> ${mb(after)}`}`);
console.log(`${refsChanged} references in ${filesChanged} source files ${dryRun ? "would be" : ""} rewritten`);
