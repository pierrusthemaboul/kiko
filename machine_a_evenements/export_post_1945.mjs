import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function exportPostWar() {
    const { data, error } = await supabase
        .from('evenements')
        .select('id, titre, date, description_detaillee')
        .gte('date', '1945-01-01')
        .order('date', { ascending: true });

    if (error) {
        console.error('Error fetching:', error);
    } else {
        const filePath = path.join(__dirname, 'post_1945_events.json');
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`✅ ${data.length} événements exportés vers ${filePath}`);
    }
}

exportPostWar();
