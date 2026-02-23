import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const getTierProbabilities = (level) => {
    if (level <= 2) return { t1: 0.75, t2: 0.20, t3: 0.05 };
    if (level <= 5) return { t1: 0.60, t2: 0.30, t3: 0.10 };
    if (level <= 10) return { t1: 0.45, t2: 0.40, t3: 0.15 };
    return { t1: 0.20, t2: 0.40, t3: 0.40 };
};

async function run() {
    const { data: events } = await supabase.from('evenements').select('notoriete');
    const levels = [1, 5, 20];

    for (const level of levels) {
        const probs = getTierProbabilities(level);
        console.log(`L${level}: T1:${(probs.t1 * 100).toFixed(0)}% T2:${(probs.t2 * 100).toFixed(0)}% T3:${(probs.t3 * 100).toFixed(0)}%`);
    }
}
run();
