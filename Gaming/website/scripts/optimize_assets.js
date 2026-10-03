const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Disable Sharp disk cache so files aren't locked
sharp.cache(false);

async function optimizeScreenshots() {
  console.log('--- Optimizing Screenshots ---');
  const dir = path.resolve(__dirname, '../public/screenshots');
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (!fs.statSync(full).isFile()) continue;
    const oldSize = fs.statSync(full).size;

    if (f.endsWith('.webp')) {
      const inputBuffer = fs.readFileSync(full);
      const buf = await sharp(inputBuffer)
        .resize({ width: 2560, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 6 })
        .toBuffer();

      if (buf.length < oldSize) {
        fs.writeFileSync(full, buf);
        console.log(`[Screenshot] ${f}: ${(oldSize / 1024).toFixed(1)} KB -> ${(buf.length / 1024).toFixed(1)} KB`);
      }
    }
  }
}

async function optimizeGames() {
  console.log('--- Optimizing Game Images ---');
  const dir = path.resolve(__dirname, '../public/games');
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (!fs.statSync(full).isFile() || !f.endsWith('.webp')) continue;
    const oldSize = fs.statSync(full).size;

    const inputBuffer = fs.readFileSync(full);
    const buf = await sharp(inputBuffer)
      .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toBuffer();

    if (buf.length < oldSize) {
      fs.writeFileSync(full, buf);
      console.log(`[Game] ${f}: ${(oldSize / 1024).toFixed(1)} KB -> ${(buf.length / 1024).toFixed(1)} KB`);
    }
  }
}

async function optimizeBlogImages() {
  console.log('--- Optimizing Blog Images ---');
  const dir = path.resolve(__dirname, '../public/images/blog');
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (!fs.statSync(full).isFile() || !f.endsWith('.png')) continue;
    const oldSize = fs.statSync(full).size;
    // Only optimize large uncompressed PNGs (> 200KB)
    if (oldSize > 200 * 1024) {
      const inputBuffer = fs.readFileSync(full);
      const buf = await sharp(inputBuffer)
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
        .png({ quality: 80, compressionLevel: 9, effort: 10, palette: true })
        .toBuffer();

      if (buf.length < oldSize) {
        fs.writeFileSync(full, buf);
        console.log(`[Blog PNG] ${f}: ${(oldSize / 1024).toFixed(1)} KB -> ${(buf.length / 1024).toFixed(1)} KB`);
      }
    }
  }
}

async function optimizeCoreIcons() {
  console.log('--- Optimizing Core Logos & Placeholders ---');
  // Logo: 256x256 max
  const logoPath = path.resolve(__dirname, '../public/logo.png');
  const oldLogoSize = fs.statSync(logoPath).size;
  const logoInput = fs.readFileSync(logoPath);
  const logoBuf = await sharp(logoInput)
    .resize({ width: 256, height: 256, fit: 'inside' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  if (logoBuf.length < oldLogoSize) {
    fs.writeFileSync(logoPath, logoBuf);
    console.log(`[Logo] logo.png: ${(oldLogoSize / 1024).toFixed(1)} KB -> ${(logoBuf.length / 1024).toFixed(1)} KB`);
  }

  // Favicon: 48x48
  const favPath = path.resolve(__dirname, '../public/favicon.ico');
  const oldFavSize = fs.statSync(favPath).size;
  const favBuf = await sharp(logoInput)
    .resize({ width: 48, height: 48 })
    .png()
    .toBuffer();
  if (favBuf.length < oldFavSize) {
    fs.writeFileSync(favPath, favBuf);
    console.log(`[Favicon] favicon.ico: ${(oldFavSize / 1024).toFixed(1)} KB -> ${(favBuf.length / 1024).toFixed(1)} KB`);
  }

  // App icon: 128x128
  const iconPath = path.resolve(__dirname, '../src/app/icon.png');
  if (fs.existsSync(iconPath)) {
    const oldIconSize = fs.statSync(iconPath).size;
    const iconInput = fs.readFileSync(iconPath);
    const iconBuf = await sharp(iconInput)
      .resize({ width: 128, height: 128, fit: 'inside' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    if (iconBuf.length < oldIconSize) {
      fs.writeFileSync(iconPath, iconBuf);
      console.log(`[Icon] icon.png: ${(oldIconSize / 1024).toFixed(1)} KB -> ${(iconBuf.length / 1024).toFixed(1)} KB`);
    }
  }

  // Contact Hero: 1200 max
  const contactPath = path.resolve(__dirname, '../public/contact_hero.png');
  if (fs.existsSync(contactPath)) {
    const oldContactSize = fs.statSync(contactPath).size;
    const contactInput = fs.readFileSync(contactPath);
    const contactBuf = await sharp(contactInput)
      .resize({ width: 1200, withoutEnlargement: true })
      .png({ quality: 80, compressionLevel: 9, palette: true })
      .toBuffer();
    if (contactBuf.length < oldContactSize) {
      fs.writeFileSync(contactPath, contactBuf);
      console.log(`[Contact Hero]: ${(oldContactSize / 1024).toFixed(1)} KB -> ${(contactBuf.length / 1024).toFixed(1)} KB`);
    }
  }

  // Placeholders
  for (const name of ['game-placeholder.png', 'gpu-placeholder.png', 'controller_mapping.png', 'dlss_evolution.png', 'vision_ai.png']) {
    const p = path.resolve(__dirname, '../public/images', name);
    if (!fs.existsSync(p)) continue;
    const oldSize = fs.statSync(p).size;
    const input = fs.readFileSync(p);
    const buf = await sharp(input)
      .resize({ width: 1024, withoutEnlargement: true })
      .png({ quality: 80, compressionLevel: 9, palette: true })
      .toBuffer();
    if (buf.length < oldSize) {
      fs.writeFileSync(p, buf);
      console.log(`[Image] ${name}: ${(oldSize / 1024).toFixed(1)} KB -> ${(buf.length / 1024).toFixed(1)} KB`);
    }
  }
}

async function main() {
  await optimizeScreenshots();
  await optimizeGames();
  await optimizeBlogImages();
  await optimizeCoreIcons();
  console.log('--- Asset Optimization Complete! ---');
}

main().catch(console.error);
