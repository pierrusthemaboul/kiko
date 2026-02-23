import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkLouvre() {
    const title = "Inauguration de la Pyramide du Louvre";
    console.log(`Checking specific event: ${title}`);
    const { data: events, error } = await supabase
        .from('evenements')
        .select('*')
        .ilike('titre', `%${title}%`);

    const event = events[0];
    console.log(`URL: ${event.illustration_url}`);
    try {
        await axios.head(event.illustration_url, { timeout: 5000 });
        console.log(`  ✅ OK`);
    } catch (err) {
        console.log(`  ❌ FAILED: ${err.message}`);
    }
}

checkLouvre();
