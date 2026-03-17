import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const LOCAL_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localDb = createClient(LOCAL_URL, LOCAL_KEY);

async function findSemanticDuplicatesWithIA(eventsList) {
    const apiKey = process.env.OPENAI_API_KEY;

    // On prépare une liste claire pour l'IA
    const formattedList = eventsList.map((e, index) => `[ID: ${e.id}] ${e.titre} (Année: ${e.year})`).join('\n');

    const prompt = `Tu es un expert historique chargé du nettoyage d'une base de données de jeu de culture générale.
Voici une liste d'événements historiques qui se sont déroulés pendant la même décennie :

${formattedList}

MISSION : 
Trouve TOUS les événements qui sont des DOUBLONS SÉMANTIQUES stricts.
Un doublon sémantique, c'est quand deux titres décrivent EXACTEMENT le même événement (même si les mots sont différents ou que la date varie d'un ou deux ans).
Ne sois pas trop zélé : "L'élection de De Gaulle de 1958" et "L'élection de De Gaulle de 1965" ne sont PAS des doublons (deux élections distinctes).

Renvoie UNIQUEMENT un JSON valide contenant un tableau de tableaux avec les ID des doublons. 
Si aucun doublon n'existe, renvoie [].
Exemple de réponse attendue :
[
  ["uuid-1", "uuid-2", "uuid-3"],
  ["uuid-4", "uuid-5"]
]`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1
            })
        });

        const data = await response.json();
        const text = data.choices[0].message.content.trim().replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(text);
    } catch (err) {
        console.error("❌ Erreur de l'IA (Parsing / Fetch) :", err.message);
        return [];
    }
}

async function processAllDecades() {
    console.log("======================================================");
    console.log("  🤖 DÉMARRAGE DU NETTOYEUR IA (SCAN GLOBAL)");
    console.log("======================================================\n");

    const { data: minData } = await localDb.from('boumboum').select('year').order('year', { ascending: true }).limit(1);
    const { data: maxData } = await localDb.from('boumboum').select('year').order('year', { ascending: false }).limit(1);

    if (!minData || minData.length === 0) {
        console.log("La base est vide !");
        return;
    }

    const minYear = minData[0].year;
    const maxYear = maxData[0].year;

    console.log(`📥 Lancement du scan de l'année ${minYear} à ${maxYear} (par blocs de 20 ans)...`);

    let totalDuplicatesRemoved = 0;

    for (let start = minYear; start <= maxYear; start += 20) {
        const end = start + 19;

        const { data: events, error } = await localDb
            .from('boumboum')
            .select('id, titre, year, status')
            .gte('year', start)
            .lte('year', end)
            .order('year', { ascending: true });

        if (error) {
            console.error(`Erreur de lecture sur ${start}-${end}:`, error.message);
            continue;
        }

        if (!events || events.length === 0) continue;

        console.log(`\n⏳ Période ${start}-${end} : ${events.length} événements. Analyse en cours...`);

        const duplicates = await findSemanticDuplicatesWithIA(events);

        if (duplicates.length > 0) {
            console.log(`🚨 Trouvé ${duplicates.length} groupes de doublons :`);

            for (const group of duplicates) {
                // On récupère les événements réels du groupe
                const groupEvents = group.map(id => events.find(e => e.id === id)).filter(Boolean);

                if (groupEvents.length > 1) {
                    // Tri pour garder le meilleur.
                    // Priorité forte sur "VERIFIED", puis "pending", le reste "CONFLIT_DATE" a le moins de valeur
                    groupEvents.sort((a, b) => {
                        const weight = (r) => (r.status === 'VERIFIED' ? 2 : (r.status === 'pending' ? 1 : 0));
                        return weight(b) - weight(a);
                    });

                    const keep = groupEvents[0];
                    console.log(`      > GARDE : [${keep.year}] "${keep.titre}" (${keep.status})`);

                    const toDeleteIds = [];
                    for (let i = 1; i < groupEvents.length; i++) {
                        const discard = groupEvents[i];
                        console.log(`      > SUPPRIME : [${discard.year}] "${discard.titre}" (${discard.status})`);
                        toDeleteIds.push(discard.id);
                    }

                    // Suppression réelle dans Supabase
                    if (toDeleteIds.length > 0) {
                        await localDb.from('boumboum').delete().in('id', toDeleteIds);
                        totalDuplicatesRemoved += toDeleteIds.length;
                    }
                }
            }
        } else {
            console.log(`  ✅ Aucun doublon sémantique.`);
        }

        // Petite pause Anti Rate-Limit OpenAI
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n💥 SCAN GLOBAL TERMINÉ ! Total des doublons sémantiques supprimés : ${totalDuplicatesRemoved}`);
}

processAllDecades();

