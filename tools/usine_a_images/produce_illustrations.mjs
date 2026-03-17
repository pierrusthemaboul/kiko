import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { uploadImageToSupabase } from '../tools/machine_a_evenements/AGENTS/shared_utils.mjs';

// --- CONFIGURATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const EVENTS_FILE = path.join(__dirname, '..', 'isolated_events.json');
const ART_DIR_FILE = path.join(__dirname, '..', 'direction_artistique.md');

async function runProduction() {
    console.log("🚀 Lancement de la nouvelle chaîne de production d'images...");

    // 1. Chargement des données
    const events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
    const artDirection = fs.readFileSync(ART_DIR_FILE, 'utf-8');

    console.log(`📋 ${events.length} événements à traiter.`);

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: `Tu es l'illustrateur en chef du projet Timalaus. 
        Ton rôle est de créer des prompts pour Flux Schnell en suivant rigoureusement le fichier direction_artistique.md.
        
        CONSIGNES DE PRODUCTION :
        1. Lis attentivement : ${artDirection}
        2. Pour chaque événement, tu dois impérativement suivre le "Protocole de Réflexion (Chain of Thought)" :
           - ANALYSE
           - FILTRE MÉTONYMIQUE
           - VÉRIFICATION COPYRIGHT
           - CADRAGE & LUMIÈRE
           - RÉDACTION
        
        FORMAT DE RÉPONSE ATTENDU :
        Tu dois répondre en terminant TOUJOURS par le prompt final dans une balise <prompt>...</prompt>.
        Exemple :
        Analyse: ...
        Filtre: ...
        <prompt>A photorealistic shot of...</prompt>`
    });

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        // Pour le test, on privilégie ceux qui n'ont pas d'image, mais on peut tout tester.
        // On va forcer la génération pour les 10 pour voir la différence.

        console.log(`\n--- [${i + 1}/${events.length}] ${event.titre} (${event.date}) ---`);

        // SKIP IF ALREADY DONE
        if (event.illustration_url_new && !process.argv.includes('--force')) {
            console.log("   ⏩ Déjà illustré, on passe. (Utilise --force pour régénérer)");
            continue;
        }

        try {
            let fluxPrompt = event.flux_prompt;

            // 2. Génération du prompt avec Gemini 2.0 Flash (seulement si absent)
            if (!fluxPrompt || process.argv.includes('--new-prompts')) {
                console.log("   🧠 Gemini 2.0 Flash réfléchit à la stratégie...");
                const userContent = `Événement : ${event.titre}\nDate : ${event.date}\nDescription : ${event.description_detaillee}`;
                const result = await model.generateContent(userContent);
                const fullText = result.response.text();

                // Extraction du prompt entre les balises
                const match = fullText.match(/<prompt>([\s\S]*?)<\/prompt>/i);
                fluxPrompt = match ? match[1].trim() : fullText.trim();

                events[i].flux_prompt = fluxPrompt;
                events[i].ai_thoughts = fullText.replace(/<prompt>[\s\S]*?<\/prompt>/i, '').trim();

                console.log(`   ✨ Stratégie validée. Prompt extrait.`);
            } else {
                console.log("   ♻️  Réutilisation du prompt existant.");
            }

            // 3. Génération d'image avec Flux Schnell
            console.log("   🎨 Génération de l'image via Flux Schnell...");
            const output = await replicate.run("black-forest-labs/flux-schnell", {
                input: {
                    prompt: fluxPrompt,
                    aspect_ratio: "16:9",
                    num_inference_steps: 4,
                    guidance_scale: 2.5
                }
            });
            const imageUrl = Array.isArray(output) ? output[0] : output;
            console.log(`   📸 Image générée : ${imageUrl}`);

            // 4. Upload sur Supabase
            console.log("   ☁️  Upload sur Supabase Storage...");
            const batchId = `test_strat_${Date.now()}_${i}`;
            const publicUrl = await uploadImageToSupabase(supabase, imageUrl, event.titre, batchId);

            // 5. Mise à jour des données locales
            events[i].illustration_url_new = publicUrl;

            console.log(`   ✅ Terminé : ${publicUrl}`);

            // Sauvegarde intermédiaire pour ne rien perdre
            fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));

        } catch (err) {
            console.error(`   ❌ Échec pour ${event.titre}:`, err.message);
        }
    }

    // Sauvegarde finale
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
    console.log(`\n🎉 Production terminée ! Fichier mis à jour : ${EVENTS_FILE}`);
}

runProduction();

