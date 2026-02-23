import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let content = fs.readFileSync(filePath, 'utf8');

// 1. On durcit le style historical_realism
const oldStyle = "enhancers: ['high-fidelity photography', 'ultra-sharp focus', 'natural lighting', 'historical cinematic framing'],";
const newStyle = "enhancers: ['high-fidelity documentary photography', 'ultra-sharp forensic focus', 'natural daylighting', 'historical accuracy'],";

content = content.replace(oldStyle, newStyle);

// 2. On change la composition pour insister sur la physique
const oldComp = "composition: 'wide-angle historical panorama, deep depth of field, authentic period textures'";
const newComp = "composition: 'wide-angle documentary perspective, deep depth of field, authentic period textures, strict adherence to gravity and physics, no floating elements'";

content = content.replace(oldComp, newComp);

fs.writeFileSync(filePath, content);
console.log('✅ Style historical_realism purged of "cinematic" and physics-hardened.');
