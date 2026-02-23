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

async function runDisambiguation() {
    console.log("📥 Récupération de tous les événements de la table...");

    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, date, description_detaillee')
            .range(from, from + 999);

        if (error) { console.error(error); return; }
        if (data && data.length > 0) {
            allEvents.push(...data);
            from += 1000;
        } else {
            break;
        }
    }

    console.log(`✅ ${allEvents.length} événements chargés. Initiation de l'audit de désambiguïsation...`);

    const batchSize = 100;
    let totalUpdated = 0;

    for (let i = 0; i < allEvents.length; i += batchSize) {
        const batch = allEvents.slice(i, i + batchSize);
        process.stdout.write(`\n🔍 Analyse lot ${i} à ${i + batch.length}...\n`);

        const prompt = `
Voici une liste d'événements historiques (avec leur ID, leur titre, leur date réelle et leur description).
Ta mission est d'identifier les titres d'"ÉVÉNEMENTS RÉCURRENTS", c'est-à-dire les titres stricts qui pourraient correspondre à PLUSIEURS années différentes et créer une confusion chez le joueur.

Exemples d'ambiguïté grave : 
- "L'Argentine remporte la Coupe du Monde" -> (1978, 1986 ou 2022 ?)
- "Élection de François Mitterrand" -> (1981 ou 1988 ?)
- "Victoire du Brésil en Coupe du monde" -> (Laquelle ?)
- "Les États-Unis remportent la Coupe du Monde" -> (Laquelle ?)

RÈGLES DE CORRECTION :
1. Reformule le titre pour le rendre UNIQUE, en ajoutant par exemple un protagoniste, le lieu du tournoi, ou la mention "Première/Deuxième". 
2. INTERDIT: Tu ne dois JAMAIS ajouter l'année ni de date dans le titre final.

Si le titre original est déjà unique et clair (ex: "Première Coupe du monde de football", "Invention de l'imprimerie", "Bataille de Waterloo"), NE LE METS SURTOUT PAS DANS LE JSON. Ne liste que les titres posant un vrai problème de confusion chronologique. ET ne renvoie jamais deux fois le même titre.

Liste :
${JSON.stringify(batch.map(e => ({ id: e.id, titre: e.titre, annee_exacte: (e.date || '').substring(0, 4), description: e.description_detaillee })))}

FORMAT ATTENDU (UNIQUEMENT CE JSON) :
{
  "corrections": [
    {
      "id": "uuid-here",
      "nouveau_titre": "L'Argentine de Messi remporte la Coupe du Monde"
    }
  ]
}`;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());

            if (data.corrections && data.corrections.length > 0) {
                let realCorrections = data.corrections.filter(c => {
                    const orig = batch.find(b => b.id === c.id);
                    return orig && orig.titre !== c.nouveau_titre;
                });

                if (realCorrections.length > 0) {
                    console.log(`   ⚠️ ${realCorrections.length} vraies homonymies relevées !`);
                    for (let corr of realCorrections) {
                        const original = batch.find(b => b.id === corr.id);
                        console.log(`   - 🔄 "${original.titre}"  ==>  "${corr.nouveau_titre}"`);

                        const { error } = await supabase.from('evenements').update({ titre: corr.nouveau_titre }).eq('id', corr.id);
                        if (error) {
                            console.error(`     ❌ Erreur DB:`, error.message);
                        } else {
                            totalUpdated++;
                        }
                    }
                } else {
                    console.log(`   ✅ Aucun titre ambigu sur ce lot (faux positifs filtrés).`);
                }
            } else {
                console.log(`   ✅ Aucun titre ambigu sur ce lot.`);
            }
        } catch (e) {
            console.error("❌ Erreur API Gemini :", e.message);
        }
        await new Promise(res => setTimeout(res, 2000));
    }

    console.log(`\n=================================================`);
    console.log(`🎯 AUDIT TERMINÉ ! ${totalUpdated} titres imprécis ont été désambiguïsés.`);
    console.log(`=================================================`);
}

runDisambiguation();
