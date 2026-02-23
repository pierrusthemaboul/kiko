import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabase } from './AGENTS/shared_utils.mjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const supabase = getSupabase('prod');

async function auditReliability() {
    console.log("🔍 Lancement de l'audit de fiabilité historique sur 150 événements...");

    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, date');

    if (error) {
        console.error("❌ Erreur Supabase:", error.message);
        return;
    }

    const shuffled = events.sort(() => 0.5 - Math.random()).slice(0, 150);
    const results = [];
    const BATCH_SIZE = 30;

    for (let i = 0; i < shuffled.length; i += BATCH_SIZE) {
        const batch = shuffled.slice(i, i + BATCH_SIZE);
        console.log(`📦 Audit du lot ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(shuffled.length / BATCH_SIZE)}...`);

        const prompt = `Tu es une sentinelle historique infaillible. 
Vérifie si les événements suivants sont historiquement EXACTS (Titre et Année).

IMPORTANT : 
- Un événement est FAUX si l'année est décalée de plus de 1-2 ans par rapport au consensus historique.
- Un événement est FAUX s'il n'a jamais eu lieu (Hallucination).

LISTE À VÉRIFIER :
${JSON.stringify(batch.map(e => ({ id: e.id, titre: e.titre, annee: new Date(e.date).getFullYear() })), null, 2)}

Réponds UNIQUEMENT en JSON avec ce format :
{
  "audit": [
    { "id": "...", "correct": true/false, "reason": "Si faux, explique pourquoi et donne la vraie date" }
  ]
}`;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());
            results.push(...data.audit);
        } catch (e) {
            console.error("❌ Erreur pendant l'audit du lot:", e.message);
        }
    }

    const errors = results.filter(r => !r.correct);
    const score = ((results.length - errors.length) / results.length * 100).toFixed(1);

    console.log("\n" + "=".repeat(40));
    console.log(`📊 RAPPORT DE FIABILITÉ : ${score}%`);
    console.log("=".repeat(40));

    if (errors.length > 0) {
        console.log(`\n❌ ${errors.length} ERREURS DÉTECTÉES :`);
        errors.forEach(err => {
            const evt = shuffled.find(e => e.id === err.id);
            console.log(`- [${new Date(evt.date).getFullYear()}] ${evt.titre} --> ${err.reason}`);
        });
    } else {
        console.log("\n✅ Félicitations ! Aucune erreur détectée sur cet échantillon.");
    }
}

auditReliability();
