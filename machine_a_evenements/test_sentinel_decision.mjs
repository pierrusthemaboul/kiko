import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

// Test avec le cas de "Prise de la Bastille"
async function testSentinelDecision() {
    const event = { titre: "Prise de la Bastille", year: 1789 };
    const candidates = [
        { titre: "Prise de la Bastille", year: 1789 },  // LE DOUBLON EXACT !
        { titre: "Convocation des États généraux", year: 1788 },
        { titre: "Exécution de Louis XVI", year: 1793 }
    ];

    console.log("=== TEST SENTINEL - DÉTECTION DE DOUBLON ===\n");
    console.log(`ÉVÉNEMENT À VALIDER : "${event.titre}" (${event.year})`);
    console.log(`CANDIDATS DANS LA BASE : ${JSON.stringify(candidates, null, 2)}\n`);

    const prompt = `
Tu es SENTINEL. Compare cet événement aux candidats existants.
ÉVÉNEMENT : "${event.titre}" (${event.year})
CANDIDATS : ${JSON.stringify(candidates)}

RÈGLES :
- REJET si c'est le même fait historique (même si le titre diffère).
- REJET si c'est un doublon conceptuel (ex: deux "Première ligne de chemin de fer").
- ACCEPTE uniquement si c'est un fait distinct.

Réponds en JSON : { "isDuplicate": true/false, "reason": "..." }
`;

    console.log("📤 PROMPT ENVOYÉ À GEMINI :");
    console.log(prompt);
    console.log("\n⏳ Attente de la réponse IA...\n");

    const result = await model.generateContent(prompt);
    const decision = JSON.parse(result.response.text());

    console.log("📥 RÉPONSE DE L'IA :");
    console.log(JSON.stringify(decision, null, 2));

    if (decision.isDuplicate) {
        console.log("\n✅ BONNE DÉCISION : Doublon correctement détecté");
    } else {
        console.log("\n❌ MAUVAISE DÉCISION : L'IA n'a pas détecté le doublon exact !");
    }

    return decision;
}

// Test avec plusieurs cas
async function runMultipleTests() {
    const testCases = [
        {
            name: "Doublon exact",
            event: { titre: "Prise de la Bastille", year: 1789 },
            candidates: [{ titre: "Prise de la Bastille", year: 1789 }]
        },
        {
            name: "Doublon reformulé",
            event: { titre: "Couronnement de Charlemagne", year: 800 },
            candidates: [
                { titre: "Charlemagne est sacré empereur d'Occident par le pape Léon III", year: 800 },
                { titre: "Couronnement de Charlemagne empereur d'Occident", year: 800 }
            ]
        },
        {
            name: "Événement distinct",
            event: { titre: "Bataille d'Alésia", year: 52 },
            candidates: [{ titre: "Prise de la Bastille", year: 1789 }]
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n${"=".repeat(60)}`);
        console.log(`TEST : ${testCase.name}`);
        console.log("=".repeat(60));

        const prompt = `
Tu es SENTINEL. Compare cet événement aux candidats existants.
ÉVÉNEMENT : "${testCase.event.titre}" (${testCase.event.year})
CANDIDATS : ${JSON.stringify(testCase.candidates)}

RÈGLES :
- REJET si c'est le même fait historique (même si le titre diffère).
- REJET si c'est un doublon conceptuel (ex: deux "Première ligne de chemin de fer").
- ACCEPTE uniquement si c'est un fait distinct.

Réponds en JSON : { "isDuplicate": true/false, "reason": "..." }
`;

        const result = await model.generateContent(prompt);
        const decision = JSON.parse(result.response.text());

        console.log(`\nÉVÉNEMENT : "${testCase.event.titre}" (${testCase.event.year})`);
        console.log(`CANDIDATS : ${JSON.stringify(testCase.candidates.map(c => c.titre))}`);
        console.log(`\nDÉCISION : ${decision.isDuplicate ? "❌ DOUBLON" : "✅ UNIQUE"}`);
        console.log(`RAISON : ${decision.reason}`);
    }
}

// Exécution
console.log("🔬 Test de la logique de détection de SENTINEL\n");
await testSentinelDecision();
console.log("\n\n🧪 Tests multiples...");
await runMultipleTests();
