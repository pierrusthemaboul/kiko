import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findDuplicates() {
    const { data: events1 } = await supabase.from('evenements').select('id, titre, date').range(0, 999);
    const { data: events2 } = await supabase.from('evenements').select('id, titre, date').range(1000, 1999);
    const { data: events3 } = await supabase.from('evenements').select('id, titre, date').range(2000, 2999);

    const events = [...(events1 || []), ...(events2 || []), ...(events3 || [])];

    const titleGroups = {};
    events.forEach(e => {
        const t = e.titre.toLowerCase().trim();
        if (!titleGroups[t]) titleGroups[t] = [];
        titleGroups[t].push(e);
    });

    const exactDuplicates = Object.entries(titleGroups).filter(([k, v]) => v.length > 1);

    console.log(`Nombre de titres suspects : ${exactDuplicates.length}`);

    exactDuplicates.slice(0, 20).forEach(([title, occs]) => {
        console.log(`\n"${title}" (${occs.length} fois) :`);
        occs.forEach(o => console.log(`  - ID: ${o.id} | Date: ${o.date}`));
    });
}

findDuplicates();
