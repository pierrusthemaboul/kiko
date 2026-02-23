import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAll59() {
    const { data } = await supabase.from('evenements').select('id, titre, date, description_detaillee')
        .gte('updated_at', '2026-02-22T19:40:00Z')
        .lte('updated_at', '2026-02-22T19:50:00Z');

    console.log('Total:', data.length);
    for (let m of data) {
        console.log(`[${m.id}] DATE: ${m.date}`);
        console.log(`   TITL: ${m.titre}`);
        const desc = m.description_detaillee ? m.description_detaillee.replace(/\n/g, ' ').substring(0, 100) : '';
        console.log(`   DESC: ${desc}...`);
        console.log('---');
    }
}
checkAll59();
