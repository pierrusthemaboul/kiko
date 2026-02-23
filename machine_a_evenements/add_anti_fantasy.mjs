import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let content = fs.readFileSync(filePath, 'utf8');

const anchor = '3. **HISTORICAL ACCURACY**: Ensure the scene reflects the visual reality of the time, not a modernized or cinematic version.';
const replacement = `3. **ANTI-FANTASY**: Strictly avoid any statues, mythological figures, wings, angels, or supernatural elements. Everything must be functional, utilitarian, and historically documented for the year.
4. **NO ARTISTIC ORNAMENTATION**: No floating objects, no cinematic fireballs, no impossible physics.`;

content = content.replace(anchor, replacement);

fs.writeFileSync(filePath, content);
console.log('✅ Anti-fantasy constraints added to sevent3.mjs.');
