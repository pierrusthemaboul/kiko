import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentImages() {
    console.log('📊 Récupération des 6 dernières images générées...\n');

    const { data, error } = await supabase
        .from('goju2')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

    if (error) {
        console.error('❌ Erreur:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️  Aucune image trouvée');
        return;
    }

    console.log(`✅ ${data.length} images trouvées:\n`);

    data.forEach((event, index) => {
        console.log(`${index + 1}. "${event.titre}" (${event.date})`);
        console.log(`   URL: ${event.illustration_url || event.image_url || 'No URL'}`);
        console.log(`   Created: ${event.created_at}`);
        console.log('');
    });
}

checkRecentImages().catch(console.error);
