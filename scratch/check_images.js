const fs = require('fs');
const path = require('path');

const files = [
  'Screenshot_2026-05-03-21-08-58-324_com.pierretulle.juno2.dev_iphone_6-7.jpg',
  'Screenshot_2026-05-03-21-09-30-731_com.pierretulle.juno2.dev_iphone_6-7.jpg',
  'Screenshot_2026-05-03-21-09-15-629_com.pierretulle.juno2.dev_iphone_6-7.jpg'
];

files.forEach(file => {
  const filePath = path.join(
    __dirname,
    '..',
    'mobile_app',
    'store',
    'apple',
    'screenshot',
    'fr-FR',
    'APP_IPHONE_65',
    file
  );

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const header = buffer.toString('hex', 0, 4);

  let detectedType = 'unknown';
  if (header.startsWith('89504e47')) {
    detectedType = 'PNG';
  } else if (header.startsWith('ffd8ff')) {
    detectedType = 'JPEG/JPG';
  }

  console.log(`File: ${file}`);
  console.log(`  Header bytes: ${header}`);
  console.log(`  Detected type: ${detectedType}`);
});
