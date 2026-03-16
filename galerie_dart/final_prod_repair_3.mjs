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
        uuid: "7a07b33e-c64e-45fa-8874-e4e9a73b75cc",
        titre: "Loi Copé-Zimmermann quotas de genre",
        prompt: "Cinematic close-up on the face of a determined woman leader in 2011, her eyes reflect the lights of a modern boardroom. She is surrounded by out-of-focus powerful men. A single, harsh light highlights her face, capturing the weight of the moment and her leadership. 1970s film grain, moody atmosphere, sharp focus, 1024x576."
    },
    {
        uuid: "c08b87bb-afd5-4a7d-898b-9a492a015663",
        titre: "Télégraphe optique Claude Chappe",
        prompt: "Wide epic shot of an 18th century semaphore tower on a stormy hill in 1793. Flash of lightning in the dark clouds. The mechanical arms are massive and imposing. Gritty texture, wind-swept landscape. No people, only the machine's dramatic silhouette. 1024x576."
    },
    {
        uuid: "6c796526-b920-4df3-b3ff-abc9610baf20",
        titre: "Accords de Grenelle formation continue",
        prompt: "Cinematic extreme close-up of a French industrial worker's face in 1972. Sweat on forehead, tired but hopeful eyes. Behind him, a blurred technical poster on the factory wall. Harsh industrial lighting, 1970s color palette (mustard and teal). Deep empathy and social tension. 1024x576."
    }
];

async function fixAndUpload() {
    for (const repair of REPAIRS) {
        console.log(`\n🖌️ Génération : ${repair.titre}`);
        
        const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: { prompt: repair.prompt, aspect_ratio: "16:9" }
        });
        const imageUrl = Array.isArray(output) ? output[0] : output;
        
        console.log("☁️ Upload vers Supabase...");
        const res = await fetch(imageUrl);
        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `fix_produit_${repair.uuid}_${Date.now()}.webp`;
        
        const { data, error: uploadError } = await supabase.storage
            .from('evenements-image')
            .upload(fileName, buffer, { contentType: 'image/webp' });

        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

        console.log("🗄️ Mise à jour DB...");
        const { error: dbError } = await supabase
            .from('evenements')
            .update({ illustration_url: publicUrl })
            .eq('id', repair.uuid);

        if (dbError) throw dbError;

        console.log(`✅ SUCCÈS : ${publicUrl}`);
    }
}

fixAndUpload().catch(console.error);
