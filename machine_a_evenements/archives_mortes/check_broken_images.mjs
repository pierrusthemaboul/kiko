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
    console.log("🔍 Checking for broken images in the database...");

    // Get the last 50 updated events
    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, illustration_url')
        .order('updated_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching events:", error.message);
        return;
    }

    console.log(`Checking ${events.length} events...`);

    for (const event of events) {
        if (!event.illustration_url) {
            console.log(`❌ NO URL: "${event.titre}" (${event.id})`);
            continue;
        }

        try {
            const response = await axios.head(event.illustration_url);
            if (response.status !== 200) {
                console.log(`❌ BROKEN (${response.status}): "${event.titre}" -> ${event.illustration_url}`);
            }
        } catch (err) {
            console.log(`❌ FAILED (${err.response?.status || err.message}): "${event.titre}" -> ${event.illustration_url}`);
        }
    }

    console.log("Scan complete.");
}

checkBrokenImages();
