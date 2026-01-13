const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../ASSETS_RAW');

// Créer dossier si besoin
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const timestamp = Date.now();
const filename = `screenshot_${timestamp}.png`;
const outputPath = path.join(OUTPUT_DIR, filename);

console.log(`📸 TOM (SCREENSHOT) : "Capture d'écran du jeu en direct"`);
console.log(`   📂 Fichier : ${filename}`);
console.log(`   📁 Destination : ASSETS_RAW/`);
console.log(`\n⚠️  IMPORTANT : Tom capture l'écran tel quel.`);
console.log(`   Pas de retouche, pas de crop, pas de filtre.\n`);

// Vérifier que ADB fonctionne
try {
    execSync('adb version', { stdio: 'ignore' });
} catch (e) {
    console.error('❌ ERREUR : ADB n\'est pas installé.');
    console.error('   Installation : sudo apt install adb (Linux)');
    console.error('   ou : brew install android-platform-tools (Mac)');
    process.exit(1);
}

// Vérifier qu'un device est connecté
try {
    const devices = execSync('adb devices').toString();
    if (!devices.includes('\tdevice')) {
        console.error('❌ ERREUR : Aucun téléphone détecté.');
        console.error('   1. Branchez votre téléphone en USB');
        console.error('   2. Activez le débogage USB');
        console.error('   3. Vérifiez avec : adb devices');
        process.exit(1);
    }
} catch (e) {
    console.error('❌ ERREUR ADB :', e.message);
    process.exit(1);
}

// Modes de capture
const mode = process.argv[2] || 'instant';

switch(mode) {
    case 'instant':
        // Capture immédiate
        console.log('📸 Mode INSTANT : Capture dans 3 secondes...');

        setTimeout(() => {
            console.log('📸 Capture en cours...');
            try {
                // Capturer l'écran sur le device
                const devicePath = '/sdcard/screenshot.png';
                execSync(`adb shell screencap -p ${devicePath}`);

                // Récupérer le fichier
                execSync(`adb pull ${devicePath} "${outputPath}"`);

                // Nettoyer le device
                execSync(`adb shell rm ${devicePath}`);

                console.log(`\n✅ CAPTURE RÉUSSIE`);
                console.log(`\n📦 LIVRABLE BRUT :`);
                console.log(`   📄 ${outputPath}`);
                console.log(`\n📋 PROCHAINES ÉTAPES :`);
                console.log(`   1. Valider la qualité avec Lucas`);
                console.log(`   2. Livrer à K-Hive dans DATA_OUTBOX/TO_K_HIVE/`);
                console.log(`\n💡 Tom capture la réalité brute du jeu.`);
            } catch (e) {
                console.error('❌ Erreur lors de la capture :', e.message);
            }
        }, 3000);
        break;

    case 'series':
        // Série de captures espacées
        const count = parseInt(process.argv[3] || 5);
        const interval = parseInt(process.argv[4] || 2);

        console.log(`📸 Mode SERIES : ${count} captures espacées de ${interval}s\n`);

        let captureIndex = 0;
        const captureInterval = setInterval(() => {
            if (captureIndex >= count) {
                clearInterval(captureInterval);
                console.log(`\n✅ SÉRIE TERMINÉE`);
                console.log(`\n📦 LIVRABLES BRUTS :`);
                console.log(`   📁 ${OUTPUT_DIR}`);
                return;
            }

            const seriesFilename = `screenshot_series_${timestamp}_${captureIndex + 1}.png`;
            const seriesPath = path.join(OUTPUT_DIR, seriesFilename);

            console.log(`   Capture ${captureIndex + 1}/${count}...`);

            try {
                const devicePath = '/sdcard/screenshot.png';
                execSync(`adb shell screencap -p ${devicePath}`, { stdio: 'ignore' });
                execSync(`adb pull ${devicePath} "${seriesPath}"`, { stdio: 'ignore' });
                execSync(`adb shell rm ${devicePath}`, { stdio: 'ignore' });
                console.log(`   ✅ ${seriesFilename}`);
            } catch (e) {
                console.error(`   ❌ Erreur capture ${captureIndex + 1}`);
            }

            captureIndex++;
        }, interval * 1000);
        break;

    case 'timed':
        // Capture après un délai spécifique
        const delay = parseInt(process.argv[3] || 5);

        console.log(`📸 Mode TIMED : Capture dans ${delay}s`);
        console.log(`   Préparez l'écran du jeu au bon moment...\n`);

        setTimeout(() => {
            console.log('📸 Capture maintenant !');
            try {
                const devicePath = '/sdcard/screenshot.png';
                execSync(`adb shell screencap -p ${devicePath}`);
                execSync(`adb pull ${devicePath} "${outputPath}"`);
                execSync(`adb shell rm ${devicePath}`);

                console.log(`\n✅ CAPTURE RÉUSSIE : ${filename}`);
            } catch (e) {
                console.error('❌ Erreur :', e.message);
            }
        }, delay * 1000);
        break;

    case '--help':
    default:
        console.log('\n📸 TOM SCREENSHOT - Modes disponibles :\n');
        console.log('  instant (défaut)           : Capture après 3s');
        console.log('  series <count> <interval>  : Série de captures');
        console.log('    Exemple : series 5 2     → 5 captures espacées de 2s');
        console.log('  timed <delay>              : Capture après X secondes');
        console.log('    Exemple : timed 10       → Capture dans 10s');
        console.log('\nExemples :');
        console.log('  node tom_screenshot.js');
        console.log('  node tom_screenshot.js series 10 3');
        console.log('  node tom_screenshot.js timed 5');
        process.exit(0);
}

// Gestion des erreurs
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Capture annulée par l\'utilisateur.');
    process.exit(0);
});
