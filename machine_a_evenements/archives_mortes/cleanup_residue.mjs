import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// On supprime les lignes 2815 à 2865 (qui contiennent l'ancien JSON et texte résiduel)
// Avant le "let result;" de la ligne 2866

const startDelete = 2814; // index 2814 est la ligne 2815
const endDelete = 2864;

lines.splice(startDelete, endDelete - startDelete + 1);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('✅ Residue text safely removed.');
