const { execSync } = require('child_process');
const path = require('path');

/**
 * SCENARIO LOSER - Partie perdante (erreur volontaire)
 *
 * Ce script simule UNE VRAIE partie perdante du mode Classique de Timalaus.
 * Il joue correctement plusieurs tours, puis fait une erreur volontaire.
 *
 * Prérequis :
 * - Téléphone branché en USB avec débogage activé
 * - Jeu Timalaus lancé sur l'écran d'accueil du mode Classique
 * - Tom (simulator) doit être en train d'enregistrer (tom_simulator.js)
 */

const PACKAGE_NAME = 'com.pierretulle.juno2';
const DELAY_BETWEEN_ACTIONS = 1500; // ms entre chaque action
const DELAY_BEFORE_FAIL = 2000;     // Hésitation avant l'erreur (pour effet dramatique)

console.log('🎮 SCENARIO LOSER : Simulation d\'une partie PERDANTE');
console.log('   Mode : Classique');
console.log('   Résultat attendu : Défaite (erreur volontaire au tour X)\n');

// Coordonnées des boutons (à ajuster selon votre écran)
const BUTTON_START = [540, 1800];
const BUTTON_AVANT = [270, 1600];
const BUTTON_APRES = [810, 1600];

// Configuration du scénario
const SUCCESS_ROUNDS = parseInt(process.argv[2] || 3); // Nombre de tours réussis avant l'erreur
const FAIL_TYPE = process.argv[3] || 'hesitation';      // 'instant', 'hesitation', 'wrong-choice'

console.log(`📋 Configuration :`);
console.log(`   Tours réussis avant erreur : ${SUCCESS_ROUNDS}`);
console.log(`   Type d'erreur : ${FAIL_TYPE}`);

// Vérifier ADB
try {
    execSync('adb devices', { stdio: 'ignore' });
} catch (e) {
    console.error('❌ ERREUR : ADB non disponible');
    process.exit(1);
}

console.log('\n⏳ Démarrage du scénario dans 3 secondes...');
console.log('   Assurez-vous que le jeu est sur l\'écran d\'accueil\n');

setTimeout(() => {
    runScenario();
}, 3000);

async function runScenario() {
    try {
        // Étape 1 : Lancer le jeu
        console.log('1️⃣  Lancement de Timalaus...');
        execSync(`adb shell am start -n ${PACKAGE_NAME}/.MainActivity`, { stdio: 'ignore' });
        await sleep(2000);

        // Étape 2 : Commencer
        console.log('2️⃣  Clic sur "Commencer"...');
        tap(BUTTON_START[0], BUTTON_START[1]);
        await sleep(DELAY_BETWEEN_ACTIONS);

        // Étape 3 : Jouer les tours réussis
        console.log(`\n🎯 Partie en cours (${SUCCESS_ROUNDS} tours corrects, puis erreur) :\n`);

        for (let i = 1; i <= SUCCESS_ROUNDS; i++) {
            console.log(`   ✅ Tour ${i}/${SUCCESS_ROUNDS} : Choix CORRECT`);

            // Alterner AVANT/APRES (simplification, dans la vraie vie il faut lire l'écran)
            const button = i % 2 === 0 ? BUTTON_APRES : BUTTON_AVANT;
            tap(button[0], button[1]);

            await sleep(DELAY_BETWEEN_ACTIONS);
        }

        // Étape 4 : Faire l'erreur (moment clé pour le marketing!)
        console.log(`\n💥 Tour ${SUCCESS_ROUNDS + 1} : ERREUR VOLONTAIRE\n`);

        switch(FAIL_TYPE) {
            case 'hesitation':
                // Simuler une hésitation (pour montrer la tension)
                console.log('   🤔 Hésitation... (survol AVANT)');
                // Note: ADB ne peut pas "survoler", on simule avec un délai
                await sleep(DELAY_BEFORE_FAIL);

                console.log('   🤔 Non, plutôt APRES...');
                await sleep(1000);

                console.log('   ❌ Mauvais choix final : APRES (c\'était AVANT)');
                tap(BUTTON_APRES[0], BUTTON_APRES[1]);
                break;

            case 'instant':
                // Erreur instantanée (clic trop rapide)
                console.log('   ⚡ Clic rapide sans réfléchir...');
                await sleep(300);

                console.log('   ❌ Erreur : AVANT (c\'était APRES)');
                tap(BUTTON_AVANT[0], BUTTON_AVANT[1]);
                break;

            case 'wrong-choice':
                // Erreur "simple" après réflexion
                console.log('   🤔 Réflexion...');
                await sleep(DELAY_BEFORE_FAIL);

                console.log('   ❌ Mauvais choix : AVANT (c\'était APRES)');
                tap(BUTTON_AVANT[0], BUTTON_AVANT[1]);
                break;
        }

        // Attendre l'écran de fin
        await sleep(2000);

        console.log('\n💀 PARTIE PERDUE - Défaite simulée !');
        console.log('   Tom a enregistré cette partie perdante.\n');
        console.log('📦 MATIÈRE PREMIÈRE CAPTURÉE :');
        console.log('   - Série de succès (tension montante)');
        console.log('   - Moment d\'hésitation (engagement émotionnel)');
        console.log('   - Erreur finale (frustration/défi)');
        console.log('   - Écran de Game Over\n');
        console.log('💡 K-Hive pourra utiliser ces moments pour :');
        console.log('   - Créer des hooks "C\'est plus dur que tu crois"');
        console.log('   - Montrer le challenge du jeu');
        console.log('   - Générer de l\'empathie/engagement\n');

    } catch (e) {
        console.error('❌ ERREUR durant le scénario :', e.message);
    }
}

function tap(x, y) {
    execSync(`adb shell input tap ${x} ${y}`, { stdio: 'ignore' });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage avancé :
// node scenario_loser.js 5 hesitation  → 5 tours corrects + hésitation
// node scenario_loser.js 2 instant     → 2 tours corrects + erreur rapide
// node scenario_loser.js 10 wrong-choice → 10 tours corrects + mauvais choix
