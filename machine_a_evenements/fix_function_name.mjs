import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let content = fs.readFileSync(filePath, 'utf8');

// Correction du nom de la fonction
content = content.replace('callGeminiVision(prompt, imageUrl', 'callGeminiWithImage(prompt, imageUrl');

fs.writeFileSync(filePath, content);
console.log('✅ Function name callGeminiVision -> callGeminiWithImage fixed.');
