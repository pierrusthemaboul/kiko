import fs from 'fs';

const events = JSON.parse(fs.readFileSync('all_titles.json', 'utf8'));

// Dictionnaire plus large de mots anglais
const englishWords = new Set(['the', 'and', 'of', 'with', 'for', 'at', 'from', 'was', 'were', 'is', 'are', 'in', 'on', 'by', 'an', 'a', 'to', 'protests', 'reform', 'election', 'mobilization', 'eruption', 'annexation', 'begins', 'ends', 'completed', 'completion', 'against', 'between', 'war', 'trial', 'rights', 'law', 'renovation', 'founding', 'foundation', 'discovery', 'birth', 'death']);
const frenchWords = new Set(['le', 'la', 'les', 'des', 'du', 'aux', 'est', 'sont', 'était', 'étaient', 'avec', 'pour', 'dans', 'sur', 'par', 'en', 'et', 'au', 'une', 'un']);

const results = [];

for (const e of events) {
    const title = e.titre;
    const words = title.toLowerCase().split(/[\s',.!\?\(\)\[\]]+/).filter(w => w.length > 0);

    let enCount = 0;
    let frCount = 0;

    for (const w of words) {
        if (englishWords.has(w)) enCount++;
        if (frenchWords.has(w)) frCount++;
    }

    // Un titre est suspect s'il a plus de mots anglais que de mots français
    // ou s'il contient des marqueurs très forts comme "the"
    const hasThe = words.includes('the');
    const hasAnd = words.includes('and');
    const hasOf = words.includes('of');
    const hasIn = words.includes('in') && !words.includes('fine') && !words.includes('extremis');
    const isError = title.toLowerCase().includes('no historical title');

    if (isError || hasThe || hasAnd || hasOf || (enCount > frCount && words.length > 1) || (enCount > 0 && frCount === 0 && words.length >= 2)) {
        results.push(e);
    }
}

// Nettoyage manuel des faux positifs évidents (titres d'œuvres dans un contexte français)
const filtered = results.filter(e => {
    const t = e.titre.toLowerCase();

    // Cas à IGNORER (car déjà en français ou acceptable car titre d'œuvre étrange)
    if (t.includes('panthéon')) return false;
    if (t.includes('léon')) return false;
    if (t.includes('napoléon')) return false;
    if (t.includes('sacré empereur')) return false;
    if (t.includes('décret papal')) return false;
    if (t.includes('guerre de')) return false;
    if (t.includes('révolte de')) return false;
    if (t.includes('bataille de')) return false;
    if (t.includes('traité de')) return false;
    if (t.includes('fondation de')) return false;
    if (t.includes('création de')) return false;
    if (t.includes('sortie de')) return false;
    if (t.includes('publication de')) return false;
    if (t.includes('mort de')) return false;
    if (t.includes('naissance de')) return false;
    if (t.includes('assassinat de')) return false;

    return true;
});

console.log(JSON.stringify(filtered, null, 2));
