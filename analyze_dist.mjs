
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY'; // Use the secret key provided by user

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function analyze() {
    console.log('--- Analyse de la table evenements ---');
    const { data, error } = await supabase.from('evenements').select('notoriete, id');

    if (error) {
        console.error('Erreur Supabase:', error);
        return;
    }

    const total = data.length;
    const dist = data.reduce((acc, e) => {
        const n = e.notoriete ?? 0;
        const tier = n >= 75 ? 'T1 Star (>=75)' : n >= 50 ? 'T2 Classic (50-74)' : 'T3 Expert (<50)';
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
    }, {});

    console.log(`Total événements : ${total}`);
    Object.entries(dist).sort().forEach(([tier, count]) => {
        const pct = ((count / total) * 100).toFixed(1);
        console.log(`${tier} : ${count} (${pct}%)`);
    });

    console.log('\n--- Analyse de user_event_usage ---');
    const { count: usageCount, error: usageError } = await supabase
        .from('user_event_usage')
        .select('*', { count: 'exact', head: true });

    if (usageError) {
        console.error('Erreur Usage:', usageError);
    } else {
        console.log(`Nombre total d'enregistrements d'usage : ${usageCount}`);
    }
}

analyze();
