import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectTable() {
    const { data: events1 } = await supabase.from('evenements').select('*').range(0, 999);
    const { data: events2 } = await supabase.from('evenements').select('*').range(1000, 1999);
    const { data: events3 } = await supabase.from('evenements').select('*').range(2000, 2999);

    const events = [...(events1 || []), ...(events2 || []), ...(events3 || [])];

    const countries = {};
    events.forEach(e => {
        if (e.pays && Array.isArray(e.pays)) {
            e.pays.forEach(p => countries[p] = (countries[p] || 0) + 1);
        }
    });

    const sorted = Object.entries(countries).sort((a, b) => b[1] - a[1]);
    sorted.slice(0, 20).forEach(([p, c]) => {
        console.log(`${p}: ${c}`);
    });
}

inspectTable();
