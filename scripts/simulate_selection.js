
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', 'sb_secret_FVCBjr7eTZDVhRM1HALgKQ_q1p1T6QK');

const TIER_THRESHOLDS = {
    TIER_1_STAR: 75,
    TIER_2_CLASSIC: 50
};

function getTierProbabilities(level) {
    if (level <= 2) return { t1: 0.9, t2: 0.1, t3: 0.0 };
    if (level <= 5) return { t1: 0.7, t2: 0.25, t3: 0.05 };
    if (level <= 10) return { t1: 0.5, t2: 0.4, t3: 0.1 };
    return { t1: 0.2, t2: 0.4, t3: 0.4 };
}

async function simulate() {
    const { data: events } = await supabase.from('evenements').select('*');
    console.log(`Total events loaded: ${events.length}`);

    const maxNot = Math.max(...events.map(e => e.notoriete || 0));
    console.log(`Max notoriety in DB: ${maxNot}`);

    for (let level = 1; level <= 10; level += 3) {
        console.log(`\n--- SIMULATION LEVEL ${level} ---`);
        const probs = getTierProbabilities(level);

        const t1_pool = events.filter(e => (e.notoriete || 0) >= TIER_THRESHOLDS.TIER_1_STAR);
        const t2_pool = events.filter(e => (e.notoriete || 0) >= TIER_THRESHOLDS.TIER_2_CLASSIC);

        console.log(`Pool T1 (>=75): ${t1_pool.length} events`);
        console.log(`Pool T2 (>=50): ${t2_pool.length} events`);

        if (t1_pool.length === 0 && probs.t1 > 0) {
            console.log(`CRITICAL: Level ${level} targets T1 (${probs.t1 * 100}%) but T1 is EMPTY!`);
        }
    }
}

simulate();
