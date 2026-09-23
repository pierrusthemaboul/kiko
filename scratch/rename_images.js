const fs = require('fs');
const path = require('path');

const screenshotDir = path.join(
  __dirname,
  '..',
  'mobile_app',
  'store',
  'apple',
  'screenshot',
  'fr-FR',
  'APP_IPHONE_65'
);

const files = [
  'Screenshot_2026-05-03-21-08-58-324_com.pierretulle.juno2.dev_iphone_6-7.jpg',
  'Screenshot_2026-05-03-21-09-30-731_com.pierretulle.juno2.dev_iphone_6-7.jpg',
  'Screenshot_2026-05-03-21-09-15-629_com.pierretulle.juno2.dev_iphone_6-7.jpg'
];

// 1. Rename files on filesystem
console.log('Renaming files on filesystem...');
files.forEach(file => {
  const oldPath = path.join(screenshotDir, file);
  const newFile = file.replace('.jpg', '.png');
  const newPath = path.join(screenshotDir, newFile);

  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`  Renamed: ${file} -> ${newFile}`);
  } else if (fs.existsSync(newPath)) {
    console.log(`  Already renamed: ${newFile}`);
  } else {
    console.log(`  File not found (neither old nor new): ${file}`);
  }
});

// 2. Update store.config.json
const configPath = path.join(__dirname, '..', 'mobile_app', 'store.config.json');
if (fs.existsSync(configPath)) {
  console.log('\nUpdating store.config.json...');
  let content = fs.readFileSync(configPath, 'utf8');
  
  // Replace the .jpg extensions with .png in the config file
  const updatedContent = content.replace(/\.jpg/g, '.png');
  fs.writeFileSync(configPath, updatedContent, 'utf8');
  console.log('  store.config.json updated successfully!');
} else {
  console.log('  store.config.json not found!');
}
