const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '../store_listing/screenshots/final');
const OUTPUT_DIR = path.join(__dirname, '../store_listing/screenshots/ios-ready');

const DEVICE_FOLDERS = {
  '6.7-inch': 'iphone-6-7',
  '6.5-inch': 'iphone-6-5',
  '5.5-inch': 'iphone-5-5'
};

// Créer les dossiers de sortie
Object.values(DEVICE_FOLDERS).forEach(folder => {
  const folderPath = path.join(OUTPUT_DIR, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
});

async function organizeScreenshots() {
  const files = fs.readdirSync(INPUT_DIR);
  const imageFiles = files.filter(f => 
    f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
  );

  console.log(`Found ${imageFiles.length} screenshots to organize`);

  for (const file of imageFiles) {
    const inputPath = path.join(INPUT_DIR, file);
    
    // Déterminer le dossier de destination basé sur le nom du fichier
    let targetFolder = null;
    if (file.includes('iphone_6-7')) {
      targetFolder = DEVICE_FOLDERS['6.7-inch'];
    } else if (file.includes('iphone_6-5')) {
      targetFolder = DEVICE_FOLDERS['6.5-inch'];
    } else if (file.includes('iphone_5-5')) {
      targetFolder = DEVICE_FOLDERS['5.5-inch'];
    }

    if (targetFolder) {
      const outputPath = path.join(OUTPUT_DIR, targetFolder, file);
      fs.copyFileSync(inputPath, outputPath);
      console.log(`✅ Organized ${file} -> ${targetFolder}/`);
    } else {
      console.log(`⚠️ Skipped ${file} (unknown device size)`);
    }
  }

  console.log('\n✅ Done! Screenshots organized by device size:');
  console.log(`📁 ${OUTPUT_DIR}/`);
  Object.entries(DEVICE_FOLDERS).forEach(([size, folder]) => {
    const folderPath = path.join(OUTPUT_DIR, folder);
    const count = fs.readdirSync(folderPath).length;
    console.log(`  - ${size}: ${count} screenshots`);
  });
  console.log('\nUpload each folder to App Store Connect for the corresponding device size.');
}

organizeScreenshots().catch(console.error);
