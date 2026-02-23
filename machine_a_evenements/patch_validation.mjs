import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let content = fs.readFileSync(filePath, 'utf8').split('\n');

const newPrompt = [
    '    const prompt = `Tu es un conservateur de musée extrêmement rigoureux. Ta réputation dépend de ta capacité à repérer le moindre détail erroné.',
    '',
    'Évalue cette image pour l\'événement "${event.titre}" (${event.year}).',
    '',
    'MÉTHODE DE VALIDATION (Chain-of-Verification) :',
    '1. INVENTAIRE : Liste chaque objet, vêtement et symbole (drapeaux) présent.',
    '2. DATATION : Pour chaque élément listé, indique sa période d\'usage courant.',
    '3. CONFRONTATION : Compare ces dates avec l\'année "${event.year}". Identifie toute contradiction.',
    '4. VERDICT : Si un seul anachronisme flagrant est détecté (objet moderne, drapeau incohérent, arme trop récente), le score doit être inférieur à 4/10.',
    '',
    'CRITÈRES DE REJET IMPITOYABLES :',
    '- DRAPEAUX : Rejeter si les drapeaux ne correspondent pas aux nations de l\'époque ou s\'ils sont postérieurs (ex: drapeau USA à 50 étoiles en 1805).',
    '- TECHNIQUE : Pas de tirs de canon sortant des mâts ou des voiles, pas d\'ailes, pas de magie.',
    '- ÉPOQUE : Différence >50 ans avec ${event.year}.',
    '- TEXTE : Pas de date "${event.year}" ou de titre écrit lisiblement.',
    '',
    'FORMAT JSON REQUIS :',
    '{',
    '  "inventory": ["liste"],',
    '  "analysis": { "objet": "Verdict historique" },',
    '  "score": 0 a 10,',
    '  "isValid": true/false,',
    '  "reason": "Justification concise",',
    '  "detailedAnalysis": {',
    '     "hasForbiddenText": false,',
    '     "hasWingsOrSupernatural": false,',
    '     "hasAnachronisms": false,',
    '     "anatomyRealistic": true,',
    '     "periodClothing": true,',
    '     "overallValid": true',
    '  }',
    '}`;'
];

// Remplacement des lignes 2783 à 2855 (1-indexed)
// En 0-indexed : index 2782 à 2854
content.splice(2782, 2855 - 2782 + 1, ...newPrompt);

fs.writeFileSync(filePath, content.join('\n'));
console.log('✅ sevent3.mjs updated with CoVe validation prompt.');
