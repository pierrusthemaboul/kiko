import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let content = fs.readFileSync(filePath, 'utf8');

const anchor = "add(O, ['low naval gun carriages', 'rammers and rammers', 'naval ensigns', 'British Union Jack', 'French Tricolore', 'Spanish flag', 'no metal helmets', 'no land wheels']);";
const replacement = "add(O, ['low naval gun carriages', 'rammers and rammers', 'functional block and tackle', 'weathered hemp ropes', 'no statues', 'no winged figures', 'no modern flags', 'purely utilitarian warships']);";

content = content.replace(anchor, replacement);

fs.writeFileSync(filePath, content);
console.log('✅ Naval constraints tightened: No statues, no wings.');
