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

async function scanReligion() {
    console.log("📥 Récupération des événements potentiellement liés à la religion...");

    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, description_detaillee')
            .range(from, from + 999);

        if (error) { console.error(error); return; }
        if (data && data.length > 0) {
            allEvents.push(...data);
            from += 1000;
        } else {
            break;
        }
    }

    // On pré-filtre grossièrement par mots-clés pour économiser l'API
    const keywords = ['islam', 'musulman', 'prophète', 'mahomet', 'muhammad', 'coran', 'hégire', 'mecque', 'médine', 'califat', 'religion'];
    const candidates = allEvents.filter(ev => {
        const textToSearch = ((ev.titre || '') + ' ' + (ev.description_detaillee || '')).toLowerCase();
        return keywords.some(kw => textToSearch.includes(kw));
    });

    console.log(`✅ ${candidates.length} événements pré-filtrés. Analyse par l'IA des descriptions visuelles (description_flux)...`);

    const batchSize = 50;
    let totalRisk = 0;

    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        process.stdout.write(`🔍 Analyse du lot ${i} à ${i + batch.length}...\n`);

        const prompt = `
Voici une liste d'événements historiques. 
Dans l'Islam, la représentation visuelle (dessin/peinture) du Prophète Muhammad (Mahomet) et des autres prophètes majeurs est strictement interdite (aniconisme). 
Ta mission est de lire la description de l'événement et SURTOUT son prompt de génération d'image (flux).
Identifie les événements où le prompt visuel ("flux") tente de DESSINER ou METTRE EN SCÈNE un prophète de l'Islam (en particulier le Prophète Muhammad), ce qui serait gravement offensant.
Si le prompt décrit juste de l'architecture (une mosquée), une bataille sans le prophète, ou une calligraphie, ce n'est PAS un risque.
Le risque n'existe que si on demande à l'IA de dessiner le personnage.

List:
${JSON.stringify(batch.map(e => ({ id: e.id, description: e.description_detaillee })))}

FORMAT ATTENDU :
{
  "risques": [
    {
      "id": "uuid-here",
      "raison": "Explication courte de pourquoi l'image est problématique ou demande à dessiner le prophète"
    }
  ]
}`;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());

            if (data.risques && data.risques.length > 0) {
                console.log(`   ⚠️ ${data.risques.length} risques détectés !`);
                for (let r of data.risques) {
                    const original = batch.find(b => b.id === r.id);
                    console.log(`   - 🕌 [SENSITIF] ${original.titre}`);
                    console.log(`     Raison : ${r.raison}`);
                    totalRisk++;
                }
            } else {
                console.log(`   ✅ 0 risque de représentation repéré dans ce lot.`);
            }
        } catch (e) {
            console.error("❌ Erreur API Gemini :", e.message);
        }
        await new Promise(res => setTimeout(res, 2000));
    }

    console.log(`\n=================================================`);
    console.log(`🚨 BILAN : ${totalRisk} événements à anonymiser pour respecter l'aniconisme.`);
    console.log(`=================================================`);
}

scanReligion();
