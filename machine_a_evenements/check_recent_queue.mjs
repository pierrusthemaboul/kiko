import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentQueue() {
    const { data: events, error } = await supabase
        .from('queue_sevent')
        .select('titre, date_formatee, notoriete_fr, description_detaillee')
        .order('id', { ascending: false })
        .limit(11);

    if (error) {
        console.error("❌ Erreur Supabase:", error.message);
        return;
    }

    console.log(`\n🎉 Voici les ${events.length} événements fraîchement générés :`);
    console.log("=".repeat(80));

    events.reverse().forEach((ev, i) => {
        console.log(`\n${i + 1}. [${ev.date_formatee}] ${ev.titre} (⭐ ${ev.notoriete_fr})`);
        console.log(`   📝 Description : ${ev.description_detaillee}`);
    });
    console.log("\n" + "=".repeat(80));
}

checkRecentQueue();
