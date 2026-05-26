const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '../store_listing/screenshots');
const OUTPUT_DIR = path.join(__dirname, '../store_listing/screenshots/cropped');

// Configuration pour recadrer la barre de notification
// iOS status bar height: ~44px (iPhone X+) ou ~20px (older devices)
// On va couper environ 50px du haut pour être sûr
const CROP_TOP = 50;

// Créer le dossier de sortie
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function cropScreenshots() {
  const files = fs.readdirSync(INPUT_DIR);
  const imageFiles = files.filter(f => 
    f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
  );

  console.log(`Found ${imageFiles.length} screenshots to process`);

  for (const file of imageFiles) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    try {
      const metadata = await sharp(inputPath).metadata();
      console.log(`Processing ${file}: ${metadata.width}x${metadata.height}`);

      // Recadrer en enlevant la barre de notification du haut
      await sharp(inputPath)
        .extract({
          left: 0,
          top: CROP_TOP,
          width: metadata.width,
          height: metadata.height - CROP_TOP
        })
        .toFile(outputPath);

      console.log(`✅ Cropped ${file}`);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  console.log('\nDone! Check the cropped/ folder for processed screenshots.');
}

cropScreenshots().catch(console.error);
