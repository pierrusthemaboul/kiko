const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const inputVideo = process.argv[2];
if (!inputVideo) {
    console.error('❌ Usage: node derush_clipper.js <chemin/video.mp4> [options]');
    console.error('\nOptions:');
    console.error('  --clips "0-10,15-25,30-40"  : Découper aux timestamps spécifiés (en secondes)');
    console.error('  --duration 15               : Découper en segments de X secondes');
    console.error('  --auto                      : Découpage automatique intelligent (à venir)');
    console.error('\nExemple:');
    console.error('  node derush_clipper.js ../ASSETS_RAW/raw_gameplay.mp4 --clips "0-10,15-25"');
    process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, '../OUTPUTS/clips');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`🎬 DERUSH (CLIPPER) : "Découpage de la matière première"`);
console.log(`   📹 Fichier source : ${path.basename(inputVideo)}`);
console.log(`   📁 Destination : OUTPUTS/clips/`);
console.log(`\n⚠️  IMPORTANT : Derush fait du découpage technique UNIQUEMENT.`);
console.log(`   Pas de transitions, pas de musique, pas de texte.\n`);

// Vérifier que ffmpeg est installé
try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
} catch (e) {
    console.error('❌ ERREUR : ffmpeg n\'est pas installé.');
    console.error('   Installation : sudo apt install ffmpeg (Linux)');
    console.error('   ou : brew install ffmpeg (Mac)');
    process.exit(1);
}

// Vérifier que le fichier existe
if (!fs.existsSync(inputVideo)) {
    console.error(`❌ ERREUR : Fichier introuvable : ${inputVideo}`);
    process.exit(1);
}

// Parser les options
const mode = process.argv[3] || '--help';

switch(mode) {
    case '--clips':
        // Découpage manuel par timestamps
        const clipsArg = process.argv[4];
        if (!clipsArg) {
            console.error('❌ Spécifiez les clips : --clips "0-10,15-25,30-40"');
            process.exit(1);
        }

        const clips = clipsArg.split(',').map(c => c.trim());
        console.log(`📋 Découpage en ${clips.length} segments :\n`);

        clips.forEach((clip, index) => {
            const [start, end] = clip.split('-').map(t => parseInt(t));
            const duration = end - start;
            const outputFile = path.join(OUTPUT_DIR, `clip_${index + 1}_${start}s-${end}s.mp4`);

            console.log(`   Segment ${index + 1}/${clips.length} : ${start}s → ${end}s (${duration}s)`);

            try {
                execSync(
                    `ffmpeg -i "${inputVideo}" -ss ${start} -t ${duration} -c copy "${outputFile}" -y -loglevel error`,
                    { stdio: 'inherit' }
                );
                console.log(`   ✅ Créé : ${path.basename(outputFile)}`);
            } catch (e) {
                console.error(`   ❌ Erreur segment ${index + 1}`);
            }
        });
        break;

    case '--duration':
        // Découpage en segments de durée fixe
        const segmentDuration = parseInt(process.argv[4] || 15);
        console.log(`📋 Découpage en segments de ${segmentDuration}s`);

        // Obtenir la durée totale de la vidéo
        const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputVideo}"`;
        const totalDuration = parseFloat(execSync(durationCmd).toString().trim());
        const numSegments = Math.ceil(totalDuration / segmentDuration);

        console.log(`   Durée totale : ${totalDuration.toFixed(1)}s`);
        console.log(`   Nombre de segments : ${numSegments}\n`);

        for (let i = 0; i < numSegments; i++) {
            const start = i * segmentDuration;
            const outputFile = path.join(OUTPUT_DIR, `segment_${i + 1}_${start}s.mp4`);

            console.log(`   Segment ${i + 1}/${numSegments} : ${start}s → ${start + segmentDuration}s`);

            try {
                execSync(
                    `ffmpeg -i "${inputVideo}" -ss ${start} -t ${segmentDuration} -c copy "${outputFile}" -y -loglevel error`,
                    { stdio: 'inherit' }
                );
                console.log(`   ✅ Créé : ${path.basename(outputFile)}`);
            } catch (e) {
                console.error(`   ❌ Erreur segment ${i + 1}`);
            }
        }
        break;

    case '--auto':
        console.log('🤖 Mode AUTO : Détection intelligente des moments clés');
        console.log('   (À venir : détection de scènes, changements visuels, etc.)');
        console.log('   Pour l\'instant, utilisez --duration 15 ou --clips "x-y"');
        break;

    default:
        console.log('❌ Option inconnue. Utilisez --help pour voir les options.');
        break;
}

console.log(`\n✅ DÉCOUPAGE TERMINÉ`);
console.log(`\n📦 LIVRABLES BRUTS (segments) :`);
console.log(`   📁 ${OUTPUT_DIR}`);
console.log(`\n📋 PROCHAINES ÉTAPES (Reporters workflow) :`);
console.log(`   1. Vérifier la qualité des clips`);
console.log(`   2. Extraire des frames si nécessaire (derush_frames.js)`);
console.log(`   3. Valider avec Lucas (lucas_validator.js)`);
console.log(`   4. Livrer à K-Hive dans DATA_OUTBOX/TO_K_HIVE/`);
console.log(`\n💡 Derush fait du découpage technique. K-Hive fera la post-prod créative.`);
