import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixArgentine() {
    const targetId = 'aed6880f-03e0-4685-8aa3-9f6b5b969864'; // ID de l'évènement de 2022
    const newTitle = "L'Argentine de Messi remporte la Coupe du Monde au Qatar";

    const { error } = await supabase
        .from('evenements')
        .update({ titre: newTitle })
        .eq('id', targetId);

    if (error) {
        console.error("❌ Erreur lors de la mise à jour:", error);
    } else {
        console.log(`✅ Succès : Le titre a été mis à jour vers "${newTitle}"`);
    }
}

fixArgentine();
