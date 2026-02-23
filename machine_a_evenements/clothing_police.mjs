import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let content = fs.readFileSync(filePath, 'utf8');

const anchor = '- TEXTE : Pas de date "${event.year}" ou de titre écrit lisiblement.';
const replacement = `- TEXTE : Pas de date "\${event.year}" ou de titre écrit lisiblement.
- VÊTEMENTS MODERNES : REJETER ABSOLUMENT si tu vois des chemises à boutons modernes, des poches de poitrine, des fermetures éclair, des baskets, des lunettes de soleil ou des coupes de cheveux contemporaines (dégradés à blanc, undercuts).`;

content = content.replace(anchor, replacement);

fs.writeFileSync(filePath, content);
console.log('✅ Button/Modern clothing police added to validation prompt.');
