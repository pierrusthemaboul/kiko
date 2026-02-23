import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function fixJeudiNoir() {
    const eventId = "f6da1413-2511-4226-b20f-2e0edeb5dc34";
    const newUrl = "https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/honor_mort_du_jeudi_noir_1770550034686.webp";

    console.log(`Fixing Jeudi Noir (ID: ${eventId}) with URL: ${newUrl}`);

    const { error } = await supabase
        .from('evenements')
        .update({ illustration_url: newUrl })
        .eq('id', eventId);

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("✅ Jeudi Noir fixed!");
    }
}

fixJeudiNoir();
