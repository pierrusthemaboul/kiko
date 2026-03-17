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
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const ENGINE_DIR = __dirname;
const STYLE_GUIDE_FILE = path.join(ENGINE_DIR, 'style_guide.md');
const EVALUATOR_GUIDE_FILE = path.join(ENGINE_DIR, 'agent_evaluator.md');

async function getFileContent(filePath) {
    return await fs.readFile(filePath, 'utf-8');
}

// Phase 1 & 4 : Brainstorming / Debating
async function brainstorm(event, feedback = null) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const styleGuide = await getFileContent(STYLE_GUIDE_FILE);

    let systemPrompt = `
    Tu es un COLLECTIF d'agents (Archiviste, DA, Critique). 
    Évènement : "${event.titre}" (${event.date})
    Description : ${event.description_detaillee}

    ${styleGuide}

    TON BUT : Créer un prompt pour Flux Schnell qui génère une image ICONIQUE, TANGIBLE et DÉPOUILLÉE.
    `;

    if (feedback) {
        systemPrompt += `\n⚠️ ÉCHEC PRÉCÉDENT (Score < 7). 
        CRITIQUE : ${feedback}
        Tu DOIS changer radicalement de stratégie visuelle pour corriger ces points.`;
    }

    const prompt = `
    Réponds uniquement en JSON :
    {
        "strategy": "Quelle métaphore visuelle ?",
        "hero_object": "Objet ou visage central à 40%",
        "flux_prompt": "Prompt détaillé en anglais (Style Rembrandt, Grit, Masterpiece...)"
    }
    `;

    const result = await model.generateContent([systemPrompt, prompt]);
    const cleanJson = result.response.text().replace(/```json|```/g, '');
    return JSON.parse(cleanJson);
}

// Phase 2 : Generation
async function generateImage(prompt) {
    const output = await replicate.run("black-forest-labs/flux-schnell", {
        input: { prompt, aspect_ratio: "16:9" }
    });
    return Array.isArray(output) ? output[0] : output;
}

// Phase 3 & 6 : Evaluation (Vision)
async function evaluateImage(event, imageUrl) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Use 2.0 Flash
    const evaluatorGuide = await getFileContent(EVALUATOR_GUIDE_FILE);
    const styleGuide = await getFileContent(STYLE_GUIDE_FILE);

    const imageRes = await fetch(imageUrl);
    const imageData = await imageRes.arrayBuffer();

    const prompt = `
    Évènement : "${event.titre}" (${event.date})
    ${evaluatorGuide}
    ---
    STYLE GUIDE : ${styleGuide}
    
    Analyse l'image jointe et donne ton verdict JSON.
    `;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: Buffer.from(imageData).toString('base64'),
                mimeType: 'image/webp'
            }
        }
    ]);

    const cleanJson = result.response.text().replace(/```json|```/g, '');
    return JSON.parse(cleanJson);
}

// Main Loop logic
async function processEvent(event) {
    console.log(`\n🚀 [BOUCLE RÉFLEXIVE] Début : ${event.titre}`);
    
    // Essai 1
    let brain = await brainstorm(event);
    console.log(`💡 Stratégie V1 : ${brain.strategy}`);
    let urlV1 = await generateImage(brain.flux_prompt);
    let evalV1 = await evaluateImage(event, urlV1);
    
    console.log(`⭐️ Score V1 : ${evalV1.score_total}/10 (Scannabilité: ${evalV1.scannability})`);

    let finalUrl = urlV1;
    let finalScore = evalV1.score_total;

    if (evalV1.score_total < 7) {
        console.log(`⚠️ Score insuffisant. Tentative de correction...`);
        console.log(`🔧 Feedback : ${evalV1.feedback_critique}`);
        
        // Essai 2
        let brainV2 = await brainstorm(event, evalV1.feedback_critique);
        console.log(`💡 Stratégie V2 : ${brainV2.strategy}`);
        let urlV2 = await generateImage(brainV2.flux_prompt);
        let evalV2 = await evaluateImage(event, urlV2);
        
        console.log(`⭐️ Score V2 : ${evalV2.score_total}/10`);
        
        if (evalV2.score_total >= evalV1.score_total) {
            console.log("✅ V2 est meilleure (ou égale), on la garde.");
            finalUrl = urlV2;
            finalScore = evalV2.score_total;
        } else {
            console.log("❌ V2 est moins bonne, on garde V1.");
            finalUrl = urlV1;
            finalScore = evalV1.score_total;
        }
    } else {
        console.log("🔥 Score suffisant dès le premier coup !");
    }

    // Upload & DB
    console.log("☁️ Upload Final...");
    const res = await fetch(finalUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const fileName = `reflex_v3_${event.id}_${Date.now()}.webp`;
    await supabase.storage.from('evenements-image').upload(fileName, buffer, { contentType: 'image/webp' });
    const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

    await supabase.from('evenements').update({ illustration_url: publicUrl }).eq('id', event.id);
    
    return { titre: event.titre, url: publicUrl, score: finalScore };
}

// Launcher
async function runEngine(count = 1) {
    const targets = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'reparation_targets.json'), 'utf-8'));
    // On commence après les batchs précédents (indices 30+)
    const startIdx = 30;
    const lot = targets.slice(startIdx, startIdx + count);
    
    const summary = [];
    for (const event of lot) {
        try {
            const result = await processEvent(event);
            summary.push(result);
        } catch (e) {
            console.error(`❌ Erreur sur ${event.titre}:`, e.message);
        }
    }
    console.table(summary);
}

runEngine(parseInt(process.argv[2]) || 1).catch(console.error);

