import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findDuplicates() {
    const { data: events } = await supabase.from('evenements').select('id, titre, date');
    const counts = {};
    events.forEach(e => {
        const t = e.titre.toLowerCase().trim();
        counts[t] = (counts[t] || 0) + 1;
    });
    const dupes = Object.entries(counts).filter(([k, v]) => v > 1);
    console.log('Doublons trouvés (' + dupes.length + ') :');
    dupes.forEach(([k, v]) => console.log(`- ${k} (${v} fois)`));
}
findDuplicates();
