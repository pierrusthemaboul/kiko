import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanBatch() {
    const orchestratorPath = path.join(__dirname, 'orchestrator_result.json');
    if (!fs.existsSync(orchestratorPath)) {
        console.error('orchestrator_result.json non trouvé');
        return;
    }

    const data = JSON.parse(fs.readFileSync(orchestratorPath, 'utf8'));
    const titles = data.events.map(e => e.titre);

    console.log(`🗑️ Nettoyage des ${titles.length} événements du lot...`);

    for (const title of titles) {
        // Dans queue_sevent
        const { data: q } = await supabase.from('queue_sevent').delete().eq('titre', title).select();
        if (q?.length) console.log(`✅ Supprimé de queue_sevent: ${title}`);

        // Dans goju2
        const { data: g } = await supabase.from('goju2').delete().eq('titre', title).select();
        if (g?.length) console.log(`✅ Supprimé de goju2: ${title}`);
    }

    console.log('✨ Terminé.');
}

cleanBatch();
