/**
 * TEST DU DÉTECTEUR DE DOUBLONS
 * Valide que le pré-filtre fonctionne correctement avant de lancer SENTINEL
 */

import {
    normalizeTitle,
    levenshteinDistance,
    calculateSimilarity,
    extractKeywords,
    isExactDuplicate,
    selectBestCandidates
} from './duplicate_detector.mjs';

console.log("=== TEST DU DÉTECTEUR DE DOUBLONS ===\n");

// Test 1 : Normalisation
console.log("1️⃣ Test de normalisation");
const testTitles = [
    "Prise de la Bastille",
    "PRISE DE LA BASTILLE",
    "Prise de la Bastille!",
    "Prise  de   la  Bastille",
    "Prisé dé là Bastillé"
];

testTitles.forEach(titre => {
    console.log(`   "${titre}" → "${normalizeTitle(titre)}"`);
});

// Test 2 : Distance de Levenshtein
console.log("\n2️⃣ Test de distance de Levenshtein");
const pairs = [
    ["Prise de la Bastille", "Prise de la Bastille"],
    ["Prise de la Bastille", "Chute de la Bastille"],
    ["Bataille de Poitiers", "Victoire de Charles Martel"],
    ["Couronnement de Charlemagne", "Charlemagne sacré empereur"]
];

pairs.forEach(([str1, str2]) => {
    const distance = levenshteinDistance(normalizeTitle(str1), normalizeTitle(str2));
    const similarity = calculateSimilarity(normalizeTitle(str1), normalizeTitle(str2));
    console.log(`   "${str1}" vs "${str2}"`);
    console.log(`      Distance: ${distance}, Similarité: ${(similarity * 100).toFixed(0)}%`);
});

// Test 3 : Extraction de mots-clés
console.log("\n3️⃣ Test d'extraction de mots-clés");
const texts = [
    "Prise de la Bastille",
    "Bataille de Poitiers",
    "Couronnement de Charlemagne empereur d'Occident"
];

texts.forEach(text => {
    const keywords = extractKeywords(normalizeTitle(text));
    console.log(`   "${text}" → [${keywords.join(', ')}]`);
});

// Test 4 : Détection de doublons exacts
console.log("\n4️⃣ Test de détection de doublons exacts");

const testCases = [
    {
        name: "Doublon exact",
        event: { titre: "Prise de la Bastille", year: 1789 },
        candidates: [{ titre: "Prise de la Bastille", year: 1789 }],
        shouldDetect: true
    },
    {
        name: "Doublon avec ponctuation différente",
        event: { titre: "Prise de la Bastille", year: 1789 },
        candidates: [{ titre: "Prise de la Bastille!", year: 1789 }],
        shouldDetect: true
    },
    {
        name: "Doublon reformulé (similarité haute)",
        event: { titre: "Couronnement de Charlemagne", year: 800 },
        candidates: [{ titre: "Charlemagne est sacré empereur d'Occident", year: 800 }],
        shouldDetect: false // Le pré-filtre ne devrait pas le détecter (c'est le rôle de l'IA)
    },
    {
        name: "Événement distinct",
        event: { titre: "Bataille d'Alésia", year: -52 },
        candidates: [{ titre: "Prise de la Bastille", year: 1789 }],
        shouldDetect: false
    },
    {
        name: "Titre similaire + même année",
        event: { titre: "Chute de la Bastille", year: 1789 },
        candidates: [{ titre: "Prise de la Bastille", year: 1789 }],
        shouldDetect: true
    },
    {
        name: "Titre identique + année différente (±1 an)",
        event: { titre: "Prise de la Bastille", year: 1790 },
        candidates: [{ titre: "Prise de la Bastille", year: 1789 }],
        shouldDetect: true // DOUBLON car titre identique + seulement 1 an d'écart (probablement erreur de date)
    },
    {
        name: "Mots-clés communs + même année",
        event: { titre: "Siège d'Orléans par Jeanne d'Arc", year: 1429 },
        candidates: [{ titre: "Victoire de Jeanne d'Arc au siège d'Orléans", year: 1429 }],
        shouldDetect: true
    }
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
    const result = isExactDuplicate(test.event, test.candidates);
    const detected = result.isDuplicate;
    const success = detected === test.shouldDetect;

    if (success) {
        console.log(`   ✅ ${test.name}`);
        if (detected) {
            console.log(`      Raison: ${result.reason}`);
            console.log(`      Stratégie: ${result.strategy}`);
        }
        passed++;
    } else {
        console.log(`   ❌ ${test.name}`);
        console.log(`      Attendu: ${test.shouldDetect ? 'DOUBLON' : 'UNIQUE'}, Obtenu: ${detected ? 'DOUBLON' : 'UNIQUE'}`);
        if (detected) {
            console.log(`      Raison: ${result.reason}`);
        }
        failed++;
    }
});

console.log(`\n📊 Résultats: ${passed}/${testCases.length} tests réussis`);
if (failed > 0) {
    console.log(`⚠️  ${failed} test(s) échoué(s)`);
}

// Test 5 : Sélection des meilleurs candidats
console.log("\n5️⃣ Test de sélection des meilleurs candidats");
const event = { titre: "Prise de la Bastille", year: 1789 };
const manyCandidates = [
    { titre: "Prise de la Bastille", year: 1789 },
    { titre: "Exécution de Louis XVI", year: 1793 },
    { titre: "Convocation des États généraux", year: 1788 },
    { titre: "Bataille d'Austerlitz", year: 1805 },
    { titre: "Révolution française commence", year: 1789 },
    { titre: "Déclaration des droits de l'homme", year: 1789 },
    { titre: "Première ascension du Mont-Blanc", year: 1786 },
    { titre: "Mozart meurt", year: 1791 }
];

const best = selectBestCandidates(event, manyCandidates, 5);
console.log(`   Événement: "${event.titre}" (${event.year})`);
console.log(`   ${manyCandidates.length} candidats → ${best.length} meilleurs sélectionnés:`);
best.forEach((c, i) => {
    console.log(`      ${i + 1}. "${c.titre}" (${c.year})`);
});

console.log("\n✅ Tests terminés");
