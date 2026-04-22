
import fs from 'fs';

// This is a scratch script to analyze the medieval events data
const evenements = JSON.parse(fs.readFileSync('C:/Users/Pierre/.gemini/antigravity/brain/a519b888-e0d1-4063-aa89-f995f4231dad/.system_generated/steps/16/output.txt', 'utf8')).result;
const sas = JSON.parse(fs.readFileSync('C:/Users/Pierre/.gemini/antigravity/brain/a519b888-e0d1-4063-aa89-f995f4231dad/.system_generated/steps/28/output.txt', 'utf8')).result;

// Clean and parse
const parseJsonFromUntrusted = (str) => {
    const start = str.indexOf('[');
    const end = str.lastIndexOf(']') + 1;
    return JSON.parse(str.substring(start, end));
};

const evData = parseJsonFromUntrusted(evenements);
const sasData = parseJsonFromUntrusted(sas);

// 1. Gaps (Black Holes)
const centuries = {};
for (let year = 500; year <= 1450; year += 50) {
    centuries[year] = 0;
}

evData.forEach(ev => {
    const year = parseInt(ev.date.substring(0, 4));
    const bracket = Math.floor(year / 50) * 50;
    if (centuries[bracket] !== undefined) {
        centuries[bracket]++;
    }
});

console.log('--- Gaps Analysis (Events per 50 years) ---');
Object.entries(centuries).forEach(([year, count]) => {
    console.log(`${year}-${parseInt(year)+49}: ${count} events`);
});

// 2. Thematic Analysis
const themes = {
    'Guerre/Politique': 0,
    'Religion': 0,
    'Art/Culture': 0,
    'Sciences/Inventions': 0,
    'Other': 0
};

evData.forEach(ev => {
    const types = ev.types_evenement || [];
    let categorized = false;
    if (types.some(t => t.includes('Guerre') || t.includes('Politique') || t.includes('Histoire'))) {
        themes['Guerre/Politique']++;
        categorized = true;
    }
    if (types.some(t => t.includes('Religion') || t.includes('Spiritualité'))) {
        themes['Religion']++;
        categorized = true;
    }
    if (types.some(t => t.includes('Art') || t.includes('Culture') || t.includes('Architecture') || t.includes('Littérature'))) {
        themes['Art/Culture']++;
        categorized = true;
    }
    if (types.some(t => t.includes('Science') || t.includes('Technologie') || t.includes('Découvertes') || t.includes('Exploration') || t.includes('Inventions'))) {
        themes['Sciences/Inventions']++;
        categorized = true;
    }
    if (!categorized) themes['Other']++;
});

console.log('\n--- Thematic Analysis ---');
console.log(JSON.stringify(themes, null, 2));

// 3. Quarantine Audit
console.log('\n--- Quarantine Audit (Potential Stars with 0 notoriety in SAS or Antichambre) ---');
const quarantineStars = sasData.filter(s => s.notoriete_fr === 0);
quarantineStars.forEach(s => {
    console.log(`[SAS] ${s.titre} (${s.date}) - Status: ${s.statut}`);
});

// 4. Top 50 Evidence (Drafting)
console.log('\n--- Top 50 Evidence Candidates (Sorted by current notoriety) ---');
evData.slice(0, 50).forEach(ev => {
    console.log(`${ev.titre} (Not: ${ev.notoriete_fr})`);
});
