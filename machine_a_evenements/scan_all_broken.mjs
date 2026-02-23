import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function scanAllBroken() {
    console.log("🔍 Scanning ALL events for broken images (with pagination)...");

    let allBroken = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;
    let totalChecked = 0;

    while (hasMore) {
        const { data: events, error } = await supabase
            .from('evenements')
            .select('id, titre, illustration_url')
            .order('id') // Consistent ordering for range
            .range(from, from + step - 1);

        if (error) {
            console.error("Error fetching batch:", error.message);
            break;
        }

        if (!events || events.length === 0) break;

        console.log(`Checking batch: records ${from} to ${from + events.length - 1}...`);

        const batchSize = 30; // Parallel checks
        for (let i = 0; i < events.length; i += batchSize) {
            const chunk = events.slice(i, i + batchSize);
            await Promise.all(chunk.map(async (event) => {
                totalChecked++;
                if (!event.illustration_url) {
                    console.log(`❌ NO URL: "${event.titre}" (${event.id})`);
                    allBroken.push(event);
                    return;
                }
                try {
                    await axios.head(event.illustration_url, { timeout: 4000 });
                } catch (err) {
                    // Check if it's a real 404/403 or just a timeout
                    const status = err.response?.status;
                    if (status === 404 || status === 403) {
                        console.log(`❌ BROKEN (${status}): "${event.titre}" -> ${event.illustration_url}`);
                        allBroken.push(event);
                    } else {
                        // console.log(`⚠️ TIMEOUT/OTHER (${err.message}): "${event.titre}"`);
                    }
                }
            }));
            if ((totalChecked % 100) === 0) console.log(`  Progress: ${totalChecked} checked...`);
        }

        if (events.length < step) hasMore = false;
        else from += step;
    }

    console.log(`\n✨ Scan finished.`);
    console.log(`📊 Total checked: ${totalChecked}`);
    console.log(`📊 Broken images found: ${allBroken.length}`);

    if (allBroken.length > 0) {
        console.log("\nList of items to fix:");
        allBroken.forEach(item => console.log(`- [${item.id}] ${item.titre}`));
    }
}

scanAllBroken();
