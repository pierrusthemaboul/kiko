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

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const REPAIRS = [
    {
        uuid: "c08b87bb-afd5-4a7d-898b-9a492a015663",
        titre: "Télégraphe Chappe (Intensité 1793)",
        prompt: "Cinematic medium shot of a rugged 18th-century French telegraph operator, his skin sweaty and grimy, pulling with all his might on heavy hemp ropes in a dark wooden tower. In the blurred background, the massive black wooden arms of the Chappe semaphore are moving. The lighting is cold, stormy, and dramatic. Gritty historical realism, rich textures of old wood and rough fabric. Masterpiece, 1024x576."
    },
    {
        uuid: "7a07b33e-c64e-45fa-8874-e4e9a73b75cc",
        titre: "Loi Copé-Zimmermann (Victoire 2011)",
        prompt: "Cinematic shot of a group of 3 powerful women in sharp, modern business suits, walking with immense confidence and a smile of victory through a high-end futuristic glass corridor in 2011. Their silhouettes reflect on the polished floor. Sharp corporate lighting, blue and silver tones. In the background, a massive empty boardroom is visible. It represents the triumph of female leadership. Sharp focus, masterpiece, 1024x576."
    }
];

async function finalTest() {
    for (const repair of REPAIRS) {
        console.log(`\n🖌️ Génération V3 : ${repair.titre}`);
        
        const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: { prompt: repair.prompt, aspect_ratio: "16:9" }
        });
        const imageUrl = Array.isArray(output) ? output[0] : output;
        
        const res = await fetch(imageUrl);
        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `ultimate_fix_${repair.uuid}_${Date.now()}.webp`;
        
        await supabase.storage.from('evenements-image').upload(fileName, buffer, { contentType: 'image/webp' });
        const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

        await supabase.from('evenements').update({ illustration_url: publicUrl }).eq('id', repair.uuid);

        console.log(`✅ DISPONIBLE : ${publicUrl}`);
    }
}

finalTest().catch(console.error);
