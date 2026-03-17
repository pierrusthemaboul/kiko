import fs from 'fs';
import { spawn } from 'child_process';

const MANIFEST_PATH = 'c:/Users/Pierre/kiko/plan_emissions.json';

async function orchestrerUsine() {
    console.log("\n🏭 Démarrage de l'Orchestrateur Global ÉMISSIONS...");

    let plan;
    try {
        plan = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (e) {
        console.error("❌ Fichier plan_emissions.json introuvable ou mal formé.", e.message);
        return;
    }

    console.log(`📋 Plan d'émissions chargé: ${plan.length} émissions Wikipedia.\n`);

    let targetTotal = 0;
    plan.forEach(p => targetTotal += p.target);
    console.log(`📈 Estimation maximale théorique : ${targetTotal} nouvelles pépites.`);

    for (let i = 0; i < plan.length; i++) {
        const cible = plan[i];

        // --- BARRE DE PROGRESSION GLOBALE ---
        const percent = Math.round(((i) / plan.length) * 100);
        const filled = Math.round((percent / 100) * 30);
        const bar = '█'.repeat(filled) + '░'.repeat(30 - filled);

        console.log(`\n\n======================================================`);
        console.log(`🚦 PROGRESSION GLOBALE : [${bar}] ${percent}% (${i}/${plan.length} terminés)`);
        console.log(`======================================================`);
        console.log(`🎯 PAGE EN COURS : ${cible.page}`);
        console.log(`   └─ Thème : ${cible.theme} | Objectif : ${cible.target} pépites\n`);

        await new Promise((resolve) => {
            const process = spawn('node', [
                'c:/Users/Pierre/kiko/tmp/extracteur_wiki.mjs',
                '--page', cible.page,
                '--theme', cible.theme,
                '--target', cible.target.toString(),
                '--table', 'sas2'
            ], { stdio: 'inherit' });

            process.on('close', (code) => {
                console.log(`\n🏁 Moisson terminées pour la page ${cible.page}. Pause de 10s...`);
                setTimeout(resolve, 10000);
            });
        });
    }

    console.log(`\n\n======================================================`);
    console.log(`🚦 PROGRESSION GLOBALE : [██████████████████████████████] 100%`);
    console.log(`======================================================`);
    console.log("\n🍾 MISSION TERMINÉE ! Les agents peuvent aller se coucher. Le Sas est plein.");
}

orchestrerUsine();

