const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const DURATION_SEC = process.argv[2] ? parseInt(process.argv[2]) : 30; // Durée clip (modifiable)
const OUTPUT_DIR = path.join(__dirname, '../ASSETS_RAW');
const PACKAGE_NAME = 'com.pierretulle.juno2';

// Créer dossier si besoin
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const timestamp = Date.now();
const filename = `raw_gameplay_${timestamp}.mp4`;
const outputPath = path.join(OUTPUT_DIR, filename);

console.log(`🎮 TOM (SIMULATOR) : "Démarrage de la simulation gameplay"`);
console.log(`   📂 Fichier : ${filename}`);
console.log(`   ⏱️  Durée : ${DURATION_SEC}s`);
console.log(`   📁 Destination : ASSETS_RAW/`);
console.log(`\n⚠️  IMPORTANT : Tom enregistre la matière première BRUTE.`);
console.log(`   Pas de montage, pas de créativité. Juste le jeu réel.\n`);

// 1. Démarrer l'enregistrement (scrcpy)
const recorder = spawn('scrcpy', [
    '--record', outputPath,
    '--record-format', 'mp4',
    '--no-playback'  // Pas d'affichage pour ne pas ralentir
], { stdio: 'inherit' });

// Arrêt programmé
setTimeout(() => {
    console.log("\n⏱️  Temps écoulé. Arrêt de l'enregistrement.");
    recorder.kill('SIGINT'); // Ctrl+C propre pour finaliser le MP4
}, DURATION_SEC * 1000);

// 2. Mode de simulation
const mode = process.argv[3] || 'manual'; // manual | auto | scenario

switch(mode) {
    case 'auto':
        // Simulation automatique avec Monkey (pour tests rapides)
        setTimeout(() => {
            console.log("🤖 Mode AUTO : Simulation aléatoire (Monkey Test)");
            try {
                execSync(`adb shell monkey -p ${PACKAGE_NAME} -c android.intent.category.LAUNCHER 1`);
                const monkey = spawn('adb', [
                    'shell', 'monkey',
                    '-p', PACKAGE_NAME,
                    '--pct-touch', '90',
                    '--pct-motion', '10',
                    '--throttle', '500',
                    '100'
                ]);
                monkey.stdout.on('data', () => { }); // Silence
            } catch (e) {
                console.error("❌ Erreur ADB:", e.message);
            }
        }, 2000);
        break;

    case 'scenario':
        console.log("📋 Mode SCENARIO : Suivez le script demandé");
        console.log("   (À implémenter : lecture de SCENARIOS/LIBRARY.md)");
        break;

    case 'manual':
    default:
        console.log("🎮 Mode MANUEL : Jouez normalement, Tom enregistre tout.");
        console.log("   👉 Lancez une partie sur votre téléphone maintenant.");
        break;
}

recorder.on('close', (code) => {
    console.log(`\n✅ ENREGISTREMENT TERMINÉ`);
    console.log(`\n📦 LIVRABLE BRUT :`);
    console.log(`   📄 ${outputPath}`);
    console.log(`\n📋 PROCHAINES ÉTAPES (Reporters workflow) :`);
    console.log(`   1. Derush → Découper en segments (derush_clipper.js)`);
    console.log(`   2. Derush → Extraire des frames clés (derush_frames.js)`);
    console.log(`   3. Lucas → Valider la qualité (lucas_validator.js)`);
    console.log(`   4. Livraison → DATA_OUTBOX/TO_K_HIVE/`);
    console.log(`\n💡 Tom ne fait PAS de créativité. Juste capturer la réalité du jeu.`);
});

// Gestion des erreurs
recorder.on('error', (err) => {
    console.error('❌ ERREUR Tom (Simulator):', err.message);
    console.error('\n🔧 VÉRIFICATIONS :');
    console.error('   1. Téléphone branché en USB ?');
    console.error('   2. Débogage USB activé ?');
    console.error('   3. Scrcpy installé ? (https://github.com/Genymobile/scrcpy)');
    console.error('   4. ADB fonctionne ? (test: adb devices)');
});
