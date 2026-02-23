import fs from 'fs';
import { getSupabase } from './AGENTS/shared_utils.mjs';

async function pushToQueue() {
    const supabase = getSupabase();
    const data = JSON.parse(fs.readFileSync('./AGENTS/ARTISAN/STORAGE/OUTPUT/artisan_finished_products.json', 'utf8'));

    const titles = data.map(e => e.titre);

    // Clean up existing ones if any
    await supabase.from('queue_sevent').delete().in('titre', titles);

    // Insert new ones
    const rows = data.map(event => ({
        titre: event.titre,
        year: event.year,
        type: event.type,
        region: event.region,
        description: event.description,
        notoriete: event.notoriete,
        status: 'pending'
    }));

    const { error } = await supabase.from('queue_sevent').insert(rows);

    if (error) {
        console.error('Error inserting into queue_sevent:', error);
    } else {
        console.log('✅ queue_sevent updated with Artisans products.');
    }
}

pushToQueue();
