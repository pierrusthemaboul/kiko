import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace('const needsCreativeBoost = true;', 'const needsCreativeBoost = false;');
// On remplace aussi la deuxième occurrence si elle existe
content = content.replace('const needsCreativeBoost = styleResult.styleInfo.category !== \'cinematic\' || attemptNumber > 2;', 'const needsCreativeBoost = false;');

fs.writeFileSync(filePath, content);
console.log('✅ Creative boost disabled. Pure realism only.');
