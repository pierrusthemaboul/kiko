import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots');
const OUTPUT_DIR = path.join(process.cwd(), 'screenshots', 'iphone_frames');
const TARGET_WIDTH = 1290;
const TARGET_HEIGHT = 2796;
const STATUS_BAR_HEIGHT = 90; // Pixels à recadrer en haut (barre de statut Android)

// Créer dossier de sortie
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Lire tous les fichiers JPG du dossier screenshots
const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

console.log(`Found ${files.length} screenshots to resize...`);

for (const file of files) {
  const inputPath = path.join(SCREENSHOTS_DIR, file);
  const outputPath = path.join(OUTPUT_DIR, file.replace(/\.(jpg|png)$/, '_iphone.png'));

  console.log(`Processing: ${file}`);

  // Récupérer les dimensions originales
  const metadata = await sharp(inputPath).metadata();
  const cropHeight = metadata.height - STATUS_BAR_HEIGHT;

  await sharp(inputPath)
    .extract({ left: 0, top: STATUS_BAR_HEIGHT, width: metadata.width, height: cropHeight })
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    })
    .png()
    .toFile(outputPath);

  console.log(`✓ Saved: ${path.basename(outputPath)}`);
}

console.log(`\nDone! ${files.length} images resized to ${TARGET_WIDTH}x${TARGET_HEIGHT}px`);
console.log(`Output folder: ${OUTPUT_DIR}`);
