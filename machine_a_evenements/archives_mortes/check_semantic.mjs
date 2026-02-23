
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function checkSemanticDuplicate(inputTitre, inputYear) {
    console.log(`\n🔍 Analyse sémantique pour : "${inputTitre}" (${inputYear})`);

    // 1. Récupérer les candidats potentiels (fourchette +/- 5 ans)
    // Comme date_formatee est une string, on cherche les événements qui contiennent l'année
    const yearsToSearch = [];
    for (let i = -3; i <= 3; i++) {
        yearsToSearch.push((parseInt(inputYear) + i).toString());
    }

    // On cherche les événements qui contiennent l'une des années de la fourchette
    const orFilter = yearsToSearch.map(y => `date_formatee.ilike.%${y}%`).join(',');

    const { data: candidates, error } = await supabase
        .from('evenements')
        .select('titre, date_formatee, description_detaillee')
        .or(orFilter);

    if (error) {
        console.error("Erreur Supabase :", error.message);
        return;
    }

    if (!candidates || candidates.length === 0) {
        console.log("✅ Aucun événement trouvé dans cette fourchette de dates. Probablement sûr.");
        return;
    }

    const filteredCandidates = candidates;

    if (filteredCandidates.length === 0) {
        console.log("✅ Aucun événement trouvé dans cette fourchette de dates. Probablement sûr.");
        return;
    }

    // 2. Demander à Gemini de comparer
    const prompt = `
Tu es un expert historien.
On veut savoir si l'événement suivant est DÉJÀ présent dans la base de données, même si le titre est légèrement différent.

ÉVÉNEMENT À TESTER :
Titre : "${inputTitre}"
Année : ${inputYear}

LISTE DES ÉVÉNEMENTS EXISTANTS DANS CETTE PÉRIODE :
${filteredCandidates.map(c => `- ${c.titre} (${c.date_formatee})`).join('\n')}

RÈGLES :
- Réponds "DOUBLON" si c'est le même fait historique.
- Réponds "UNIQUE" si c'est un événement différent.
- Donne une explication courte.

FORMAT DE RÉPONSE (JSON) :
{
  "verdict": "DOUBLON" | "UNIQUE",
  "reason": "...",
  "match": "Titre du doublon trouvé ou null"
}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const jsonMatch = response.match(/\{.*\}/s);
        const finalResult = JSON.parse(jsonMatch[0]);

        if (finalResult.verdict === "DOUBLON") {
            console.log(`🛑 STOP ! C'est un DOUBLON de : "${finalResult.match}"`);
            console.log(`💡 Raison : ${finalResult.reason}`);
        } else {
            console.log(`✨ OK ! Cet événement est UNIQUE.`);
            console.log(`💡 Pourquoi : ${finalResult.reason}`);
        }
    } catch (e) {
        console.error("Erreur d'analyse IA :", e.message);
    }
}

const [, , titre, year] = process.argv;
if (!titre || !year) {
    console.log("Usage: node check_semantic.mjs \"Titre\" 1610");
} else {
    checkSemanticDuplicate(titre, year);
}
