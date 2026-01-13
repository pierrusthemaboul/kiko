const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const DURATION_SEC = 35;
const OUTPUT_DIR = path.join(__dirname, '../../Reporters/ASSETS_RAW');
const PACKAGE_NAME = 'com.pierretulle.juno2';

// Coordonnées cibles (Basées sur un écran 1080x1920)
// On pourra les ajuster si besoin
const COORDS = {
    MENU_CLASSIQUE: "540 1200",
    BTN_AVANT: "250 1700",
    BTN_APRES: "830 1700"
};

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const filename = `gameplay_pro_${Date.now()}.mp4`;
const outputPath = path.join(OUTPUT_DIR, filename);

console.log(`🎬 LUCAS V2 (Pro Actor) : "Moteur, Action !"`);

// 1. Enregistrement scrcpy
const recorder = spawn('scrcpy', [
    '--record', outputPath,
    '--record-format', 'mp4',
    '--no-playback'
], { stdio: 'inherit' });

// 2. Scénario de Gameplay
async function playScenario() {
    console.log("🚀 Lancement de l'app...");
    execSync(`adb shell monkey -p ${PACKAGE_NAME} -c android.intent.category.LAUNCHER 1`);

    await sleep(7000); // Attente chargement Splash + Menu

    console.log("🎯 Sélection Mode Classique...");
    execSync(`adb shell input tap ${COORDS.MENU_CLASSIQUE}`);

    await sleep(3000); // Transition vers le jeu

    // Simuler 5 tours de jeu
    const moves = ["AVANT", "APRES", "APRES", "AVANT", "APRES"];

    for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        console.log(`🤔 Réflexion Tour ${i + 1}...`);
        await sleep(2500); // Temps de réflexion simulé

        console.log(`✅ Joueur clique sur : ${move}`);
        const coord = move === "AVANT" ? COORDS.BTN_AVANT : COORDS.BTN_APRES;
        execSync(`adb shell input tap ${coord}`);

        await sleep(2000); // Attente animation flip + transition
    }

    console.log("🏁 Fin du scénario. Capture des résultats...");
    await sleep(4000);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Lancer le scénario
playScenario().catch(err => console.error("❌ Erreur scénario :", err));

// Arrêt automatique du recorder après la durée
setTimeout(() => {
    console.log("⏱️ Cut ! Enregistrement terminé.");
    recorder.kill('SIGINT');
}, DURATION_SEC * 1000);

recorder.on('close', (code) => {
    console.log(`\n✅ Vidéo pro disponible : ${outputPath}`);
});
