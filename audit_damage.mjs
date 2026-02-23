import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkChanges() {
    // 2026-02-22T20:47:00Z roughly in local, so let's query a window around then
    const { data } = await supabase.from('evenements').select('id, titre, date, mots_cles, description_detaillee')
        .gte('updated_at', '2026-02-22T19:40:00Z')
        .lte('updated_at', '2026-02-22T19:50:00Z');

    let mismatches = [];
    for (let ev of data) {
        const titleWords = ev.titre.toLowerCase().split(/[ \-\'\(\)\.]+/).filter(w => w.length > 3 && !['les', 'des', 'dans', 'pour', 'avec', 'sur', 'sous', 'vers', 'comme', 'plus', 'entre'].includes(w));
        const desc = ev.description_detaillee ? ev.description_detaillee.toLowerCase() : '';

        let matchCount = 0;
        for (let w of titleWords) {
            if (desc.includes(w)) matchCount++;
        }
        if (titleWords.length > 0 && matchCount === 0) {
            mismatches.push(ev);
        }
    }

    console.log('Total events updated during the translation script:', data.length);
    console.log('Total potential ID mismatches:', mismatches.length);

    for (let m of mismatches.slice(0, 59)) {
        console.log(`[${m.id}] TITLE: ${m.titre} | DATE: ${m.date}`);
        console.log(` DESC: ${m.description_detaillee ? m.description_detaillee.substring(0, 100) : ''}...`);
        console.log('---');
    }
}
checkChanges();
