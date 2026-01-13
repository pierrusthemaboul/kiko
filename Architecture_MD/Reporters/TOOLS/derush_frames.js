const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const inputVideo = process.argv[2];
if (!inputVideo) {
    console.error('❌ Usage: node derush_frames.js <chemin/video.mp4> [options]');
    console.error('\nOptions:');
    console.error('  --interval 2     : Extraire 1 frame toutes les X secondes');
    console.error('  --timestamps "5,10,15,20" : Extraire aux timestamps précis');
    console.error('  --count 10       : Extraire exactement X frames espacées uniformément');
    console.error('  --all            : Extraire TOUTES les frames (attention à la taille!)');
    console.error('\nExemple:');
    console.error('  node derush_frames.js ../ASSETS_RAW/raw_gameplay.mp4 --interval 5');
    process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, '../OUTPUTS/screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`📸 DERUSH (FRAMES EXTRACTOR) : "Extraction de screenshots"`);
console.log(`   📹 Fichier source : ${path.basename(inputVideo)}`);
console.log(`   📁 Destination : OUTPUTS/screenshots/`);
console.log(`\n⚠️  IMPORTANT : Derush extrait des images BRUTES du jeu.`);
console.log(`   Aucune retouche, aucun overlay. Juste les pixels du jeu.\n`);

// Vérifier ffmpeg
try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
} catch (e) {
    console.error('❌ ERREUR : ffmpeg n\'est pas installé.');
    process.exit(1);
}

// Vérifier que le fichier existe
if (!fs.existsSync(inputVideo)) {
    console.error(`❌ ERREUR : Fichier introuvable : ${inputVideo}`);
    process.exit(1);
}

// Obtenir la durée totale
const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputVideo}"`;
const totalDuration = parseFloat(execSync(durationCmd).toString().trim());

console.log(`   ⏱️  Durée vidéo : ${totalDuration.toFixed(1)}s\n`);

const mode = process.argv[3] || '--help';
const videoBasename = path.basename(inputVideo, path.extname(inputVideo));

switch(mode) {
    case '--interval':
        const interval = parseInt(process.argv[4] || 2);
        const numFrames = Math.floor(totalDuration / interval);

        console.log(`📋 Extraction toutes les ${interval}s (${numFrames} frames)\n`);

        for (let i = 0; i < numFrames; i++) {
            const timestamp = i * interval;
            const outputFile = path.join(OUTPUT_DIR, `${videoBasename}_frame_${timestamp}s.png`);

            console.log(`   Frame ${i + 1}/${numFrames} à ${timestamp}s`);

            try {
                execSync(
                    `ffmpeg -ss ${timestamp} -i "${inputVideo}" -vframes 1 "${outputFile}" -y -loglevel error`,
                    { stdio: 'inherit' }
                );
                console.log(`   ✅ Créé : ${path.basename(outputFile)}`);
            } catch (e) {
                console.error(`   ❌ Erreur frame ${i + 1}`);
            }
        }
        break;

    case '--timestamps':
        const timestamps = process.argv[4].split(',').map(t => parseFloat(t.trim()));

        console.log(`📋 Extraction aux timestamps spécifiés (${timestamps.length} frames)\n`);

        timestamps.forEach((timestamp, index) => {
            if (timestamp > totalDuration) {
                console.log(`   ⚠️  Timestamp ${timestamp}s > durée vidéo, ignoré`);
                return;
            }

            const outputFile = path.join(OUTPUT_DIR, `${videoBasename}_frame_${timestamp}s.png`);

            console.log(`   Frame ${index + 1}/${timestamps.length} à ${timestamp}s`);

            try {
                execSync(
                    `ffmpeg -ss ${timestamp} -i "${inputVideo}" -vframes 1 "${outputFile}" -y -loglevel error`,
                    { stdio: 'inherit' }
                );
                console.log(`   ✅ Créé : ${path.basename(outputFile)}`);
            } catch (e) {
                console.error(`   ❌ Erreur frame ${index + 1}`);
            }
        });
        break;

    case '--count':
        const count = parseInt(process.argv[4] || 10);
        const step = totalDuration / (count + 1);

        console.log(`📋 Extraction de ${count} frames espacées uniformément\n`);

        for (let i = 1; i <= count; i++) {
            const timestamp = step * i;
            const outputFile = path.join(OUTPUT_DIR, `${videoBasename}_frame_${i}.png`);

            console.log(`   Frame ${i}/${count} à ${timestamp.toFixed(1)}s`);

            try {
                execSync(
                    `ffmpeg -ss ${timestamp} -i "${inputVideo}" -vframes 1 "${outputFile}" -y -loglevel error`,
                    { stdio: 'inherit' }
                );
                console.log(`   ✅ Créé : ${path.basename(outputFile)}`);
            } catch (e) {
                console.error(`   ❌ Erreur frame ${i}`);
            }
        }
        break;

    case '--all':
        console.log('⚠️  MODE --all : Extraction de TOUTES les frames');
        console.log('   Ceci peut générer des milliers d\'images!');
        console.log('   Utilisez plutôt --interval 0.5 pour avoir 2 frames/seconde.');
        console.log('\n   Si vous êtes sûr, utilisez : --interval 0.033 (≈30fps)');
        break;

    default:
        console.log('❌ Option inconnue. Utilisez --help pour voir les options.');
        break;
}

console.log(`\n✅ EXTRACTION TERMINÉE`);
console.log(`\n📦 LIVRABLES BRUTS (screenshots) :`);
console.log(`   📁 ${OUTPUT_DIR}`);
console.log(`\n📋 PROCHAINES ÉTAPES (Reporters workflow) :`);
console.log(`   1. Sélectionner les meilleures images (Lucas QA)`);
console.log(`   2. Livrer à K-Hive dans DATA_OUTBOX/TO_K_HIVE/`);
console.log(`   3. K-Hive ajoutera overlays, texte, logo (post-prod créative)`);
console.log(`\n💡 Derush extrait des pixels bruts. Pas de retouche, pas de filtre.`);
