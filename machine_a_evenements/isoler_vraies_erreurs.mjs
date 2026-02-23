import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function genererVraiesErreurs() {
    const inputPath = path.join(__dirname, '93_dates_condamnees.json');
    if (!fs.existsSync(inputPath)) {
        console.error("❌ Fichier introuvable.");
        return;
    }

    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // Filtre uniquement les événements où l'année (les 4 premiers caractères) diffère
    const vraiesErreurs = data.filter(item => {
        const wrongYear = item['📅 DATE FAUSSE'].substring(0, 4);
        const suggestedYear = item['💡 CORRECTION SUGGÉRÉE'].substring(0, 4);
        return wrongYear !== suggestedYear;
    });

    const outputPath = path.join(__dirname, 'vraies_erreurs_annees.json');
    fs.writeFileSync(outputPath, JSON.stringify(vraiesErreurs, null, 2));

    console.log(`✅ ${vraiesErreurs.length} VRAIES erreurs d'années extraites dans vraies_erreurs_annees.json !`);
}

genererVraiesErreurs();
