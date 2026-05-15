/**
 * Convierte el negro sólido del hero en transparencia (PNG RGBA).
 * Uso: node scripts/knockout-auth-hero-bg.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const inputRel = "public/auth-hero-mining.png";
const input = path.join(root, inputRel);
const backup = path.join(root, "public/auth-hero-mining.before-alpha.png");

/** Píxeles con luminancia <= umbral pasan a transparentes (fondo negro). */
const LUM_THRESHOLD = 42;

function lum(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

async function main() {
  if (!fs.existsSync(input)) {
    console.error("No existe:", input);
    process.exit(1);
  }

  if (!fs.existsSync(backup)) {
    fs.copyFileSync(input, backup);
    console.log("Copia de seguridad:", backup);
  }

  const image = sharp(input).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) {
    console.error("Se esperaba RGBA tras ensureAlpha");
    process.exit(1);
  }

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const L = lum(r, g, b);
    if (L <= LUM_THRESHOLD) {
      data[i + 3] = 0;
    }
  }

  const outPath = input;
  await sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(outPath + ".tmp");

  fs.renameSync(outPath + ".tmp", outPath);
  console.log("OK:", outPath, `(${width}×${height}, fondo oscuro → α=0, umbral L=${LUM_THRESHOLD})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
