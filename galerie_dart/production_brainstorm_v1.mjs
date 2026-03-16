import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const ECOLE_ART_FILE = path.join(__dirname, 'ecole_d_art_essentiels.md');
const TARGETS_FILE = path.join(__dirname, 'reparation_targets.json');

async function brainstormProduction(event) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const ecoleArt = await fs.readFile(ECOLE_ART_FILE, 'utf-8');

    const yearStr = event.date.split('-')[0];
    const year = parseInt(yearStr);
    const noPlasticRule = year < 1920 ? "STRICT BAN on modern plastics, polymer glasses, and modern textures. Use wood, metal, glass, and period-accurate fabrics." : "";

    const prompt = `
    Tu es un COLLECTIF de création de haut niveau (Archiviste, Directeur Artistique, et Critique).
    VOTRE MISSION : Créer une illustration ICONIQUE et RECONNAISSABLE pour l'événement : "${event.titre}".
    DATE : ${event.date}
    DESCRIPTION : ${event.description_detaillee}

    RÈGLES D'OR (STRICT V2.1) :
    ${ecoleArt}
    ${noPlasticRule}

    PROCESSUS DE RÉFLEXION :
    1. **Archiviste** : Identifie l'OBJET-SIGNATURE ou le SYMBOLE MATÉRIEL de l'événement. Décris ses textures techniques (ex: grain du papier, type de cire, métal martelé).
    2. **Directeur Artistique** : Place cet objet au centre d'une mise en scène dramatique. Utilise la métonymie (l'objet représente le tout). ÉVITE LES RÉUNIONS ET LES GENS ASSIS.
    3. **Critique** : Vérifie la scannabilité. Si on enlève le titre, est-ce qu'on comprend ? Exige un cadrage serré sur l'objet HERO (40% du cadre).
    
    4. **PROMPT FINAL** : Rédige le prompt Flux Schnell en ANGLAIS. Commence par la distance de caméra et le sujet principal. 
    INCLUSION OBLIGATOIRE : "masterpiece, hyper-realistic, 8k, cinematic lighting, dramatic shadows, tangible textures".

    Format de réponse JSON strict :
    {
        "hero_object": "votre objet signature",
        "thought_process": "...",
        "critic_check": "...",
        "final_flux_prompt": "..."
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON non trouvé dans la réponse Gemini");
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error(`❌ Erreur Brainstorm Gemini pour ${event.titre}:`, e.message);
        return null;
    }
}

async function runBatch(startIndex, batchSize) {
    console.log(`🚀 Démarrage du Batch PRODUCTION [Indices ${startIndex} à ${startIndex + batchSize - 1}]...`);
    const allTargets = JSON.parse(await fs.readFile(TARGETS_FILE, 'utf-8'));
    const targets = allTargets.slice(startIndex, startIndex + batchSize);
    
    const results = [];

    for (const event of targets) {
        console.log(`\n--- 🧪 Traitement : ${event.titre} ---`);
        const brain = await brainstormProduction(event);
        if (!brain) continue;

        console.log(`💡 Objet Hero : ${brain.hero_object}`);
        console.log(`⚠️ Critique : ${brain.critic_check}`);

        try {
            console.log("🎨 Génération Replicate...");
            const output = await replicate.run("black-forest-labs/flux-schnell", {
                input: { prompt: brain.final_flux_prompt, aspect_ratio: "16:9" }
            });
            const imageUrl = Array.isArray(output) ? output[0] : output;

            console.log("☁️ Upload Supabase...");
            const fetchRes = await fetch(imageUrl);
            const buffer = Buffer.from(await fetchRes.arrayBuffer());
            const fileName = `target_fix_${event.id}_${Date.now()}.webp`;

            const { error: uploadError } = await supabase.storage
                .from('evenements-image')
                .upload(fileName, buffer, { contentType: 'image/webp' });

            if (uploadError) throw uploadError;

            const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

            console.log("🗄️ Mise à jour DB...");
            const { error: dbError } = await supabase
                .from('evenements')
                .update({ illustration_url: publicUrl })
                .eq('id', event.id);

            if (dbError) throw dbError;

            console.log(`✅ SUCCÈS : ${event.titre} -> ${publicUrl}`);
            results.push({ titre: event.titre, url: publicUrl, hero: brain.hero_object });

        } catch (e) {
            console.error(`❌ ÉCHEC pour ${event.titre}:`, e.message);
        }
    }

    console.log(`\n📊 RÉSUMÉ DU BATCH [${startIndex}-${startIndex+batchSize}] terminer.`);
    console.table(results);
}

// On peut lancer le premier lot de 10
const args = process.argv.slice(2);
const start = parseInt(args[0]) || 0;
const size = parseInt(args[1]) || 5;

runBatch(start, size).catch(console.error);
