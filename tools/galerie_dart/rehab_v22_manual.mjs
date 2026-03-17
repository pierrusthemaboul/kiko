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

const REHAB_REPAIRS = [
    {
        id: "2de5f949-467b-4572-a6d2-d36e45a9a5f9",
        titre: "Réhabilitation de Jeanne d'Arc (1457)",
        prompt: "Ultra extreme close-up on the face of a 15th-century French judge in a gothic cathedral, his expression changing from severity to profound realization/relief. Soft light from high stained-glass windows illuminates the sweat on his brow and the texture of his aged skin. In the lower corner, his hand holds a heavy parchment, but the focus is on his intense, emotional eyes. Rembrandt lighting, cinematic masterpiece, gritty textures, 1024x576."
    },
    {
        id: "f3377637-2192-4c0a-8476-5edd1e9b8999",
        titre: "Concile d’Agde (Gaule wisigothique)",
        prompt: "Dramatically lit scene in a 6th-century rough stone chapel. Close-up on the weathered, sun-beaten hands of three ancient bishops holding flickering tallow candles over a heavy stone baptismal font. The golden light of the candles illuminates their coarse wool robes and the deep cracks in the stone. Atmospheric, sacred, but everything is visible in the warm glow. Cinematic style of Ridley Scott, 1024x576."
    },
    {
        id: "9bf85b52-5bd5-425c-b5c1-b2975d92c687",
        titre: "Traité de Madrid (1526)",
        prompt: "Cinematic shot in 1526. The ornate steel sword of King Francis I of France lies on a dark wooden table in a Spanish prison cell. The bright morning light from a barred window (visible) creates strong, clear reflections on the blade, revealing a faint, distorted reflection of the King's face looking through the window at the sky. A sense of longing and defeat but perfectly visible. High-contrast Rembrandt lighting, gritty and tangible, 1024x576."
    }
];

async function runRehabRepair() {
    console.log("🎨 Exécution de la Réparation 'Emotion & Lumière' (V2.2)...");
    for (const event of REHAB_REPAIRS) {
        console.log(`\n🖌️ Génération V2.2 : ${event.titre}`);
        
        const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: { prompt: event.prompt, aspect_ratio: "16:9" }
        });
        const imageUrl = Array.isArray(output) ? output[0] : output;
        
        const res = await fetch(imageUrl);
        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `rehab_v22_${event.id}_${Date.now()}.webp`;
        
        await supabase.storage.from('evenements-image').upload(fileName, buffer, { contentType: 'image/webp' });
        const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

        await supabase.from('evenements').update({ illustration_url: publicUrl }).eq('id', event.id);

        console.log(`✅ SUCCÈS : ${publicUrl}`);
    }
}

runRehabRepair().catch(console.error);

