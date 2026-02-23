import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });

async function findMissingIconicEvents() {
    console.log("📥 Récupération des ~3000 titres existants en base (Pagination activée)...");

    let allTitles = [];
    let from = 0;
    const step = 999;
    let fetching = true;

    while (fetching) {
        const { data, error } = await supabase
            .from('evenements')
            .select('titre')
            .range(from, from + step);

        if (error) {
            console.error("❌ Erreur Supabase:", error.message);
            return;
        }

        if (data && data.length > 0) {
            allTitles.push(...data.map(e => e.titre));
            from += step + 1;
        }

        if (!data || data.length <= step) {
            fetching = false;
        }
    }

    console.log(`✅ EXACTEMENT ${allTitles.length} titres récupérés ! Mode "Scanner Historique" activé...`);
    console.log("🧠 Analyse globale des vrais " + allTitles.length + " événements par Gemini en cours...");

    const prompt = `
Tu es un expert mondial en Histoire.
Je possède un jeu de culture générale avec une base de données de ${allTitles.length} événements historiques.
Malgré cette très grande taille, je suis sûr qu'il me manque des événements parmi les plus CÉLÈBRES et ICONIQUES de l'histoire de l'humanité (Science, Pop Culture, Politique, Guerres, Sports, Conquêtes, etc. avec une notoriété grand public de 85/100 à 100/100).

Ta mission est de croiser ma liste actuelle avec ton encyclopédie globale, et de me proposer les 15 événements MAJEURS et ULTRA-CONNUS qui sont STRICTEMENT ABSENTS de ma base de données.
Fais très attention à ne pas me proposer des événements qui existeraient déjà sous un synonyme dans la très longue liste ci-dessous. Lis-la bien !

Voici ma base de données exhaustive actuelle :
${JSON.stringify(allTitles)}

FORMAT ATTENDU (JSON) :
{
  "evenements_manquants": [
    {
      "titre": "Titre précis de l'événement (sans date)",
      "year": 1234,
      "pourquoi_incontournable": "Brève explication de son immense notoriété et impact historique"
    }
  ]
}
`;

    try {
        const result = await model.generateContent(prompt);
        const data = JSON.parse(result.response.text());

        console.log(`\n============================================================`);
        console.log(`🌟 LES 15 INCONTOURNABLES RÉELLEMENT MANQUANTS ! 🌟`);
        console.log(`============================================================\n`);

        data.evenements_manquants.forEach((ev, i) => {
            console.log(`${i + 1}. [${ev.year}] ${ev.titre}`);
            console.log(`   💡 Pourquoi ? ${ev.pourquoi_incontournable}\n`);
        });

    } catch (e) {
        console.error("❌ Erreur lors de l'analyse Gemini :", e);
    }
}

findMissingIconicEvents();
