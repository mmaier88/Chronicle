/**
 * Generate PWA icons for Chronicle
 *
 * Run with: node scripts/generate-icons.js
 *
 * This creates simple placeholder icons. Replace with actual designed icons later.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');

// Chronicle brand colors
const BACKGROUND_COLOR = '#0a0f18';
const ACCENT_COLOR = '#d4a574';

// Icon sizes needed for PWA
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple "C" logo SVG
function createLogoSvg(size) {
  const fontSize = Math.round(size * 0.6);
  const strokeWidth = Math.round(size * 0.02);

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${BACKGROUND_COLOR}" rx="${size * 0.15}"/>
      <text
        x="50%"
        y="55%"
        font-family="Georgia, serif"
        font-size="${fontSize}"
        font-weight="400"
        fill="${ACCENT_COLOR}"
        text-anchor="middle"
        dominant-baseline="middle"
        stroke="${ACCENT_COLOR}"
        stroke-width="${strokeWidth}"
      >C</text>
    </svg>
  `;
}

async function generateIcons() {
  // Ensure directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  console.log('Generating PWA icons...');

  for (const size of SIZES) {
    const svg = createLogoSvg(size);
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`  Created: icon-${size}x${size}.png`);
  }

  // Create shortcut icons (96x96)
  const shortcutSvgCreate = `
    <svg width="96" height="96" xmlns="http://www.w3.org/2000/svg">
      <rect width="96" height="96" fill="${BACKGROUND_COLOR}" rx="14"/>
      <text x="50%" y="55%" font-family="Georgia, serif" font-size="48" fill="${ACCENT_COLOR}" text-anchor="middle" dominant-baseline="middle">+</text>
    </svg>
  `;

  const shortcutSvgStories = `
    <svg width="96" height="96" xmlns="http://www.w3.org/2000/svg">
      <rect width="96" height="96" fill="${BACKGROUND_COLOR}" rx="14"/>
      <rect x="28" y="24" width="40" height="48" fill="none" stroke="${ACCENT_COLOR}" stroke-width="3" rx="4"/>
      <line x1="36" y1="38" x2="60" y2="38" stroke="${ACCENT_COLOR}" stroke-width="2"/>
      <line x1="36" y1="48" x2="60" y2="48" stroke="${ACCENT_COLOR}" stroke-width="2"/>
      <line x1="36" y1="58" x2="52" y2="58" stroke="${ACCENT_COLOR}" stroke-width="2"/>
    </svg>
  `;

  await sharp(Buffer.from(shortcutSvgCreate)).png().toFile(path.join(ICONS_DIR, 'shortcut-create.png'));
  await sharp(Buffer.from(shortcutSvgStories)).png().toFile(path.join(ICONS_DIR, 'shortcut-stories.png'));

  console.log('  Created: shortcut-create.png');
  console.log('  Created: shortcut-stories.png');

  // Create Apple Touch Icon (180x180)
  const appleSvg = createLogoSvg(180);
  await sharp(Buffer.from(appleSvg)).png().toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
  console.log('  Created: apple-touch-icon.png');

  // Create favicon (32x32)
  const faviconSvg = createLogoSvg(32);
  await sharp(Buffer.from(faviconSvg)).png().toFile(path.join(ICONS_DIR, 'favicon-32x32.png'));
  console.log('  Created: favicon-32x32.png');

  // Create favicon.ico (16x16)
  const favicon16Svg = createLogoSvg(16);
  await sharp(Buffer.from(favicon16Svg)).png().toFile(path.join(ICONS_DIR, 'favicon-16x16.png'));
  console.log('  Created: favicon-16x16.png');

  console.log('\nDone! Icons generated in public/icons/');
  console.log('\nNote: These are placeholder icons. Replace with professionally designed icons before release.');
}

generateIcons().catch(console.error);
