import sharp from "sharp";
import { readdir, stat, readFile, writeFile } from "fs/promises";
import { createHash } from "crypto";
import { join, extname, basename } from "path";

const ESSAYS_DIR = "src/content/essays";
const LOOP_DIR = "public/assets/loop";
const MANIFEST = ".compress-manifest.json";
const QUALITY = 80;
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function findImages(dir) {
  const images = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) images.push(...await findImages(full));
    else if (EXTS.has(extname(entry.name).toLowerCase())) images.push(full);
  }
  return images;
}

async function hash(file) {
  const buf = await readFile(file);
  return createHash("sha1").update(buf).digest("hex");
}

async function compress(file, manifest) {
  const h = await hash(file);
  if (manifest[file] === h) {
    console.log(`  ${basename(file)}: unchanged, skipped`);
    return { file, hash: h };
  }

  const before = (await stat(file)).size;
  const ext = extname(file).toLowerCase();
  const tmp = file + ".tmp";

  let pipeline = sharp(file);
  if (ext === ".png") pipeline = pipeline.png({ quality: QUALITY, compressionLevel: 9 });
  else pipeline = pipeline.jpeg({ quality: QUALITY, mozjpeg: true });

  await pipeline.toFile(tmp);

  const after = (await stat(tmp)).size;
  const { rename, unlink } = await import("fs/promises");

  if (after < before) {
    await rename(tmp, file);
    const saved = (((before - after) / before) * 100).toFixed(1);
    console.log(`  ${basename(file)}: ${kb(before)} → ${kb(after)} (${saved}% saved)`);
    const newHash = await hash(file);
    return { file, hash: newHash };
  } else {
    await unlink(tmp);
    console.log(`  ${basename(file)}: already optimal, skipped`);
    return { file, hash: h };
  }
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

async function convertLoopFrames(manifest) {
  const entries = await readdir(LOOP_DIR);
  const pngs = entries.filter(f => extname(f).toLowerCase() === '.png');
  for (const name of pngs) {
    const png = join(LOOP_DIR, name);
    const webp = png.replace(/\.png$/i, '.webp');
    const key = `loop:${name}`;
    const h = await hash(png);
    if (manifest[key] === h) {
      console.log(`  ${name.replace('.png', '.webp')}: unchanged, skipped`);
      continue;
    }
    const before = (await stat(png)).size;
    await sharp(png).resize(960).webp({ quality: 82 }).toFile(webp);
    const after = (await stat(webp)).size;
    const saved = (((before - after) / before) * 100).toFixed(1);
    console.log(`  ${name.replace('.png', '.webp')}: ${kb(before)} → ${kb(after)} (${saved}% saved)`);
    manifest[key] = h;
  }
}

let manifest = {};
try {
  manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
} catch {}

const images = await findImages(ESSAYS_DIR);
if (images.length === 0) {
  console.log("compress-images: no images found");
} else {
  console.log(`compress-images: found ${images.length} image(s)`);
  const results = await Promise.all(images.map((f) => compress(f, manifest)));
  for (const { file, hash: h } of results) manifest[file] = h;
}

console.log("compress-images: converting loop frames to WebP");
await convertLoopFrames(manifest);

await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
