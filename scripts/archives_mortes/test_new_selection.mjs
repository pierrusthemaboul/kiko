import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

// Configuration locale
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Simulateur simplifié des règles de TierProbabilities
const getTierProbabilities = (level) => {
    if (level <= 2) return { t1: 0.75, t2: 0.20, t3: 0.05 };
    if (level <= 5) return { t1: 0.60, t2: 0.30, t3: 0.10 };
    if (level <= 10) return { t1: 0.45, t2: 0.40, t3: 0.15 };
    if (level <= 20) return { t1: 0.30, t2: 0.45, t3: 0.25 };
    return { t1: 0.20, t2: 0.40, t3: 0.40 };
};

async function testSelection(level, iterations = 100) {
    console.log(`\n--- Simulation Niveau ${level} (${iterations} tirages) ---`);

    // On récupère une partie de la base pour simuler
    const { data: events } = await supabase.from('evenements').select('notoriete').limit(2000);

    if (!events) return;

    const stats = { T1: 0, T2: 0, T3: 0 };
    const probs = getTierProbabilities(level);

    for (let i = 0; i < iterations; i++) {
        const rand = Math.random();
        let targetTier;
        if (rand < probs.t1) targetTier = 1;
        else if (rand < probs.t1 + probs.t2) targetTier = 2;
        else targetTier = 3;

        // Simulation du filtrage
        const candidates = events.filter(e => {
            const n = e.notoriete ?? 0;
            if (targetTier === 1) return n >= 75;
            if (targetTier === 2) return n >= 50 && n < 75;
            return n < 50;
        });

        if (candidates.length > 0) {
            stats[`T${targetTier}`]++;
        }
    }

    console.log(`Répartition réelle des sorties :`);
    console.log(`- Tier 1 (Stars)     : ${((stats.T1 / iterations) * 100).toFixed(1)}% (Cible: ${probs.t1 * 100}%)`);
    console.log(`- Tier 2 (Classiques): ${((stats.T2 / iterations) * 100).toFixed(1)}% (Cible: ${probs.t2 * 100}%)`);
    console.log(`- Tier 3 (Experts)   : ${((stats.T3 / iterations) * 100).toFixed(1)}% (Cible: ${probs.t3 * 100}%)`);
}

async function run() {
    await testSelection(1);
    await testSelection(5);
    await testSelection(15);
}

run();
