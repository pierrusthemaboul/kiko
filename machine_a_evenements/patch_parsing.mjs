import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let content = fs.readFileSync(filePath, 'utf8').split('\n');

// On cherche où le JSON est parsé dans validateImageWithGemini
// Environ ligne 2855+ (après le prompt qu'on vient de changer)

// Le bloc à remplacer commence vers 2862 dans le nouveau fichier
// Il s'agit de la logique qui extrait les données de 'result'

const newParsingLogic = [
    '        const result = JSON.parse(jsonText);',
    '',
    '        // Adaptation pour le nouveau format CoVe',
    '        const da = result.detailedAnalysis || {};',
    '        const finalScore = result.score || da.score || 0;',
    '        const finalIsValid = result.isValid || (finalScore >= 7 && !da.hasAnachronisms);',
    '',
    '        console.log(`🤖 [DEBUG] Calcul validation finale: ${finalIsValid} (Score: ${finalScore}/10)`);'
];

// On va cibler le bloc de code qui traite 'result'
// On remplace les anciennes logs et calculs par quelque chose de plus simple qui utilise le score CoVe

content.splice(2867, 30, ...newParsingLogic);

// Note: J'ajuste les lignes pour supprimer l'ancienne logique complexe 
// qui cherchait hasAnachronisticBuildings, etc., car le CoVe centralise tout.

fs.writeFileSync(filePath, content.join('\n'));
console.log('✅ sevent3.mjs parsing logic simplified for CoVe.');
