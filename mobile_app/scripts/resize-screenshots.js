const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '../store_listing/screenshots/cropped');
const OUTPUT_DIR = path.join(__dirname, '../store_listing/screenshots/final');

// Résolutions Apple requises
const IOS_RESOLUTIONS = {
  '6.7': { width: 1242, height: 2688 }, // iPhone 12 Pro Max, 13 Pro Max, 14 Pro Max
  '6.5': { width: 1242, height: 2208 }, // iPhone XS Max, 11 Pro Max
  '5.5': { width: 1242, height: 2208 }, // iPhone 8 Plus, 7 Plus
};

// Créer le dossier de sortie
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function resizeScreenshots() {
  const files = fs.readdirSync(INPUT_DIR);
  const imageFiles = files.filter(f => 
    f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
  );

  console.log(`Found ${imageFiles.length} screenshots to resize`);

  for (const file of imageFiles) {
    const inputPath = path.join(INPUT_DIR, file);
    
    try {
      const metadata = await sharp(inputPath).metadata();
      console.log(`Processing ${file}: ${metadata.width}x${metadata.height}`);

      // Générer pour chaque résolution iOS
      for (const [size, dimensions] of Object.entries(IOS_RESOLUTIONS)) {
        const outputFile = file.replace(/\.[^.]+$/, `_iphone_${size.replace('.', '-')}${path.extname(file)}`);
        const outputPath = path.join(OUTPUT_DIR, outputFile);

        await sharp(inputPath)
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'center'
          })
          .toFile(outputPath);

        console.log(`  ✅ Resized to iPhone ${size}" (${dimensions.width}x${dimensions.height}) -> ${outputFile}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  console.log('\nDone! Check the final/ folder for resized screenshots.');
  console.log('Upload these to App Store Connect for each device size.');
}

resizeScreenshots().catch(console.error);
