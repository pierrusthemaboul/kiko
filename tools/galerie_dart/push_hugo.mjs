import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const HUGO_FILE = path.join(__dirname, 'publication_de_les_mis_rables_de_victor_hugo_cbd5ab74-9245-4259-a2a9-4b07e932dc08.png');
const HUGO_ID = "cbd5ab74-9245-4259-a2a9-4b07e932dc08";

async function pushHugo() {
    console.log("🚀 Envoi de la correction Hugo en production...");
    
    try {
        const fileBuffer = await fs.readFile(HUGO_FILE);
        const fileName = `migrated_victor_hugo_les_miserables_${Date.now()}.webp`;

        const { error: uploadError } = await supabase.storage
            .from('evenements-image')
            .upload(fileName, fileBuffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

        const { error: updateError } = await supabase
            .from('evenements')
            .update({ illustration_url: publicUrl })
            .eq('id', HUGO_ID);

        if (updateError) throw updateError;

        console.log(`✅ Hugo est ENFIN en production : ${publicUrl}`);
    } catch (e) {
        console.error("❌ Erreur Hugo:", e.message);
    }
}

pushHugo();

