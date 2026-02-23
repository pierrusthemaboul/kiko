import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTigerAndQueue() {
    // 1. Réinjecter Tiger Woods 1997 avec le bon prompt multi-éthnique
    const { data: evC } = await supabase.from('evenements').select('*').eq('id', '24caa122-92d7-4d3d-9d43-a579a8b4b29a').single();
    if (evC) {
        const truePrompt = "An African-American professional golfer seen from behind, wearing a signature red polo shirt and dark pants, raising his arms in sheer victory on a vibrant green golf course. Golden hour lighting, highly detailed textures, massive spectator crowd in the background.";
        await supabase.from('evenements').update({ description_flux: truePrompt }).eq('id', evC.id);

        // On le remet en file d'attente
        await supabase.from('queue_sevent').insert([{
            titre: "Tiger Woods remporte le Masters d'Augusta",
            year: 1997,
            type: ['Sport'],
            region: 'États-Unis',
            description: truePrompt,
            specific_location: evC.description_detaillee,
            status: 'pending',
            error_log: `ORIGINAL_UUID:${evC.id}`
        }]);
        console.log("✅ Vrai événement Tiger Woods réinjecté avec la couleur de peau correcte.");
    }
}
fixTigerAndQueue();
