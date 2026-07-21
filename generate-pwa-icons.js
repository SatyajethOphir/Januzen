import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const sourceFile = 'public/logo.png';
  if (!fs.existsSync(sourceFile)) {
    console.error(`Source file ${sourceFile} not found!`);
    process.exit(1);
  }

  console.log('Generating PWA and Notification Icons from:', sourceFile);

  // 1. Standard Sizes
  const standardSizes = [
    { size: 32, name: 'favicon.png' },
    { size: 72, name: 'icon-72x72.png' },
    { size: 96, name: 'icon-96x96.png' },
    { size: 128, name: 'icon-128x128.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 256, name: 'icon-256x256.png' },
    { size: 384, name: 'icon-384x384.png' },
    { size: 512, name: 'icon-512x512.png' },
  ];

  for (const { size, name } of standardSizes) {
    await sharp(sourceFile)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(path.join('public', name));
    console.log(`Generated standard icon: ${name} (${size}x${size})`);
  }

  // 2. Maskable Icons (padded logo over solid background `#0F172A`)
  const maskableSizes = [192, 512];
  for (const size of maskableSizes) {
    const name = `icon-maskable-${size}x${size}.png`;
    // Resize the logo to be smaller inside the container to avoid getting clipped
    const innerLogoSize = Math.round(size * 0.7);
    const innerLogo = await sharp(sourceFile)
      .resize(innerLogoSize, innerLogoSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 } // #0F172A
      }
    })
    .composite([{ input: innerLogo, gravity: 'center' }])
    .png()
    .toFile(path.join('public', name));
    console.log(`Generated maskable icon: ${name} (${size}x${size})`);
  }

  // 3. Monochrome Notification Badge (pure white silhouette)
  try {
    const meta = await sharp(sourceFile).metadata();
    const width = meta.width || 512;
    const height = meta.height || 512;

    let alphaChannel;
    if (meta.hasAlpha) {
      alphaChannel = await sharp(sourceFile)
        .extractChannel('alpha')
        .toBuffer();
    } else {
      // If no alpha channel, the image background is likely white/light.
      // Convert to greyscale, negate (invert colors so dark logo becomes white, white bg becomes black), 
      // and use that as the alpha channel!
      alphaChannel = await sharp(sourceFile)
        .greyscale()
        .negate()
        .toBuffer();
    }

    const whiteCanvas = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .png()
    .toBuffer();

    const monochromeLogo = await sharp(whiteCanvas)
      .joinChannel(alphaChannel)
      .png()
      .toBuffer();

    // Resize badge to 96x96 (and we can also make 72x72 / 48x48 if needed, but 96x96 is perfect for modern Android)
    const badgeSizes = [96];
    for (const size of badgeSizes) {
      const name = `badge-${size}x${size}.png`;
      await sharp(monochromeLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toFile(path.join('public', name));
      console.log(`Generated monochrome badge: ${name} (${size}x${size})`);
    }

    // Also copy badge-96x96.png to badge.png as a standard fallback
    fs.copyFileSync('public/badge-96x96.png', 'public/badge.png');
    console.log('Copied badge-96x96.png to badge.png');

  } catch (err) {
    console.error('Failed to generate monochrome badge. Falling back to resized logo:', err);
    // Fallback: just use standard white or logo
    await sharp(sourceFile)
      .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join('public', 'badge-96x96.png'));
    fs.copyFileSync('public/badge-96x96.png', 'public/badge.png');
  }

  // 4. Overwrite appicon.png as well with logo-derived 512x512
  fs.copyFileSync('public/icon-512x512.png', 'public/appicon.png');
  console.log('Synchronized appicon.png with icon-512x512.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error during icon generation:', err);
  process.exit(1);
});
