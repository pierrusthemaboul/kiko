
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || 'http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectQueue() {
    const { data, error } = await supabase.from('queue_sevent').select('*');
    if (error) {
        console.error('Erreur:', error);
        return;
    }
    console.log(`Nombre d'événements dans la queue: ${data.length}`);
    const stats = {
        pending: data.filter(e => e.status === 'pending').length,
        processed: data.filter(e => e.status === 'processed').length,
        error: data.filter(e => e.status === 'error').length
    };
    console.log('Stats:', stats);
    if (data.length > 0) {
        console.log('\nExemple (premier pending):');
        console.log(data.find(e => e.status === 'pending') || data[0]);
    }
}

inspectQueue();
