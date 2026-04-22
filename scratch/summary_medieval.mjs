
import fs from 'fs';

const evenements = JSON.parse(fs.readFileSync('C:/Users/Pierre/.gemini/antigravity/brain/a519b888-e0d1-4063-aa89-f995f4231dad/.system_generated/steps/16/output.txt', 'utf8')).result;
const parseJsonFromUntrusted = (str) => {
    const start = str.indexOf('[');
    const end = str.lastIndexOf(']') + 1;
    return JSON.parse(str.substring(start, end));
};
const evData = parseJsonFromUntrusted(evenements);

const centuries = {};
for (let year = 500; year <= 1450; year += 50) { centuries[year] = 0; }
evData.forEach(ev => {
    const year = parseInt(ev.date.substring(0, 4));
    const bracket = Math.floor(year / 50) * 50;
    if (centuries[bracket] !== undefined) { centuries[bracket]++; }
});

console.log('--- Gaps Analysis ---');
Object.entries(centuries).forEach(([year, count]) => {
    console.log(`${year}-${parseInt(year)+49}: ${count}`);
});

const themes = { 'Guerre/Politique': 0, 'Religion': 0, 'Art/Culture': 0, 'Sciences/Inventions': 0, 'Other': 0 };
evData.forEach(ev => {
    const types = ev.types_evenement || [];
    let cat = false;
    if (types.some(t => t.includes('Guerre') || t.includes('Politique'))) { themes['Guerre/Politique']++; cat = true; }
    if (types.some(t => t.includes('Religion'))) { themes['Religion']++; cat = true; }
    if (types.some(t => t.includes('Art') || t.includes('Culture') || t.includes('Architecture'))) { themes['Art/Culture']++; cat = true; }
    if (types.some(t => t.includes('Science') || t.includes('Invention') || t.includes('Technologie'))) { themes['Sciences/Inventions']++; cat = true; }
    if (!cat) themes['Other']++;
});
console.log('\n--- Themes ---');
console.log(JSON.stringify(themes, null, 2));
