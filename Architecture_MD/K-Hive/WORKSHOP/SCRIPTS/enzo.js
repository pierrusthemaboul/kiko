const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Configuration
const ASSETS_DIR = path.join(__dirname, '../../../../assets/images');
const LOGO_PATH = path.join(ASSETS_DIR, 'oklogo.png');
const OUTPUT_DIR = path.join(__dirname, '../../DATA_INBOX/OUTPUTS');

// Args
const args = process.argv.slice(2);
const inputPath = args[0];

if (!inputPath) {
    console.error("❌ Usage: node visual_bot.js <chemin_image_source>");
    process.exit(1);
}

if (!fs.existsSync(inputPath)) {
    console.error(`❌ Fichier introuvable : ${inputPath}`);
    process.exit(1);
}

// Créer le dossier output si besoin
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function processImage() {
    console.log(`🎨 Visual Bot au travail sur : ${path.basename(inputPath)}`);

    try {
        const filename = `tiktok_${Date.now()}_${path.basename(inputPath)}`;
        const outputPath = path.join(OUTPUT_DIR, filename);

        // 1. Fond noir 9:16 (1080x1920)
        // 2. On resize l'image source pour qu'elle tienne dedans (fit: contain) ou cover ? 
        // Pour l'histoire, 'contain' est mieux pour ne pas couper, avec fond flouté derrière.

        // Etape A : Créer fond flouté
        const blurredBackground = await sharp(inputPath)
            .resize(1080, 1920, { fit: 'cover' })
            .blur(20)
            .modulate({ brightness: 0.7 }) // Assombrir pour le contraste
            .toBuffer();

        // Etape B : Image principale nette
        const mainImage = await sharp(inputPath)
            .resize(1080, 1400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();

        // Etape C : Logo
        const logo = await sharp(LOGO_PATH)
            .resize(200) // Logo taille modeste
            .toBuffer();

        // Composition Finale
        await sharp(blurredBackground)
            .composite([
                { input: mainImage, gravity: 'center' },
                { input: logo, gravity: 'southeast', top: 1800, left: 850 } // En bas à droite
            ])
            .toFile(outputPath);

        console.log(`✅ Image générée : ${outputPath}`);
    } catch (error) {
        console.error("❌ Erreur traitement image:", error);
    }
}

processImage();
