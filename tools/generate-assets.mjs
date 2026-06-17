import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync } from "fs";

function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const dirSize = 6 + 16 * count;
  const header = Buffer.alloc(dirSize);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type = ICO
  header.writeUInt16LE(count, 4);  // image count
  let offset = dirSize;
  for (let i = 0; i < count; i++) {
    const png = pngBuffers[i];
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    const base = 6 + i * 16;
    header.writeUInt8(w >= 256 ? 0 : w, base);
    header.writeUInt8(h >= 256 ? 0 : h, base + 1);
    header.writeUInt8(0, base + 2);          // color count
    header.writeUInt8(0, base + 3);          // reserved
    header.writeUInt16LE(1, base + 4);       // planes
    header.writeUInt16LE(32, base + 6);      // bit depth
    header.writeUInt32LE(png.length, base + 8);
    header.writeUInt32LE(offset, base + 12);
    offset += png.length;
  }
  return Buffer.concat([header, ...pngBuffers]);
}

const icon      = readFileSync("tools/assets-src/icon.svg");
const iconRound = readFileSync("tools/assets-src/icon-round.svg");
const notif     = readFileSync("tools/assets-src/icon-notification.svg");
const og        = readFileSync("tools/assets-src/og-image.svg");

const RES = "apps/mobile/android/app/src/main/res";
const SIZES = [
  { dir: "mipmap-mdpi",    px: 48  },
  { dir: "mipmap-hdpi",    px: 72  },
  { dir: "mipmap-xhdpi",   px: 96  },
  { dir: "mipmap-xxhdpi",  px: 144 },
  { dir: "mipmap-xxxhdpi", px: 192 },
];

console.log("Generating Android launcher icons...");
for (const { dir, px } of SIZES) {
  await sharp(icon).resize(px).png().toFile(`${RES}/${dir}/ic_launcher.png`);
  await sharp(iconRound).resize(px).png().toFile(`${RES}/${dir}/ic_launcher_round.png`);
  console.log(`  ${dir}: ${px}px`);
}

console.log("Generating Android notification icon...");
await sharp(notif).resize(96).png().toFile(`${RES}/drawable/ic_notification.png`);

console.log("Generating iOS app icon...");
await sharp(icon).resize(1024).png()
  .toFile("apps/mobile/ios/EscronetApp/Images.xcassets/AppIcon.appiconset/AppIcon-1024.png");

console.log("Generating web assets...");
await sharp(icon).resize(32).png().toFile("apps/frontend/src/app/icon.png");
await sharp(icon).resize(180).png().toFile("apps/frontend/public/apple-touch-icon.png");
await sharp(og).resize(1200, 630, { fit: "fill" }).png().toFile("apps/frontend/public/og-image.png");

console.log("Generating favicon.ico (16+32+48px)...");
const icoPngs = await Promise.all(
  [16, 32, 48].map((s) => sharp(icon).resize(s).png().toBuffer())
);
writeFileSync("apps/frontend/src/app/favicon.ico", buildIco(icoPngs));

console.log("Generating Play Store assets...");
mkdirSync("tools/store-assets", { recursive: true });
await sharp(icon).resize(512).png().toFile("tools/store-assets/play-icon.png");
await sharp(og).resize(1024, 500, { fit: "fill" }).png().toFile("tools/store-assets/play-feature.png");

console.log("Done. Copy tools/store-assets/ manually — these are not committed.");
