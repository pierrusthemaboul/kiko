import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let content = fs.readFileSync(filePath, 'utf8');

const anchor = 'prompt_flux: illustrationPrompt';
const replacement = 'prompt_flux: illustrationPrompt,\n        score_validation: validationData?.score || 0';

content = content.replace(anchor, replacement);

fs.writeFileSync(filePath, content);
console.log('✅ score_validation mapping added to finalEvent payload.');
