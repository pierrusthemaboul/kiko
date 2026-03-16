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

async function testDisneyIntelligence() {
    console.log("🚀 TEST D'INTELLIGENCE : Ouverture d'Euro Disney (1992)");
    
    const event = {
        id: "dff20736-2bdd-48fe-a74a-0bc78519b9f1",
        titre: "Ouverture d'Euro Disney",
        date: "1992-04-12",
        description_detaillee: "L'ouverture d'Euro Disney en avril 1992 à Marne-la-Vallée a marqué une étape importante dans l'expansion internationale de la Walt Disney Company, malgré les critiques sur l'impérialisme culturel américain en France."
    };

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const ecoleArt = await fs.readFile(ECOLE_ART_FILE, 'utf-8');

    const prompt = `
    Tu es un COLLECTIF de création (Archiviste, Directeur Artistique, et Critique).
    VOTRE MISSION : Illustrer l'événement "${event.titre}" (${event.date}).
    
    CONTRAINTE DE SÉCURITÉ : ZÉRO LOGO Disney, Zéro Château de la Belle au Bois Dormant, Zéro Mickey.
    OBJECTIF : Capturer l'âme de l'événement (l'américanisation, la magie qui arrive dans la boue de la campagne française).

    RÈGLES ÉCOLE D'ART (V2.2 - Émotion & Lumière) :
    ${ecoleArt}

    Réponds en JSON avec hero_object, thought_process, critic_check, et final_flux_prompt.
    `;

    const result = await model.generateContent(prompt);
    const brain = JSON.parse(result.response.text().replace(/```json|```/g, ''));

    console.log(`\n🧠 PENSÉE DES AGENTS :`);
    console.log(`💡 Objet Hero : ${brain.hero_object}`);
    console.log(`📝 Log : ${brain.thought_process}`);
    console.log(`⚠️ Critique : ${brain.critic_check}`);

    console.log("\n🎨 Génération Flux...");
    const output = await replicate.run("black-forest-labs/flux-schnell", {
        input: { prompt: brain.final_flux_prompt, aspect_ratio: "16:9" }
    });
    const imageUrl = Array.isArray(output) ? output[0] : output;

    console.log(`\n✅ IMAGE TEST GÉNÉRÉE : ${imageUrl}`);
}

testDisneyIntelligence().catch(console.error);
