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
    const total = events.length;

    let noImg = 0, noDesc = 0, noNot = 0, noType = 0;
    const countries = {};
    const titles = {};

    events.forEach(e => {
        if (!e.illustration_url) noImg++;
        if (!e.description_detaillee) noDesc++;
        if (!e.notoriete) noNot++;
        if (!e.types_evenement || e.types_evenement.length === 0) noType++;

        if (e.pays && Array.isArray(e.pays)) {
            e.pays.forEach(p => countries[p] = (countries[p] || 0) + 1);
        }
        const t = e.titre.toLowerCase().trim();
        titles[t] = (titles[t] || 0) + 1;
    });

    const dupes = Object.entries(titles).filter(([k, v]) => v > 1).map(([k, v]) => k);

    process.stdout.write(`TOTAL:${total}\n`);
    process.stdout.write(`MISS_IMG:${noImg} | MISS_DESC:${noDesc} | MISS_NOT:${noNot} | MISS_TYPE:${noType}\n`);
    process.stdout.write(`DUPES_TITRE:${dupes.length}\n`);
    if (dupes.length > 0) process.stdout.write(`EX_DUPES:${dupes.slice(0, 3).join(', ')}\n`);

    const topC = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 5);
    process.stdout.write(`TOP_PAYS:${topC.map(c => `${c[0]}:${c[1]}`).join(' | ')}\n`);
}

inspectTable();
