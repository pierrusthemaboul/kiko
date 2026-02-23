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

async function purgeCelebrities() {
    console.log("📥 [PURGE] Récupération des ~640 événements post-1950...");
    let modernEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase
            .from('evenements')
            .select('*')
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

    console.log(`✅ ${modernEvents.length} événements récupérés. Détection des célébrités contemporaines...`);

    const batchSize = 100;
    let purgedCount = 0;

    for (let i = 0; i < modernEvents.length; i += batchSize) {
        const batch = modernEvents.slice(i, i + batchSize);
        process.stdout.write(`\n🔍 Analyse lot ${i} à ${i + batch.length}...\n`);

        const promptAnalyze = `Voici une liste d'événements. Identifie ceux qui impliquent directement une célébrité contemporaine (sportif, acteur, chanteur, personnalité politique ultra contemporaine type obama/macron/dsk, princesse diana, etc.). 
List:
${JSON.stringify(batch.map(e => ({ id: e.id, description: e.description_detaillee, flux: e.description_flux })))}

FORMAT ATTENDU :
{
  "risques": [{"id": "uuid-here"}]
}`;

        try {
            const resultAnalyze = await model.generateContent(promptAnalyze);
            const dataAnalyze = JSON.parse(resultAnalyze.response.text());

            if (dataAnalyze.risques && dataAnalyze.risques.length > 0) {
                console.log(`   ⚠️ ${dataAnalyze.risques.length} risques détectés ! Purge en cours...`);

                for (let r of dataAnalyze.risques) {
                    const original = batch.find(b => b.id === r.id);
                    if (!original) continue;

                    console.log(`   - 🔧 Anonymisation du prompt visuel pour : ${original.titre}`);

                    // On demande à l'IA de réécrire le prompt FLUX
                    const promptRewrite = `
Tu es ARTISAN. Voici le titre et la description d'un événement historique impliquant une célébrité dont le visage est protégé.
Titre: ${original.titre}
Description: ${original.description_detaillee}

Rédige une description visuelle (En ANGLAIS, 100-150 mots) pour générer l'illustration sur Midjourney, MAIS avec la consigne ⚠️ DROITS À L'IMAGE : Ne mentionne JAMAIS de nom de célébrité contemporaine (ex: écrit 'a generic football player', 'a generic wealthy politician', 'a blonde princess'). Insiste sur les textures (rough wool, cold stone, flashes) et la scène globale de manière saturée sans visages d'hommes/femmes connus.

FORMAT:
{ "nouveau_prompt_anglais": "..." }`;

                    const resultRewrite = await model.generateContent(promptRewrite);
                    const dataRewrite = JSON.parse(resultRewrite.response.text());
                    const newFlux = dataRewrite.nouveau_prompt_anglais;

                    // Mettre à jour en base 'evenements' avec le nouveau FLUX
                    await supabase.from('evenements').update({ description_flux: newFlux }).eq('id', original.id);

                    // Envoyer à queue_sevent avec le tag ORIGINAL_UUID pour que la Chambre Noire l'écrase
                    // L'image sera régénérée et insérée en PROD grâce à 'REXP'.
                    const dateYear = original.date ? parseInt(original.date.substring(0, 4)) : 2000;
                    const noto = original.notoriete_fr || original.notoriete || 50;

                    const { error: qErr } = await supabase.from('queue_sevent').insert([{
                        titre: original.titre,
                        year: dateYear,
                        type: original.types_evenement || ['Histoire'],
                        region: original.region || 'Monde',
                        description: newFlux, // English pour la Chambre
                        specific_location: original.description_detaillee, // FR
                        notoriete: noto,
                        status: 'pending',
                        error_log: `ORIGINAL_UUID:${original.id}`
                    }]);

                    if (qErr) {
                        console.error(`     ❌ Erreur File:`, qErr.message);
                    } else {
                        purgedCount++;
                    }
                }
            } else {
                console.log(`   ✅ Aucun risque dans ce lot.`);
            }
        } catch (e) {
            console.error("❌ Erreur API Gemini :", e.message);
        }
        await new Promise(res => setTimeout(res, 2000));
    }

    console.log(`\n=================================================`);
    console.log(`🎯 OPÉRATION TERMINÉE !`);
    console.log(`✅ ${purgedCount} événements ont été passés au Kärcher et anonymisés.`);
    console.log(`👉 Tu peux maintenant lancer 'npm run chambre_noire' pour régénérer leurs images !`);
    console.log(`=================================================`);
}

purgeCelebrities();
