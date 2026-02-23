import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkBrokenImages() {
    console.log("🔍 Checking for broken images (FAST)...");

    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, illustration_url')
        .order('updated_at', { ascending: false })
        .limit(10);

    for (const event of events) {
        console.log(`Checking: "${event.titre}"`);
        try {
            await axios.head(event.illustration_url, { timeout: 3000 });
            console.log(`  ✅ OK`);
        } catch (err) {
            console.log(`  ❌ FAILED: ${err.message}`);
        }
    }
}

checkBrokenImages();
