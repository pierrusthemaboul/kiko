const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Chemins des scripts
const WORKSHOP_DIR = __dirname;
const KPI_SCRIPT = path.join(WORKSHOP_DIR, 'get_kpi_stats.js');
const EVENTS_SCRIPT = path.join(WORKSHOP_DIR, 'get_game_events.js');
const TRANSCRIPT_FILE = path.join(WORKSHOP_DIR, '../../DATA_INBOX/MEETING_TRANSCRIPT.md');

console.log("🔔 DING DONG ! La réunion au sommet commence.");
console.log("👥 Participants : Louis (N+2), Marc (N+1), Jade (N+1 - via rapport).");
console.log("----------------------------------------------------------------\n");

async function runScript(scriptPath, args = '') {
    return new Promise((resolve, reject) => {
        exec(`node "${scriptPath}" ${args}`, (error, stdout, stderr) => {
            if (error) {
                console.warn(`⚠️ Erreur mineure exécution ${path.basename(scriptPath)}: ${error.message}`);
                // On continue quand même pour la simu
                resolve("Données non disponibles (Erreur technique)");
            } else {
                resolve(stdout);
            }
        });
    });
}

async function startMeeting() {
    let transcript = "# 📝 COMPTE-RENDU : RÉUNION MATINALE\n\n";

    // 1. LOUIS PARLE
    console.log("👤 LOUIS (Marketing Director) prend la parole :");
    console.log("   \"Messieurs-dames, où en est le business ? Jade, le rapport !\"\n");
    transcript += "### 1. Ouverture (Louis)\nLouis demande l'état des lieux.\n\n";

    // 2. JADE (SCRIPT) UP
    console.log("⚙️  [Système] Exécution de get_kpi_stats.js...");
    // Note: get_kpi_stats might need .env or valid keys, we assume it has fallbacks or creates dummy data if fail
    // Pour la démo, on simule si le script plante (car pas de connexion Supabase active configurée dans ce shell)
    // Mais on essaie le vrai.
    const kpiOutput = await runScript(KPI_SCRIPT);
    console.log("   -> Jade dépose le dossier sur la table.\n");
    transcript += "### 2. Le Rapport de Jade\n```\n" + kpiOutput.substring(0, 300) + "...\n```\n\n";

    // 3. LOUIS ANALYSE
    console.log("👤 LOUIS :");
    console.log("   \"Bien. C'est stable. Marc, il nous faut un coup d'éclat pour demain.");
    console.log("   Ne m'invente rien. Trouve-moi un truc solide dans la base.\"\n");
    transcript += "### 3. La Commande (Louis)\nLouis valide les chiffres et ordonne une offensive basée sur le contenu réel.\n\n";

    // 4. MARC (SCRIPT) UP
    console.log("👤 MARC (Strategy Lead) :");
    console.log("   \"Compris Patron. Je lance le scanner d'événements...\"\n");
    console.log("⚙️  [Système] Exécution de get_game_events.js (Search: 'Guerre')...");

    // On cherche un mot clé épique pour la démo
    const eventsOutput = await runScript(EVENTS_SCRIPT, '--search "Guerre"');
    console.log("   -> Le catalogue affiche les résultats.\n");

    // Parsing sommaire pour simuler la réponse de Marc
    let chosenEvent = "Aucun événement marquant trouvé";
    if (eventsOutput.includes('##')) {
        const lines = eventsOutput.split('\n');
        const titleLine = lines.find(l => l.startsWith('##'));
        if (titleLine) chosenEvent = titleLine.replace('## 📜 ', '').trim();
    }
    transcript += "### 4. La Proposition de Marc\nRésultat de la recherche 'Guerre' :\n```\n" + eventsOutput.substring(0, 300) + "...\n```\n\n";

    // 5. CONCLUSION
    console.log("👤 MARC :");
    console.log(`   \"J'ai trouvé ça : '${chosenEvent}'. L'image est en base. C'est parfait pour TikTok.\"`);

    console.log("\n👤 LOUIS :");
    console.log("   \"Validé. Envoie le brief à Léa. Fin de réunion.\"");
    console.log("\n----------------------------------------------------------------");
    console.log("✅ Réunion terminée.");

    transcript += `### 5. Décision Finale\nOn part sur : **${chosenEvent}**.\nBrief envoyé à Léa (Créa).`;

    fs.writeFileSync(TRANSCRIPT_FILE, transcript);
    console.log(`\n📄 Compte-rendu sauvegardé : ${TRANSCRIPT_FILE}`);
}

startMeeting();
