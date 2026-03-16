import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const ECOLE_ART_FILE = path.join(__dirname, 'ecole_d_art.md');
const HUGO_ID = "cbd5ab74-9245-4259-a2a9-4b07e932dc08";

async function fixHugoFinal() {
    console.log("📚 Sauvetage final de Victor Hugo (Exit le livre, bonjour l'épopée)...");

    try {
        const ecoleArt = await fs.readFile(ECOLE_ART_FILE, 'utf-8');
        
        // On contourne les agents pour donner une instruction ULTRA PRÉCISE
        // Car l'IA galère avec les titres de livres. On va demander une scène.
        const manualConcept = "A cinematic wide shot of Gavroche, a young Parisian street urchin, standing defiantly on top of a massive barricade of cobblestones and wooden carts in a 19th-century Paris street. Bright midday sun, cinematic lighting, vibrant but historically accurate colors. No text, no books. The essence of revolutionary hope and sacrifice.";
        
        const finalPromptResult = await genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash", 
            systemInstruction: `Tu es un Peintre Expert. RÈGLES ÉCOLE D'ART :\n${ecoleArt}`
        }).generateContent(`Construis le prompt final pour FLUX basé sur ce concept : ${manualConcept}.\nSTRICTEMENT AUCUN TEXTE SUR L'IMAGE. FOCUS SUR L'ÉMOTION ET LA LUMIÈRE.`);

        const promptText = await finalPromptResult.response.text();
        const promptMatch = promptText.match(/<prompt>([\s\S]*?)<\/prompt>/i);
        const fluxPrompt = promptMatch ? promptMatch[1].trim() : promptText;

        console.log("🎨 Nouveau Prompt Flux :", fluxPrompt);

        const output = await replicate.run("black-forest-labs/flux-schnell", { 
            input: { prompt: fluxPrompt, aspect_ratio: "16:9" } 
        });
        const url = Array.isArray(output) ? output[0] : output;

        const res = await fetch(url);
        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `final_hugo_les_miserables_${Date.now()}.webp`;

        console.log("📤 Upload et mise à jour DB...");
        const { error: uploadError } = await supabase.storage
            .from('evenements-image')
            .upload(fileName, buffer, { contentType: 'image/png', upsert: true });

        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

        await supabase.from('evenements').update({ illustration_url: publicUrl }).eq('id', HUGO_ID);

        console.log(`✅ Victor Hugo est sauvé : ${publicUrl}`);
    } catch (e) {
        console.error(e);
    }
}

fixHugoFinal();
