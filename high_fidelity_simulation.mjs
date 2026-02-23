
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

// --- COPIE CONFORME DES CONFIGURATIONS RÉELLES ---

const LEVEL_CONFIGS = {
    1: { minD: 1, maxD: 1, events: 5 },
    2: { minD: 1, maxD: 2, events: 6 },
    3: { minD: 1, maxD: 3, events: 7 },
    4: { minD: 2, maxD: 3, events: 8 },
    5: { minD: 2, maxD: 4, events: 9 },
    6: { minD: 3, maxD: 4, events: 10 },
    7: { minD: 3, maxD: 5, events: 11 },
    8: { minD: 2, maxD: 5, events: 12 },
    9: { minD: 3, maxD: 6, events: 13 },
    10: { minD: 4, maxD: 6, events: 14 },
    11: { minD: 4, maxD: 7, events: 15 },
    12: { minD: 5, maxD: 7, events: 16 },
    13: { minD: 5, maxD: 7, events: 17 },
    14: { minD: 6, maxD: 7, events: 18 },
    15: { minD: 6, maxD: 7, events: 19 },
    16: { minD: 6, maxD: 7, events: 20 },
    17: { minD: 6, maxD: 7, events: 21 },
    18: { minD: 7, maxD: 7, events: 22 },
    19: { minD: 7, maxD: 7, events: 23 },
    20: { minD: 7, maxD: 7, events: 24 }
};

const TIER_THRESHOLDS = { TIER_1_STAR: 75, TIER_2_CLASSIC: 50, TIER_3_EXPERT: 0 };

const getTierProbabilities = (level) => {
    if (level <= 2) return { t1: 0.75, t2: 0.20, t3: 0.05 };
    if (level <= 5) return { t1: 0.60, t2: 0.30, t3: 0.10 };
    if (level <= 10) return { t1: 0.45, t2: 0.40, t3: 0.15 };
    if (level <= 20) return { t1: 0.30, t2: 0.45, t3: 0.25 };
    return { t1: 0.20, t2: 0.40, t3: 0.40 };
};

const getAdjustedNotoriety = (notoriety, year) => {
    if (year < 500) return Math.min(100, notoriety + 15);
    if (year < 1500) return Math.min(100, notoriety + 10);
    if (year < 1800) return Math.min(100, notoriety + 5);
    return notoriety;
};

// --- SIMULATEUR ---

async function runHighFidelitySimulation() {
    console.log("📥 Chargement de l'intégralité du catalogue (2654 événements)...");
    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from('evenements').select('*').range(from, from + 999);
        if (error) break;
        allEvents = allEvents.concat(data);
        if (data.length < 1000) break;
        from += 1000;
    }
    console.log(`✅ ${allEvents.length} événements chargés.`);

    // Prétraitement (Années, Tiers, Notoriété)
    allEvents.forEach(e => {
        const d = new Date(e.date);
        e.year = isNaN(d.getFullYear()) ? (e.date?.match(/-?\d{4}/)?.[0] ? parseInt(e.date.match(/-?\d{4}/)[0]) : 2000) : d.getFullYear();
        e.adjNotoriety = getAdjustedNotoriety(e.notoriete || 0, e.year);
        if (e.adjNotoriety >= TIER_THRESHOLDS.TIER_1_STAR) e.tier = 1;
        else if (e.adjNotoriety >= TIER_THRESHOLDS.TIER_2_CLASSIC) e.tier = 2;
        else e.tier = 3;
    });

    const stats = {
        globalSeen: new Set(),
        usageByDifficulty: {},
        usageByTier: { 1: new Set(), 2: new Set(), 3: new Set() }
    };

    const COHORTES = [
        { count: 100, maxLevel: 5, games: 5 },   // Joueurs occasionnels
        { count: 100, maxLevel: 12, games: 10 }, // Joueurs réguliers
        { count: 50, maxLevel: 20, games: 20 }   // Joueurs passionnés
    ];

    console.log("🚀 Lancement de la simulation haute fidélité...");

    for (const cohorte of COHORTES) {
        for (let i = 0; i < cohorte.count; i++) {
            const playerHistory = new Map(); // id -> times_seen

            for (let g = 0; g < cohorte.games; g++) {
                // Début de partie
                const starters = allEvents.filter(e => e.niveau_difficulte === 1 && e.tier === 1);
                let current = starters[Math.floor(Math.random() * starters.length)];
                if (!current) current = allEvents[0];

                let usedInGame = new Set([current.id]);

                // Progression dans les niveaux
                for (let lv = 1; lv <= cohorte.maxLevel; lv++) {
                    const config = LEVEL_CONFIGS[lv];
                    for (let step = 0; step < config.events; step++) {
                        const next = pickNextEventMirror(allEvents, current, lv, config, usedInGame, playerHistory);
                        if (next) {
                            usedInGame.add(next.id);
                            playerHistory.set(next.id, (playerHistory.get(next.id) || 0) + 1);
                            stats.globalSeen.add(next.id);
                            stats.usageByTier[next.tier].add(next.id);
                            stats.usageByDifficulty[next.niveau_difficulte] = (stats.usageByDifficulty[next.niveau_difficulte] || new Set());
                            stats.usageByDifficulty[next.niveau_difficulte].add(next.id);
                            current = next;
                        } else {
                            break; // Game over ou plus d'événements
                        }
                    }
                }
            }
        }
    }

    printFinalReport(allEvents, stats);
}

