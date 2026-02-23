import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isolerCondamnes() {
    const inputPath = path.join(__dirname, 'jugement_final.json');
    if (!fs.existsSync(inputPath)) {
        console.error("❌ Le fichier jugement_final.json est introuvable.");
        return;
    }

    const jugements = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // Filtrer uniquement les événements condamnés (Action: CORRIGER)
    const condamnes = jugements.filter(j => j.juge_action === "CORRIGER");

    // Trier par score de culpabilité décroissant (les 100/100 en premier)
    condamnes.sort((a, b) => b.juge_score - a.juge_score);

    // Formater la sortie pour que ce soit très lisible pour l'humain
    const rapportHumain = condamnes.map(c => ({
        id: c.id,
        "❗️ TITRE": c.titre,
        "📅 DATE FAUSSE": c.date_actuelle,
        "💡 CORRECTION SUGGÉRÉE": c.date_suggeree,
        "⚖️ RAPPEL DU JUGE": c.juge_explication
    }));

    const outputPath = path.join(__dirname, '93_dates_condamnees.json');
    fs.writeFileSync(outputPath, JSON.stringify(rapportHumain, null, 2));

    console.log(`\n✅ Isolation réussie !`);
    console.log(`📂 J'ai extrait les ${condamnes.length} événements condamnés dans le fichier : 93_dates_condamnees.json`);
    console.log(`   Tu peux l'ouvrir dans ton éditeur pour les analyser manuellement.`);
}

isolerCondamnes();
