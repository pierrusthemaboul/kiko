import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const ICON_PATH = './assets/images/oklogo.png';

async function checkAlphaChannel() {
  console.log('🔍 Checking oklogo.png for alpha channel...');

  try {
    // Check if ImageMagick is available
    try {
      await execAsync('magick --version');
    } catch {
      console.log('⚠️  ImageMagick not found. Please install it or check the icon manually.');
      console.log('   On macOS: brew install imagemagick');
      console.log('   On Windows: download from https://imagemagick.org');
      return;
    }

    // Check for alpha channel using ImageMagick
    const { stdout } = await execAsync(`magick identify -verbose "${ICON_PATH}" | findstr "Alpha"`);

    if (stdout.includes('Alpha') && !stdout.includes('Undefined')) {
      console.log('⚠️  WARNING: Icon has alpha transparency channel!');
      console.log('   Apple App Store requires no transparency in app icons.');
      console.log('   Attempting to fix...');

      // Remove alpha channel by converting to jpg and back to png with white background
      const tempPath = ICON_PATH.replace('.png', '_temp.png');
      await execAsync(`magick "${ICON_PATH}" -background white -alpha remove -alpha off "${tempPath}"`);

      // Replace original
      fs.unlinkSync(ICON_PATH);
      fs.renameSync(tempPath, ICON_PATH);

      console.log('✅ Fixed! Alpha channel removed and replaced with white background.');
    } else {
      console.log('✅ Icon has no alpha channel - good for App Store submission!');
    }

    // Check icon size
    const { stdout: sizeOutput } = await execAsync(`magick identify -format "%w %h" "${ICON_PATH}"`);
    const [width, height] = sizeOutput.trim().split(' ').map(Number);
    console.log(`   Icon dimensions: ${width}x${height}px`);

    if (width !== height) {
      console.log('⚠️  WARNING: Icon is not square! App Store requires square icons.');
    }

    if (width < 1024) {
      console.log('⚠️  WARNING: Icon is smaller than 1024x1024px recommended for App Store.');
    }

  } catch (error) {
    console.error('❌ Error checking icon:', error.message);
  }
}

checkAlphaChannel();
