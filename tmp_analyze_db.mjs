import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'admin_web', '.env.local') });
dotenv.config({ path: path.join(__dirname, 'credentials', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

console.log("URL:", supabaseUrl ? "OK" : "MISSING", "Key:", serviceKey ? "OK" : "MISSING");

const supabase = createClient(supabaseUrl, serviceKey);

async function analyze() {
    console.log("📊 ANALYSE DE LA NOTORIÉTÉ 📊\n");

    let allEvents = [];
    let fetchHasMore = true;
    let offset = 0;
    const PAGE_SIZE = 1000;

    while (fetchHasMore) {
        const { data, error } = await supabase
            .from('evenements')
            .select('titre, notoriete_fr')
            .range(offset, offset + PAGE_SIZE - 1);
        
        if (error) {
            console.error("Erreur de récupération:", error);
            return;
        }

        if (data && data.length > 0) {
            allEvents = allEvents.concat(data);
            offset += PAGE_SIZE;
            if (data.length < PAGE_SIZE) fetchHasMore = false;
        } else {
            fetchHasMore = false;
        }
    }

    const total = allEvents.length;
    console.log(`Nombre total d'événements: ${total}\n`);

    // Répartition par déciles / tranches
    let tranche90_100 = 0;
    let tranche80_89 = 0;
    let tranche60_79 = 0;
    let tranche40_59 = 0;
    let tranche0_39 = 0;

    let sample90 = [];
    let sample70 = [];
    let sample40 = [];

    for (const ev of allEvents) {
        if (ev.notoriete_fr >= 90) {
            tranche90_100++;
            if (sample90.length < 5) sample90.push(`[${ev.notoriete_fr}] ${ev.titre}`);
        }
        else if (ev.notoriete_fr >= 80) { tranche80_89++; }
        else if (ev.notoriete_fr >= 60) {
            tranche60_79++;
            if (sample70.length < 5 && ev.notoriete_fr >= 68 && ev.notoriete_fr <= 72) sample70.push(`[${ev.notoriete_fr}] ${ev.titre}`);
        }
        else if (ev.notoriete_fr >= 40) { 
            tranche40_59++; 
            if (sample40.length < 5 && ev.notoriete_fr >= 40 && ev.notoriete_fr <= 45) sample40.push(`[${ev.notoriete_fr}] ${ev.titre}`);
        }
        else { tranche0_39++; }
    }

    console.log(`📈 DISTRIBUTION :`);
    console.log(`- Incontournables (>90) : ${tranche90_100} (${((tranche90_100/total)*100).toFixed(1)}%)`);
    console.log(`- Très connus (80-89)  : ${tranche80_89} (${((tranche80_89/total)*100).toFixed(1)}%)`);
    console.log(`- Marquants (60-79)     : ${tranche60_79} (${((tranche60_79/total)*100).toFixed(1)}%)`);
    console.log(`- Amateurs (40-59)      : ${tranche40_59} (${((tranche40_59/total)*100).toFixed(1)}%)`);
    console.log(`- Niche/Détail (<40)    : ${tranche0_39} (${((tranche0_39/total)*100).toFixed(1)}%)`);
    
    console.log(`\n🔍 ÉCHANTILLON SUPER-INCONTOURNABLE (>90) :`);
    sample90.forEach(s => console.log(s));

    console.log(`\n🔍 ÉCHANTILLON MARQUANT (~70) :`);
    sample70.forEach(s => console.log(s));

    console.log(`\n🔍 ÉCHANTILLON NICHE (~40) :`);
    sample40.forEach(s => console.log(s));
}

analyze();