function pickNextEventMirror(allEvents, ref, lv, config, used, playerHistory) {
    // 1. Déterminer le Tier cible (Probabilités réelles)
    const probs = getTierProbabilities(lv);
    const r = Math.random();
    let targetTier = 3;
    if (r < probs.t1) targetTier = 1;
    else if (r < probs.t1 + probs.t2) targetTier = 2;

    // 2. Filtrage Strict (Difficulté + Date + Used)
    const pool = allEvents.filter(e => {
        if (used.has(e.id)) return false;
        if (e.year === ref.year) return false;
        if (e.niveau_difficulte < config.minD || e.niveau_difficulte > config.maxD) return false;

        // Tier filter (Probabiliste)
        if (targetTier === 1 && e.tier > 1) return false;
        if (targetTier === 2 && e.tier > 2) return false;

        // Gap temporel minimum (pour éviter les trucs trop collés)
        if (Math.abs(e.year - ref.year) < 1) return false;

        return true;
    });

    if (pool.length === 0) return null;

    // 3. Scoring (Version simplifiée mais fidèle aux poids)
    pool.forEach(e => {
        const diff = Math.abs(e.year - ref.year);
        // Score de proximité (on cherche environ 40-100 ans selon réglages)
        const gapScore = Math.max(0, 50 - Math.abs(diff - 50));
        const notoScore = e.adjNotoriety * 0.5;

        // Malus Personnel (Le point qui fait varier le catalogue)
        const timesSeen = playerHistory.get(e.id) || 0;
        const personalPenalty = 1 / (1 + Math.pow(timesSeen, 1.5));

        e._sim_score = (gapScore + notoScore + Math.random() * 10) * personalPenalty;
    });

    pool.sort((a, b) => b._sim_score - a._sim_score);
    return pool[0];
}

function printFinalReport(allEvents, stats) {
    const total = allEvents.length;
    const seen = stats.globalSeen.size;

    console.log("\n" + "=".repeat(60));
    console.log("🏁 RAPPORT DE CERTITUDE ABSOLUE (Simulation Miroir)");
    console.log("=".repeat(60));
    console.log(`Événements totaux en Prod : ${total}`);
    console.log(`Événements découverts     : ${seen} (${((seen / total) * 100).toFixed(1)}%)`);
    console.log(`Événements oubliés        : ${total - seen} (${(((total - seen) / total) * 100).toFixed(1)}%)`);

    console.log("\n📊 ANALYSE PAR DIFFICULTÉ (Découverte) :");
    [1, 2, 3, 4, 5, 6, 7].forEach(d => {
        const totalInD = allEvents.filter(e => e.niveau_difficulte === d).length;
        const seenInD = stats.usageByDifficulty[d]?.size || 0;
        console.log(`- Difficulté ${d} : ${seenInD}/${totalInD} (${((seenInD / totalInD) * 100).toFixed(1)}%)`);
    });

    console.log("\n🌟 ANALYSE PAR TIER (Découverte) :");
    [1, 2, 3].forEach(t => {
        const totalInT = allEvents.filter(e => e.tier === t).length;
        const seenInT = stats.usageByTier[t]?.size || 0;
        console.log(`- Tier ${t} : ${seenInT}/${totalInT} (${((seenInT / totalInT) * 100).toFixed(1)}%)`);
    });

    console.log("\n🧐 CONCLUSION :");
    if (seen / total < 0.5) {
        console.log("⚠️ ALERTE : Moins de la moitié du catalogue circule.");
    } else if (seen / total < 0.8) {
        console.log("⚖️ MOYEN : Le catalogue est ouvert mais des zones restent mortes.");
    } else {
        console.log("✅ BRAVO : Ton catalogue circule de manière fluide !");
    }
}

runHighFidelitySimulation();
