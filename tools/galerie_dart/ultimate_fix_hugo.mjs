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

const HUGO_ID = "cbd5ab74-9245-4259-a2a9-4b07e932dc08";

async function ultimateHugoFix() {
    console.log("🔥 ULTIMATE FIX POUR VICTOR HUGO (Barricade épique, Zéro anachronisme, Zéro livre)...");

    try {
        // Prompt ULTRA-SÉCURISÉ pour éviter les voitures et les livres
        const strictPrompt = "Epic cinematic 19th-century historical painting. A massive revolutionary barricade constructed from wooden carts, barrels, and cobblestones blocking a narrow, winding street in 1830s Paris. Faint smoke in the air, dramatic sunbeams piercing through the haze. A single tattered red flag stands tall atop the debris. No modern vehicles, no cars, no pavement, no books, no text. Saturated colors, high contrast, sharp focus on the textures of wood and stone. Masterpiece quality.";
        
        console.log("🎨 Envoi du prompt à Flux Schnell...");
        const output = await replicate.run("black-forest-labs/flux-schnell", { 
            input: { prompt: strictPrompt, aspect_ratio: "16:9" } 
        });
        const url = Array.isArray(output) ? output[0] : output;

        const res = await fetch(url);
        const buffer = Buffer.from(await res.arrayBuffer());
        // Nom unique pour casser le cache DNS/CDN
        const fileName = `hugo_barricade_ultimate_${Date.now()}.webp`;

        console.log("📤 Upload vers Supabase...");
        const { error: uploadError } = await supabase.storage
            .from('evenements-image')
            .upload(fileName, buffer, { contentType: 'image/png', upsert: true });

        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

        console.log("📝 Mise à jour DB...");
        await supabase.from('evenements').update({ illustration_url: publicUrl }).eq('id', HUGO_ID);

        console.log(`✅ Victor Hugo est ENFIN impeccable : ${publicUrl}`);
    } catch (e) {
        console.error("❌ Erreur pendant le sauvetage de Hugo:", e.message);
    }
}

ultimateHugoFix();

