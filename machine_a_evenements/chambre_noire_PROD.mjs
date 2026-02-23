import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getSupabase, uploadImageToSupabase } from './AGENTS/shared_utils.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const supabase = getSupabase('prod');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Génère un code unique pour la table production
 */
function generateCode(titre, year) {
    const slug = titre.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 30);
    return `${slug}-${year}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Utilise Gemini pour enrichir un événement qui n'existait pas encore en prod
 */
async function getEnrichment(event) {
    const prompt = `
Tu es un expert historien. Analyse cet événement pour insertion en production.
Titre: ${event.titre}
Année: ${event.year}
Description: ${event.description}

Règles :
1. "universel" : true si l'impact est mondial.
2. "region" : "Europe", "Asie", "Afrique", "Amérique du Nord", "Amérique du Sud", "Océanie", "Moyen-Orient".
3. "pays" : ["France"] (ou autre).
4. "epoque" : Antiquité, Moyen Âge, Renaissance, XVIIe siècle, XVIIIe siècle, XIXe siècle, XXe siècle, Contemporain.
5. "notoriete" : 0-100.
6. "niveau_difficulte" : 1 (Facile), 2 (Moyen), 3 (Difficile).
7. "date_formatee" : L'année seule.
8. "types_evenement" : ["Catégorie"].
9. "description_detaillee" : 2-3 phrases captivantes.

Réponds UNIQUEMENT en JSON.
`;
    try {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
        return null;
    }
}

async function runChambreNoireProd() {
    console.log("\n" + "=".repeat(40));
    console.log("🚀 CHAMBRE NOIRE - MODE PRODUCTION DIRECT");
    console.log("=".repeat(40));

    // 1. Lire 3 événements dans la queue de prod
    const { data: queueItems, error } = await supabase
        .from('queue_sevent')
        .select('*')
        .eq('status', 'pending')
        .limit(3);

    if (error) {
        console.error("❌ Erreur lecture file d'attente prod:", error.message);
        return;
    }

    if (!queueItems || queueItems.length === 0) {
        console.log("∅ Aucun événement en attente dans la file de production.");
        return;
    }

    console.log(`📑 Traitement d'un batch de test de ${queueItems.length} événements.`);

    for (const item of queueItems) {
        console.log(`\n🎬 Traitement de : "${item.titre}"...`);
        let success = false;
        let attempt = 0;
        const MAX_RETRIES = 2;
        let feedback = "";

        while (attempt <= MAX_RETRIES && !success) {
            attempt++;
            try {
                // --- TRINITY ---
                const task = { ...item, feedback };
                fs.writeFileSync(path.resolve('./machine_a_evenements/AGENTS/TRINITY/STORAGE/INPUT/task.json'), JSON.stringify(task, null, 2));

                console.log(`⏳ [TRINITY] Génération d'image (Tentative ${attempt})...`);
                execSync(`node agent.js`, { cwd: path.resolve('./machine_a_evenements/AGENTS/TRINITY'), stdio: 'inherit' });

                // --- VERITAS ---
                console.log("⚖️ [VERITAS] Validation...");
                execSync(`node agent.js`, { cwd: path.resolve('./machine_a_evenements/AGENTS/VERITAS'), stdio: 'inherit' });

                const veritasResult = JSON.parse(fs.readFileSync(path.resolve('./machine_a_evenements/AGENTS/VERITAS/STORAGE/OUTPUT/veritas_result.json'), 'utf8'));

                if (veritasResult.validation.isValid) {
                    console.log("✅ Image validée !");

                    // --- EXPORT DIRECT PROD ---
                    console.log("📦 Publication directe en production...");
                    const publicUrl = await uploadImageToSupabase(supabase, veritasResult.imageUrl, item.titre);
                    console.log(`🔗 Image uploadée: ${publicUrl}`);

                    // On cherche si l'événement existe déjà dans "evenements"
                    const { data: existingEvents } = await supabase
                        .from('evenements')
                        .select('id')
                        .eq('titre', item.titre)
                        .eq('date_formatee', item.year.toString());

                    if (existingEvents && existingEvents.length > 0) {
                        // UPDATE
                        const { error: upError } = await supabase
                            .from('evenements')
                            .update({
                                illustration_url: publicUrl,
                                description_detaillee: item.description.split('\n\n### MANDATORY')[0], // On nettoie le prompt suffix
                                donnee_corrigee: false
                            })
                            .eq('id', existingEvents[0].id);
                        if (upError) console.error("❌ Erreur update prod:", upError.message);
                        else console.log("✨ Événement existant mis à jour.");
                    } else {
                        // INSERT (Erichment needed)
                        console.log("📝 Nouvel événement détecté, enrichissement...");
                        const enrichment = await getEnrichment(item);
                        if (enrichment) {
                            const { error: insError } = await supabase
                                .from('evenements')
                                .insert([{
                                    ...enrichment,
                                    titre: item.titre,
                                    date: `${item.year.toString().padStart(4, '0')}-01-01`,
                                    illustration_url: publicUrl,
                                    code: generateCode(item.titre, item.year),
                                    langue: 'fr',
                                    ecart_temps_max: 500,
                                    ecart_temps_min: 20,
                                    facteur_variation: 1.0
                                }]);
                            if (insError) console.error("❌ Erreur insert prod:", insError.message);
                            else console.log("🛰️ Nouvel événement inséré.");
                        }
                    }

                    // On supprime de la queue prod
                    await supabase.from('queue_sevent').delete().eq('id', item.id);
                    success = true;
                } else {
                    console.log(`❌ Rejet Veritas : ${veritasResult.validation.explanation}`);
                    feedback = veritasResult.validation.explanation;
                }
            } catch (err) {
                console.error("💥 Erreur critique:", err.message);
                break;
            }
        }
    }

    console.log("\n✨ Test Production terminé.");
}

runChambreNoireProd();
