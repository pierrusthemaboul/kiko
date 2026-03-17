import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Replicate from 'replicate';
import { uploadImageToSupabase } from '../AGENTS/shared_utils.mjs';
import { inspectImage } from './veritas.mjs';
import { generatePromptWithAI } from './scenariste.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// 🏠 LOCAL DB for 'labo' table
const LOCAL_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localDb = createClient(LOCAL_URL, LOCAL_KEY);

// 🌍 PROD DB for STORAGE only
const PROD_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const prodDb = createClient(PROD_URL, PROD_KEY);

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

async function runPeintre(limit = 20) {
    console.log("======================================================");
    console.log("  🎨 DÉMARRAGE DU PEINTRE - MODE DUAL (LOCAL DB / PROD STORAGE)");
    console.log("======================================================\n");

    const testIds = []; // Laissez vide pour traiter TOUT le stock READY_FOR_IMAGE

    let query = localDb.from('labo').select('*');

    if (testIds.length > 0) {
        console.log(`🔍 Mode TEST : Filtrage sur IDs : ${testIds.join(', ')}`);
        query = query.in('id', testIds);
    } else {
        console.log(`🔍 Mode PRODUCTION : Recherche des événements READY_FOR_IMAGE...`);
        query = query.eq('status', 'READY_FOR_IMAGE').limit(limit);
    }

    const { data: events, error } = await query;

    if (error) {
        console.error("❌ Erreur accès BD Locale:", error.message);
        return;
    }

    if (!events || events.length === 0) {
        console.log("✅ Aucun événement à peindre !");
        return;
    }

    console.log(`🎬 ${events.length} événements trouvés pour la génération d'images.\n`);

    const report = [];

    for (const event of events) {
        let attempts = 0;
        let success = false;
        let finalUrl = null;
        let currentPrompt = event.image_prompt;
        let generationType = 'REALISTIC';

        console.log(`------------------------------------------------------`);
        console.log(`🎬 TRAVAIL SUR : [${event.id}] "${event.titre}" (${event.year})`);

        while (attempts < 3 && !success) {
            attempts++;
            console.log(`   📸 Tentative #${attempts} (${generationType})...`);

            try {
                const output = await replicate.run("black-forest-labs/flux-schnell", {
                    input: {
                        prompt: currentPrompt,
                        aspect_ratio: "16:9",
                        num_inference_steps: 4,
                        guidance_scale: 2.5
                    }
                });
                const imageUrl = Array.isArray(output) ? output[0] : output;

                // Inspection Veritas (Gemini Vision) - Rigueur Absolue
                const inspection = await inspectImage(imageUrl, event.titre, event.year, generationType.toLowerCase());

                if (inspection.isValid) {
                    console.log(`   ✅ VALIDÉ par Veritas : ${inspection.reason}`);

                    // 🚀 UPLOAD SUR LE PROD DB (STORAGE REMOTE)
                    const publicUrl = await uploadImageToSupabase(prodDb, imageUrl, event.titre, event.id);
                    finalUrl = publicUrl;
                    success = true;

                    // 🏠 UPDATE SUR LE LOCAL DB (TABLE LABO)
                    await localDb.from('labo').update({
                        illustration_url: finalUrl, // Sera l'URL Supabase Prod !
                        status: 'IMAGE_DONE',
                        validation_notes: inspection
                    }).eq('id', event.id);

                    report.push({ titre: event.titre, status: 'ACCEPTED', type: generationType, reason: inspection.reason });
                } else {
                    console.warn(`   ❌ REJETÉ par Veritas : ${inspection.reason}`);

                    // Sauvegarde sur le prod storage pour archive des erreurs (optionnel, on garde prodDb ici aussi)
                    const rejectedUrl = await uploadImageToSupabase(prodDb, imageUrl, `rejected_v${attempts}_${event.titre}`, event.id);

                    if (attempts === 1) {
                        console.log(`   🔄 Tentative de correction réaliste...`);
                        currentPrompt = `${currentPrompt}. (STRICT CORRECTION: No modern hats/hair. Fix: ${inspection.reason}. Use ${event.year} clothing/tech ONLY.)`;
                    } else if (attempts === 2) {
                        console.log(`   🔀 PIVOT SYMBOLIQUE : Échec du réalisme, passage au style épuré...`);
                        generationType = 'SYMBOLIC';
                        currentPrompt = await generatePromptWithAI(event.titre, event.description || '', event.year, 'symbolic');
                        console.log(`   ✨ Nouveu Prompt Symbolique : "${currentPrompt}"`);
                    } else {
                        console.error(`   🛑 Échec final après pivot symbolique.`);
                        report.push({ titre: event.titre, status: 'REJECTED', type: generationType, reason: inspection.reason });
                        await localDb.from('labo').update({
                            status: 'REJECTED_VERITAS',
                            error_log: inspection.reason,
                            illustration_url_rejected: rejectedUrl
                        }).eq('id', event.id);
                    }
                }
            } catch (err) {
                console.error(`   💥 Erreur technique : ${err.message}`);
                break;
            }
        }
    }

    console.log(`\n📊 TABLEAU RÉCAPITULATIF DU PIVOT :`);
    console.table(report.map(r => ({ Événement: r.titre, Résultat: r.status, Style: r.type, Motif: r.reason })));
    console.log(`\n💥 MISSION TERMINÉE !`);
}

runPeintre();

