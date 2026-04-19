import sharp from 'sharp';
import fs from 'fs';

const ICON_PATH = './assets/images/oklogo.png';

async function checkAndFixIcon() {
  console.log('🔍 Checking oklogo.png for alpha channel...');

  try {
    const metadata = await sharp(ICON_PATH).metadata();

    console.log('Icon metadata:');
    console.log(`  Dimensions: ${metadata.width}x${metadata.height}px`);
    console.log(`  Has Alpha: ${metadata.hasAlpha}`);
    console.log(`  Channels: ${metadata.channels}`);

    if (metadata.width !== metadata.height) {
      console.log('⚠️  WARNING: Icon is not square! App Store requires square icons.');
    }

    if (metadata.hasAlpha) {
      console.log('⚠️  WARNING: Icon has alpha transparency channel!');
      console.log('   Apple App Store requires no transparency in app icons.');
      console.log('   Fixing...');

      // Remove alpha channel by flattening with white background
      const tempPath = './assets/images/oklogo_temp.png';
      await sharp(ICON_PATH)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .removeAlpha()
        .toFile(tempPath);

      // Replace original
      fs.unlinkSync(ICON_PATH);
      fs.renameSync(tempPath, ICON_PATH);

      // Verify the fix
      const newMetadata = await sharp(ICON_PATH).metadata();
      if (!newMetadata.hasAlpha) {
        console.log('✅ Fixed! Alpha channel removed and replaced with white background.');
      } else {
        console.log('❌ Failed to remove alpha channel');
      }
    } else {
      console.log('✅ Icon has no alpha channel - good for App Store submission!');
    }

  } catch (error) {
    console.error('❌ Error checking icon:', error.message);
    process.exit(1);
  }
}

checkAndFixIcon();
