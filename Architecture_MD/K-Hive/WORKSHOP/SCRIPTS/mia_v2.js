const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Config
const LOGO_PATH = path.join(__dirname, '../../../../assets/images/oklogo.png');
const OUTPUT_DIR = path.join(__dirname, '../../DATA_INBOX/OUTPUTS');

// Args
const inputPath = process.argv[2];
const overlayPath = process.argv[3];

if (!inputPath || !overlayPath) {
    console.error("❌ Usage: node mia_v2.js <gameplay.mp4> <historical_image.jpg>");
    process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const filename = `production_premium_${Date.now()}.mp4`;
const outputPath = path.join(OUTPUT_DIR, filename);

console.log(`✨ MIA V2 (Directrice Artistique) : "On va rendre ça sexy."`);

/**
 * LOGIQUE FFMPEG AVANCÉE :
 * 1. Créer un arrière-plan flou à partir de la vidéo (boxblur).
 * 2. Poser la vidéo de gameplay originale au centre.
 * 3. Ajouter l'image historique (Napoleon) avec un effet de Zoom (Ken Burns).
 * 4. Ajouter le logo avec une opacité légère.
 */

const filter = [
    // [0:v] est la vidéo de gameplay
    // 1. Créer le background flou
    `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:10[bg_blurred]`,

    // 2. Préparer l'overlay (Suez) avec bordure et zoom lent
    `[1:v]scale=900:-1,pad=iw+20:ih+20:10:10:white[img_border]`,
    `[img_border]scale=2000:-1,zoompan=z='min(zoom+0.001,1.1)':d=500:s=900x900:fps=25[img_animated]`,

    // 3. Composition finale
    `[bg_blurred][0:v]overlay=(W-w)/2:(H-h)/2[base]`, // Fond flou + Jeu original par dessus
    `[base][img_animated]overlay=(W-w)/2:300[final_v]` // + Image animée
].join(';');

const args = [
    '-y',
    '-i', inputPath,
    '-i', overlayPath,
    '-i', LOGO_PATH,
    '-filter_complex', `${filter}`,
    '-map', '[final_v]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-t', '15', // On limite à 15s pour le test
    outputPath
];

const ffmpeg = spawn('ffmpeg', args);

ffmpeg.stderr.on('data', (data) => {
    console.log(data.toString());
});

ffmpeg.on('close', (code) => {
    if (code === 0) {
        console.log(`\n💎 CHEF-D'ŒUVRE TERMINÉ : ${outputPath}`);
    } else {
        console.error(`\n❌ Échec artistique (Code ${code})`);
    }
});
