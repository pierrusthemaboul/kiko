const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const DURATION_SEC = 30; // Durée clip
const OUTPUT_DIR = path.join(__dirname, '../../DATA_INBOX/INPUTS');
const PACKAGE_NAME = 'com.pierretulle.juno2';

// Créer dossier si besoin
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const filename = `gameplay_${Date.now()}.mp4`;
const outputPath = path.join(OUTPUT_DIR, filename);

console.log(`🎥 CAMERAMAN BOT : "Silence plateau, on tourne !"`);
console.log(`   - Fichier : ${filename}`);
console.log(`   - Durée : ${DURATION_SEC}s`);

// 1. Démarrer l'enregistrement (scrcpy)
// Note: v1.21 ne supporte pas --time-limit, on gère le kill manuel
const recorder = spawn('scrcpy', [
    '--record', outputPath,
    '--record-format', 'mp4',
    '--no-playback'
], { stdio: 'inherit' });

// Arrêt programmé
setTimeout(() => {
    console.log("⏱️ Temps écoulé. Coupure caméra.");
    recorder.kill('SIGINT'); // Envoie Ctrl+C propre pour finaliser le fichier MP4
}, DURATION_SEC * 1000);

// 2. Démarrer l'acteur (Optionnel : --auto)
const useAutoActor = process.argv.includes('--auto');

if (useAutoActor) {
    // Attend un peu que scrcpy se lance
    setTimeout(() => {
        console.log("🎮 ACTOR BOT (Monkey) : \"Je prends le relais !\"");
        try {
            // Lancer l'app explicitement
            execSync(`adb shell monkey -p ${PACKAGE_NAME} -c android.intent.category.LAUNCHER 1`);

            // Simuler des clics (Monkey)
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
            console.error("❌ Erreur Actor (ADB):", e.message);
        }
    }, 2000);
} else {
    console.log("🎮 A VOUS DE JOUER ! (Mode Manuel)");
    console.log("   Lancez une partie sur votre téléphone, je filme.");
}

recorder.on('close', (code) => {
    console.log(`\n✅ COUPÉ !`);
    console.log(`📂 Rush disponible : ${outputPath}`);
    console.log(`👉 Idée : Passez ce fichier à Léa via 'visual_bot.js' (ou futur video_bot) pour montage.`);
});
