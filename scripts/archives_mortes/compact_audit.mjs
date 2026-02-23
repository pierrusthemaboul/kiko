import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectTable() {
    const { data: events } = await supabase.from('evenements').select('*').limit(2600);
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

    const dupes = Object.values(titles).filter(v => v > 1).length;

    console.log(`TOTAL:${total}`);
    console.log(`MISS_IMG:${noImg} | MISS_DESC:${noDesc} | MISS_NOT:${noNot} | MISS_TYPE:${noType}`);
    console.log(`DUPES_TITRE:${dupes}`);

    const topC = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 3);
    console.log(`TOP_PAYS:${topC.map(c => `${c[0]}(${c[1]})`).join(', ')}`);
}

inspectTable();
