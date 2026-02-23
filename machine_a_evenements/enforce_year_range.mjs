import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let content = fs.readFileSync(filePath, 'utf8');

// Modification de la fonction de finalisation pour rejeter les années invalides/BC
const anchor = '    const year = Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : 1;';
const replacement = `    if (!Number.isFinite(parsedYear) || parsedYear <= 0) {
        throw new Error(\`ANNÉE REFUSÉE: "\${enrichedEvent.year}" invalide ou BC. Le pipeline n'accepte que AD (1-2025).\`);
    }
    const year = parsedYear;`;

content = content.replace(anchor, replacement);

fs.writeFileSync(filePath, content);
console.log('✅ Hard year range enforcement added. BC and invalid years will now throw an error.');
