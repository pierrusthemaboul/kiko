import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
    const keywords = ['Mort de', 'Décès de', 'Death of', 'Sacre de', 'Assassinat de'];

    console.log('🔍 Recherche des événements de type \"mort/décès\"...');

    let allToDelete = [];

    for (const kw of keywords) {
        const { data: q } = await supabase.from('queue_sevent').select('id, titre, year').ilike('titre', `%${kw}%`);
        if (q) allToDelete = allToDelete.concat(q.map(e => ({ ...e, table: 'queue_sevent' })));

        const { data: g } = await supabase.from('goju2').select('id, titre, date').ilike('titre', `%${kw}%`);
        if (g) allToDelete = allToDelete.concat(g.map(e => ({ ...e, table: 'goju2' })));
    }

    if (allToDelete.length === 0) {
        console.log('✅ Aucun événement trouvé avec ces mots-clés.');
        return;
    }

    console.log(`\n🗑️ ${allToDelete.length} événements trouvés :`);
    allToDelete.forEach(e => console.log(`- [${e.table}] ${e.titre} (${e.year || e.date})`));

    console.log('\n🚀 Suppression en cours...');

    for (const e of allToDelete) {
        const { error } = await supabase.from(e.table).delete().eq('id', e.id);
        if (error) console.error(`❌ Erreur suppression ${e.id}:`, error.message);
        else console.log(`✅ Supprimé: ${e.titre}`);
    }

    console.log('\n✨ Nettoyage terminé.');
}

clean();
