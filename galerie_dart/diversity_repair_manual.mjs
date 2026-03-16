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

const DIVERSITY_REPAIRS = [
    {
        id: "2de5f949-467b-4572-a6d2-d36e45a9a5f9",
        titre: "Réhabilitation de Jeanne d'Arc",
        prompt: "Cinematic close-up of Joan of Arc's famous white silk banner with gold fleurs-de-lys, tattered and stained with battlefield mud, lying across a cold stone floor in a 1457 cathedral. A single divine ray of light illuminates the silk. No people, no parchment, no seals. Moody, gritty historical realism, 1024x576."
    },
    {
        id: "f3377637-2192-4c0a-8476-5edd1e9b8999",
        titre: "Concile d’Agde (Gaule wisigothique)",
        prompt: "Atmospheric shot inside a dark, ancient 6th-century Wisigothic stone church. The distinct elongated shadow of a bishop's mitre is cast against a jagged stone wall by a single flickering oil lamp. Rough ancient textures, mysterious and silent atmosphere. No paper, no wax seals. Historical accuracy, 1024x576."
    },
    {
        id: "9bf85b52-5bd5-425c-b5c1-b2975d92c687",
        titre: "Traité de Madrid (Libération de François Ier)",
        prompt: "Powerful cinematic shot in 1526. The ornate steel sword of King Francis I of France lies abandoned on a dark wooden table in a Spanish prison cell. The cold light from a barred window reflects on the blade. In the background, heavy iron chains. Symbol of defeat and captivity. No parchment, no seals. High contrast, gritty, 1024x576."
    }
];

async function runDiversityRepair() {
    console.log("🎨 Exécution de la Réparation 'Diversité Visuelle'...");
    for (const event of DIVERSITY_REPAIRS) {
        console.log(`\n🖌️ Génération alternative : ${event.titre}`);
        
        const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: { prompt: event.prompt, aspect_ratio: "16:9" }
        });
        const imageUrl = Array.isArray(output) ? output[0] : output;
        
        const res = await fetch(imageUrl);
        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `diversity_fix_${event.id}_${Date.now()}.webp`;
        
        await supabase.storage.from('evenements-image').upload(fileName, buffer, { contentType: 'image/webp' });
        const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

        await supabase.from('evenements').update({ illustration_url: publicUrl }).eq('id', event.id);

        console.log(`✅ SUCCÈS : ${publicUrl}`);
    }
}

runDiversityRepair().catch(console.error);
