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

async function secureHugoFix() {
    console.log("🔥 FIX DÉFINITIF VICTOR HUGO (Barricade, Zéro voitures, Zéro livres)...");

    try {
        const strictPrompt = "High-quality 19th-century historical cinematic painting. A massive barricade built from wooden carts, barrels, and cobblestones in a narrow street of old Paris (1832). Atmospheric foggy morning, sun rays piercing through the mist. Authentic textures of old wood and wet stone. NO MODERN VEHICLES, NO CARS, NO BOOKS, NO TEXT. Pure historical atmosphere, dramatic lighting, vibrant colors. Epic masterpiece.";
        
        console.log("🎨 Flux Schnell generation...");
        const output = await replicate.run("black-forest-labs/flux-schnell", { 
            input: { prompt: strictPrompt, aspect_ratio: "16:9" } 
        });
        const url = Array.isArray(output) ? output[0] : output;

        const res = await fetch(url);
        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `hugo_barricade_fix_final_${Date.now()}_v10.webp`;

        console.log("📤 Uploading...");
        const { error: uploadError } = await supabase.storage
            .from('evenements-image')
            .upload(fileName, buffer, { contentType: 'image/webp', upsert: true });

        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

        console.log("📝 DB Update...");
        await supabase.from('evenements').update({ illustration_url: publicUrl }).eq('id', HUGO_ID);

        console.log(`✅ Victor Hugo SUCCESS: ${publicUrl}`);
    } catch (e) {
        console.error("❌ Fatal Error:", e.message);
    }
}

secureHugoFix();

