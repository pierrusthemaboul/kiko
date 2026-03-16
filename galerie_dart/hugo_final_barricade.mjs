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

async function finalHugoBarricade() {
    console.log("🛠️ Reprise totale de Victor Hugo : Barricade de 1832 sans aucun anachronisme.");

    try {
        const strictPrompt = "Hyper-realistic historical 1832 Paris street. A massive barricade made of wooden barrels, broken wooden horse-carriages, and heavy cobblestones. A faded red flag on top. Cinematic morning sun, rays of light through lingering smoke. Tall, old stone buildings with shutters. ABSOLUTELY NO CARS, NO MODERN VEHICLES, NO ASPHALT, NO TIRES, NO BOOKS. 19th-century masterpiece, oil painting style, vibrant but authentic colors.";
        
        console.log("🎨 Generation...");
        const output = await replicate.run("black-forest-labs/flux-schnell", { 
            input: { prompt: strictPrompt, aspect_ratio: "16:9" } 
        });
        const url = Array.isArray(output) ? output[0] : output;

        const res = await fetch(url);
        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `hugo_perfect_barricade_${Date.now()}.webp`;

        console.log("📤 Upload...");
        const { error: uploadError } = await supabase.storage
            .from('evenements-image')
            .upload(fileName, buffer, { contentType: 'image/webp', upsert: true });

        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

        await supabase.from('evenements').update({ illustration_url: publicUrl }).eq('id', HUGO_ID);

        console.log(`✅ Hugo Success: ${publicUrl}`);
    } catch (e) {
        console.error(e);
    }
}

finalHugoBarricade();
