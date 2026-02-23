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

const targetNames = [
    "Zidane", "Mbappé", "Messi", "Deschamps", "Griezmann", "Pogba", "Antoine Dupont", "Tiger Woods",
    "Lance Armstrong", "Belmondo", "Aznavour", "Coluche", "Dewaere", "Terzieff", "Jane Birkin",
    "Strauss-Kahn", "Princesse Diana", "Claude Nougaro", "Michel Jazy", "Pablo Picasso",
    "Banksy", "Damien Hirst", "François Truffaut", "Greta Garbo", "Jacques Chancel",
    "Sepp Blatter", "Eusebio", "André Roussimoff", "George Weah", "Ken Kutaragi"
];

async function runTargetedPurge() {
    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase
            .from('evenements')
            .select('*')
            .gte('date', '1950-01-01')
            .range(from, from + 999);

        if (error) { console.error(error); return; }
        if (data && data.length > 0) {
            allEvents.push(...data);
            from += 1000;
        } else {
            break;
        }
    }

    let targetsToAnonymize = [];

    for (const ev of allEvents) {
        let matched = false;
        for (const name of targetNames) {
            if (ev.description_detaillee && ev.description_detaillee.includes(name) || ev.titre && ev.titre.includes(name)) {
                if (!targetsToAnonymize.find(t => t.id === ev.id)) {
                    targetsToAnonymize.push({ ...ev, matched_name: name });
                    matched = true;
                }
            }
        }
    }

    console.log(`🎯 ${targetsToAnonymize.length} événements ciblés au scalpel ! Réécriture des prompts...`);

    let purgedCount = 0;

    for (const original of targetsToAnonymize) {
        console.log(`\n - 🔧 Anonymisation visuelle pour : [${original.matched_name}] ${original.titre}`);

        const promptRewrite = `
Tu es ARTISAN. Voici le titre et la description d'un événement historique impliquant une célébrité (${original.matched_name}) dont le visage est protégé commercialement.
Titre: ${original.titre}
Description: ${original.description_detaillee}

Rédige une description visuelle (En ANGLAIS, 100-150 mots) pour générer l'illustration sur Midjourney, MAIS avec la consigne ⚠️ DROITS À L'IMAGE : Ne mentionne JAMAIS AUCUN NOM DE PERSONNALITÉ (ex: écrit 'a generic football player', 'a generic wealthy politician', 'an anonymous singer'). Insiste sur les textures (rough wool, cold stone, flashes) et la scène globale de manière saturée sans visages d'hommes/femmes connus. Mieux vaut ne pas voir de visage du tout (de dos, dans la foule).

FORMAT:
{ "nouveau_prompt_anglais": "..." }`;

        try {
            const resultRewrite = await model.generateContent(promptRewrite);
            const dataRewrite = JSON.parse(resultRewrite.response.text());
            const newFlux = dataRewrite.nouveau_prompt_anglais;

            // Mise à jour de la table de production
            await supabase.from('evenements').update({ description_flux: newFlux }).eq('id', original.id);

            // Placement dans queue_sevent pour écrasement (via REXP target_id)
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
                console.log(`     ✅ Prêt pour la Chambre Noire !`);
            }
        } catch (e) {
            console.error("     ❌ Erreur Génération Gemini :", e.message);
        }
        await new Promise(res => setTimeout(res, 2000));
    }

    console.log(`\n=================================================`);
    console.log(`🎯 OPÉRATION CHIRURGICALE TERMINÉE !`);
    console.log(`✅ ${purgedCount} événements exacts ont l'ordre d'être re-dessinés légalement.`);
    console.log(`👉 Tu peux maintenant lancer 'npm run chambre_noire' !`);
    console.log(`=================================================`);
}

runTargetedPurge();
