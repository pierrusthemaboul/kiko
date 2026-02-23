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

async function scanCelebrities() {
    console.log("📥 Récupération des titres et descriptions depuis 1950...");

    let modernEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, description_detaillee')
            .gte('date', '1950-01-01')
            .range(from, from + 999);

        if (error) { console.error(error); return; }
        if (data && data.length > 0) {
            modernEvents.push(...data);
            from += 1000;
        } else {
            break;
        }
    }

    console.log(`✅ ${modernEvents.length} événements récents récupérés. Analyse par l'IA...`);

    const batchSize = 100;
    let totalRisk = 0;

    for (let i = 0; i < modernEvents.length; i += batchSize) {
        const batch = modernEvents.slice(i, i + batchSize);
        process.stdout.write(`🔍 Analyse du lot ${i} à ${i + batch.length}... `);

        const prompt = `
Voici une liste d'événements historiques.
Identifie CHAQUE événement qui concerne EXPLICITEMENT une personnalité vivante ou décédée très récemment et ultra-célèbre (en particulier les SPORTIFS, ACTEURS, CHANTEURS, ou PERSONNALITÉS MÉDIATIQUES, ex: Zidane, Pelé, Michael Jackson, Mbappé, les Beatles, etc.).
Le but est d'alerter sur les visages de la pop-culture dont l'utilisation d'image est protégée commercialement. Tu n'es pas obligé de signaler les chefs d'états politiques des années 50/60 (ex: De Gaulle ou JFK), concentre-toi surtout sur le Sport et le Show-business contemporain.

List:
${JSON.stringify(batch.map(e => ({ id: e.id, description: e.description_detaillee })))}

FORMAT ATTENDU :
{
  "risques": [
    {
      "id": "uuid-here",
      "visage_protege": "Nom du sportif / chanteur"
    }
  ]
}`;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());

            if (data.risques && data.risques.length > 0) {
                console.log(`⚠️ ${data.risques.length} risques détectés !`);
                for (let r of data.risques) {
                    const original = batch.find(b => b.id === r.id);
                    console.log(`   - 📸 [VISAGE : ${r.visage_protege}] dans l'événement : "${original.titre}"`);
                    totalRisk++;
                }
            } else {
                console.log(`✅ 0 risque majeur dans ce lot.`);
            }
        } catch (e) {
            console.error("❌ Erreur API Gemini :", e.message);
        }
        await new Promise(res => setTimeout(res, 2000));
    }

    console.log(`\n=================================================`);
    console.log(`🚨 BILAN : ${totalRisk} événements potentiellement à "Anonymiser" visuellement.`);
    console.log(`(Tu peux utiliser 'look' pour regénérer leur illustration sans leur nom).`);
    console.log(`=================================================`);
}

scanCelebrities();
