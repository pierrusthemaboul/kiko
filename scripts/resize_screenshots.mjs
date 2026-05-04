import sharp from 'sharp';
import { readdirSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const inputDir = 'c:/Users/Pierre/kiko/screenshots';
const outputDir = 'c:/Users/Pierre/kiko/screenshots/ios_6.9';

if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
}

const files = readdirSync(inputDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

async function resize() {
    for (const file of files) {
        const inputPath = join(inputDir, file);
        const outputPath = join(outputDir, file.replace('.jpg', '.png')); // Apple prefers PNG
        
        console.log(`Resizing ${file}...`);
        
        await sharp(inputPath)
            .resize(1290, 2796, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 1 } // Black bars if aspect ratio differs
            })
            .toFile(outputPath);
            
        console.log(`Saved to ${outputPath}`);
    }
}

resize().catch(console.error);
