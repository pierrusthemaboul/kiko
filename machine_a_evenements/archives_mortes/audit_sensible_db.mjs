import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// On teste d'abord le local, puis la prod si configurée
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function audit() {
    const people = [
        'Macron', 'Le Pen', 'Bardella', 'Mélenchon', 'Trump', 'Biden', 'Obama',
        'Poutine', 'Putin', 'Zelensky', 'Netanyahou', 'Kim Jong', 'Xi Jinping'
    ];

    const sensitive = [
        'cadavre', 'sang', 'massacre', 'attentat', 'terrorisme',
        'exécution', 'torture', 'suicide', 'viol', 'pédophilie'
    ];

    const specific = ['Picasso'];

    console.log(`🔍 Audit de la table "evenements" sur ${supabaseUrl}...`);

    let results = [];

    // Recherche des personnalités
    for (const person of people) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, description, date_ev')
            .or(`titre.ilike.%${person}%,description.ilike.%${person}%`);

        if (data && data.length > 0) {
            data.forEach(item => results.push({ ...item, reason: `Personnalité: ${person}` }));
        }
    }

    // Recherche des termes sensibles
    for (const term of sensitive) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, description, date_ev')
            .or(`titre.ilike.%${term}%,description.ilike.%${term}%`);

        if (data && data.length > 0) {
            data.forEach(item => results.push({ ...item, reason: `Terme sensible: ${term}` }));
        }
    }

    // Recherche spécifique Picasso
    for (const spec of specific) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, description, date_ev')
            .ilike('titre', `%${spec}%`);

        if (data && data.length > 0) {
            data.forEach(item => results.push({ ...item, reason: `Recherche spécifique: ${spec}` }));
        }
    }

    // Déduplication
    const uniqueResults = Array.from(new Map(results.map(item => [item.id, item])).values());

    if (uniqueResults.length === 0) {
        console.log('✅ Aucun événement sensible trouvé.');
        return;
    }

    console.log(`\n⚠️  ${uniqueResults.length} événements potentiellement problématiques trouvés :\n`);

    uniqueResults.forEach((item, index) => {
        console.log(`${index + 1}. [${item.id}] ${item.titre} (${item.date_ev})`);
        console.log(`   Raison: ${item.reason}`);
        console.log(`   Description: ${item.description.substring(0, 100)}...`);
        console.log('---');
    });

    console.log('\nAudit terminé.');
}

audit();
