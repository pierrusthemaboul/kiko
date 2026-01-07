
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function getDailySeed() {
    const now = new Date();
    const parisTime = now.toLocaleString('en-US', { timeZone: 'Europe/Paris' });
    const d = new Date(parisTime);
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function shuffleWithSeed(array, seed) {
    const shuffled = [...array];
    let m = shuffled.length, t, i;
    while (m) {
        i = Math.floor(Math.abs(Math.sin(seed++)) * m--);
        t = shuffled[m];
        shuffled[m] = shuffled[i];
        shuffled[i] = t;
    }
    return shuffled;
}

async function selectDailyQuests(rankIndex = 0) {
    let difficultyTier = 1;
    if (rankIndex >= 12) difficultyTier = 4;
    else if (rankIndex >= 8) difficultyTier = 3;
    else if (rankIndex >= 4) difficultyTier = 2;

    const { data: allDailyQuests, error } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('quest_type', 'daily')
        .eq('is_active', true)
        .eq('difficulty', difficultyTier);

    if (error) throw error;

    const seed = getDailySeed();
    const shuffled = shuffleWithSeed(allDailyQuests, seed);

    const selected = [];
    const usedCategories = new Set();
    for (const q of shuffled) {
        const cat = q.category || 'general';
        if (!usedCategories.has(cat)) {
            selected.push(q);
            usedCategories.add(cat);
        }
        if (selected.length >= 3) break;
    }

    if (selected.length < 3) {
        for (const q of shuffled) {
            if (!selected.find(s => s.quest_key === q.quest_key)) {
                selected.push(q);
            }
            if (selected.length >= 3) break;
        }
    }
    return selected;
}

async function simulate() {
    console.log('🧪 SIMULATION DE SÉLECTION (Standalone)\n');

    const ranks = [
        { name: 'Page', index: 0 },
        { name: 'Seigneur', index: 7 },
        { name: 'Empereur', index: 22 },
    ];

    for (const rank of ranks) {
        console.log(`👤 Pour : ${rank.name} (Grade ${rank.index})`);
        try {
            const quests = await selectDailyQuests(rank.index);
            quests.forEach((q, i) => {
                console.log(`  ${i + 1}. [${q.category}] ${q.title} -> ${q.description}`);
            });
        } catch (e) {
            console.error('  ❌ Erreur:', e.message);
        }
        console.log('');
    }
}

simulate();
