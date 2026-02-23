import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let content = fs.readFileSync(filePath, 'utf8');

const anchor = "add(O, ['low naval gun carriages', 'rammers and rammers', 'functional block and tackle', 'weathered hemp ropes', 'no statues', 'no winged figures', 'no modern flags', 'purely utilitarian warships']);";
const replacement = "add(O, ['low naval gun carriages', 'rammers and rammers', 'functional block and tackle', 'British White Ensign', 'French naval tricolore', 'absolutely no American flags', 'no US stars and stripes', 'European Napoleonic era only', 'no statues', 'no winged figures']);";

content = content.replace(anchor, replacement);

fs.writeFileSync(filePath, content);
console.log('✅ Specific naval flags forced. American flag explicitly banned.');
