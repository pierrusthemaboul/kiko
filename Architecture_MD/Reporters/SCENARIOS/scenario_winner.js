const { execSync } = require('child_process');
const path = require('path');

/**
 * SCENARIO WINNER - Partie gagnante (6/6 réussis)
 *
 * Ce script simule UNE VRAIE partie gagnante du mode Classique de Timalaus.
 * Il utilise ADB pour envoyer des commandes tactiles au téléphone.
 *
 * Prérequis :
 * - Téléphone branché en USB avec débogage activé
 * - Jeu Timalaus lancé sur l'écran d'accueil du mode Classique
 * - Tom (simulator) doit être en train d'enregistrer (tom_simulator.js)
 */

const PACKAGE_NAME = 'com.pierretulle.juno2';
const DELAY_BETWEEN_ACTIONS = 1500; // ms entre chaque action

console.log('🎮 SCENARIO WINNER : Simulation d\'une partie GAGNANTE');
console.log('   Mode : Classique (6 événements à réussir)');
console.log('   Résultat attendu : Victoire\n');

// Coordonnées des boutons (à ajuster selon votre écran)
// Format : [x, y] en pixels
const BUTTON_START = [540, 1800];     // Bouton "Jouer" / "Commencer"
const BUTTON_AVANT = [270, 1600];     // Bouton "AVANT"
const BUTTON_APRES = [810, 1600];     // Bouton "APRÈS"

// Vérifier qu'ADB fonctionne
try {
    execSync('adb devices', { stdio: 'ignore' });
} catch (e) {
    console.error('❌ ERREUR : ADB non disponible');
    process.exit(1);
}

console.log('⏳ Démarrage du scénario dans 3 secondes...');
console.log('   Assurez-vous que le jeu est sur l\'écran d\'accueil du mode Classique\n');

setTimeout(() => {
    runScenario();
}, 3000);

async function runScenario() {
    try {
        // Étape 1 : Lancer l'activité principale (si pas déjà ouverte)
        console.log('1️⃣  Lancement de Timalaus...');
        execSync(`adb shell am start -n ${PACKAGE_NAME}/.MainActivity`, { stdio: 'ignore' });
        await sleep(2000);

        // Étape 2 : Cliquer sur "Commencer" / "Jouer"
        console.log('2️⃣  Clic sur "Commencer"...');
        tap(BUTTON_START[0], BUTTON_START[1]);
        await sleep(DELAY_BETWEEN_ACTIONS);

        // Étape 3 : Jouer 6 tours gagnants
        console.log('\n🎯 Début de la partie (6 événements) :\n');

        // Note : Ce script suppose une séquence connue d'événements.
        // Dans la vraie vie, il faudrait :
        // - Soit avoir accès à l'ordre des événements via l'API
        // - Soit utiliser OCR pour lire les dates à l'écran
        // - Soit jouer en "aveugle" avec une stratégie probabiliste

        // Pour cet exemple, on simule 6 bons choix
        const choices = [
            { num: 1, button: 'APRES', reason: '(exemple: événement récent)' },
            { num: 2, button: 'AVANT', reason: '(exemple: événement ancien)' },
            { num: 3, button: 'APRES', reason: '(exemple: événement récent)' },
            { num: 4, button: 'AVANT', reason: '(exemple: événement ancien)' },
            { num: 5, button: 'APRES', reason: '(exemple: événement récent)' },
            { num: 6, button: 'AVANT', reason: '(exemple: événement ancien)' }
        ];

        for (const choice of choices) {
            console.log(`   Événement ${choice.num}/6 : Choix "${choice.button}" ${choice.reason}`);

            if (choice.button === 'AVANT') {
                tap(BUTTON_AVANT[0], BUTTON_AVANT[1]);
            } else {
                tap(BUTTON_APRES[0], BUTTON_APRES[1]);
            }

            // Attendre l'animation de retournement + montée de la carte
            await sleep(DELAY_BETWEEN_ACTIONS);
        }

        console.log('\n✅ PARTIE TERMINÉE - Victoire simulée !');
        console.log('   Tom a enregistré cette partie gagnante.\n');
        console.log('📦 PROCHAINES ÉTAPES :');
        console.log('   1. Arrêter l\'enregistrement de Tom');
        console.log('   2. Découper la vidéo avec Derush');
        console.log('   3. Extraire des frames clés');
        console.log('   4. Valider avec Lucas');
        console.log('   5. Livrer à K-Hive\n');

    } catch (e) {
        console.error('❌ ERREUR durant le scénario :', e.message);
        console.error('\n🔧 SOLUTIONS :');
        console.error('   - Vérifiez les coordonnées des boutons (à calibrer selon votre écran)');
        console.error('   - Assurez-vous que le jeu est bien lancé');
        console.error('   - Testez manuellement les commandes : adb shell input tap 540 1800');
    }
}

function tap(x, y) {
    execSync(`adb shell input tap ${x} ${y}`, { stdio: 'ignore' });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Note : Pour un scénario VRAIMENT fiable, il faudrait :
// 1. Calibrage automatique des boutons (détection via screenshots)
// 2. Lecture OCR des dates à l'écran pour faire les bons choix
// 3. Gestion d'erreur si un événement inattendu apparaît
// 4. Support de plusieurs résolutions d'écran
//
// Pour l'instant, ce script est un POC (Proof of Concept).
// Il montre la logique, mais nécessitera des ajustements selon votre device.
