import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/AGENTS/ARTISAN/agent.js';
let content = fs.readFileSync(filePath, 'utf8');

const anchor = 'historical accuracy, specific textures';
const additionalRules = `historical accuracy, specific textures. 
PHYSICS: Absolutely NO floating objects, NO magical lighting. Everything must follow gravity.
CLOTHING: Rejet strict des chemises à boutons modernes, des cols de bureau, des fermetures éclair. Utiliser : "rough wool tunics", "coarse linen breeches", "hemp wraps".
MECHANICS: Describe how things are moved (pulleys, ropes, wooden cranes).`;

content = content.replace(anchor, additionalRules);

fs.writeFileSync(filePath, content);
console.log('✅ ARTISAN mission updated with physics and hardcore period clothing rules.');
