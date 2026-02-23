
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SIM_PLAYERS = 200; // Nombre de joueurs simulés
const GAMES_PER_PLAYER = 10; // Parties par joueur
const MAX_LEVEL_REACHED = 15; // Jusqu'où ils montent en moyenne

// --- LOGIQUE EXTRAITE DE useEventSelector.ts ---
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
const getEraMultiplier = (year, level) => {
    let m = 1.0;
    if (year >= 2020) m = 0.15;
    else if (year >= 2000) m = 0.3;
    else if (year >= 1980) m = 0.5;
    else if (year >= 1950) m = 0.7;
    else if (year >= 1900) m = 0.9;
    else if (year >= 1800) m = 1.0;
    else if (year >= 1500) m = 1.5;
    else if (year >= 1000) m = 2.2;
    else if (year >= 500) m = 3.8;
    else if (year >= 0) m = 5.5;
    else m = 7.5;
    if (m > 1) {
        const levelFactor = Math.max(1, 3.5 - (level - 1) * 0.4);
        return m * levelFactor;
    }
    return m;
};
const getWeightsForLevel = (level) => {
    if (level <= 3) return { alphaProximity: 1.2, gammaNotoriete: 0.6 };
    if (level <= 8) return { alphaProximity: 1.1, gammaNotoriete: 0.5 };
    if (level <= 15) return { alphaProximity: 0.9, gammaNotoriete: 0.4 };
    return { alphaProximity: 0.7, gammaNotoriete: 0.3 };
};
const notorieteProfileForLevel = (level) => {
    if (level <= 3) return { target: 0.6, tolerance: 0.45 };
    if (level <= 6) return { target: 0.5, tolerance: 0.45 };
    if (level <= 10) return { target: 0.4, tolerance: 0.45 };
    return { target: 0.35, tolerance: 0.5 };
};

// --- SIMULATION ---
async function fetchAllEvents() {
    let allData = [];
    let from = 0;
    let to = 999;
    let finished = false;

    while (!finished) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, date, notoriete, frequency_score')
            .range(from, to);

        if (error) throw error;
        allData = allData.concat(data);
        if (data.length < 1000) finished = true;
        else {
            from += 1000;
            to += 1000;
        }
    }
    return allData;
}

async function runSimulation() {
    console.log("📥 Chargement du catalogue d'événements...");
    let allEvents;
    try {
        allEvents = await fetchAllEvents();
    } catch (e) {
        console.error("❌ Erreur pendant le fetch:", e);
        return;
    }
    console.log(`✅ ${allEvents.length} événements chargés.`);

    allEvents.forEach(e => {
        const dateObj = new Date(e.date);
        let year = dateObj.getFullYear();
        if (isNaN(year)) {
            const match = e.date?.match(/-?\d{1,4}/);
            year = match ? parseInt(match[0]) : 2000;
        }
        e.year = year;
        e.adjustedNotoriety = getAdjustedNotoriety(e.notoriete || 0, e.year);
        if (e.adjustedNotoriety >= TIER_THRESHOLDS.TIER_1_STAR) e.tier = 1;
        else if (e.adjustedNotoriety >= TIER_THRESHOLDS.TIER_2_CLASSIC) e.tier = 2;
        else e.tier = 3;
    });

    const globalUsage = new Map();
    console.log(`\n🚀 Lancement de la simulation (${SIM_PLAYERS} joueurs, ${GAMES_PER_PLAYER} parties/joueur)...`);

    for (let p = 0; p < SIM_PLAYERS; p++) {
        const playerHistory = new Map();
        for (let g = 0; g < GAMES_PER_PLAYER; g++) {
            const starters = allEvents.filter(e => e.tier === 1);
            let currentEvent = starters[Math.floor(Math.random() * starters.length)];
            let usedInGame = new Set([currentEvent.id]);
            for (let level = 1; level <= MAX_LEVEL_REACHED; level++) {
                const eventsToPick = 3;
                for (let step = 0; step < eventsToPick; step++) {
                    const nextEvent = pickNextEvent(allEvents, currentEvent, level, usedInGame, playerHistory);
                    if (nextEvent) {
                        usedInGame.add(nextEvent.id);
                        playerHistory.set(nextEvent.id, (playerHistory.get(nextEvent.id) || 0) + 1);
                        globalUsage.set(nextEvent.id, (globalUsage.get(nextEvent.id) || 0) + 1);
                        currentEvent = nextEvent;
                    }
                }
            }
        }
    }
    generateReport(allEvents, globalUsage);
}

function pickNextEvent(allEvents, referenceEvent, level, usedInGame, playerHistory) {
    const probs = getTierProbabilities(level);
    const rand = Math.random();
    let targetTier = 3;
    if (rand < probs.t1) targetTier = 1;
    else if (rand < probs.t1 + probs.t2) targetTier = 2;

    const candidates = allEvents.filter(e => {
        if (usedInGame.has(e.id)) return false;
        if (e.year === referenceEvent.year) return false;
        if (targetTier === 1 && e.tier > 1) return false;
        if (targetTier === 2 && e.tier > 2) return false;
        const diff = Math.abs(e.year - referenceEvent.year);
        const multiplier = getEraMultiplier(referenceEvent.year, level);
        if (diff > 500 * multiplier) return false;
        return true;
    });

    if (candidates.length === 0) return null;

    const weights = getWeightsForLevel(level);
    const notorietyProfile = notorieteProfileForLevel(level);

    candidates.forEach(e => {
        const diff = Math.abs(e.year - referenceEvent.year);
        const multiplier = getEraMultiplier(referenceEvent.year, level);
        const idealGap = Math.max(1, 40 * multiplier);
        const diffRatio = Math.abs(diff - idealGap) / idealGap;
        const gapScore = 35 * Math.max(0, 1 - diffRatio) * (weights.alphaProximity || 1);
        const notorieteNormalized = e.adjustedNotoriety / 100;
        const notorieteDistance = Math.abs(notorieteNormalized - notorietyProfile.target);
        const notorieteFactor = Math.max(0, 1 - (notorieteDistance / (notorietyProfile.tolerance || 0.1)));
        const notorieteScore = notorieteFactor * (weights.gammaNotoriete || 0.5) * 30;
        const timesSeen = playerHistory.get(e.id) || 0;
        const personalPenaltyMultiplier = 1 / (1 + Math.pow(timesSeen, 1.5));
        e._temp_score = (gapScore + notorieteScore + Math.random() * 5) * personalPenaltyMultiplier;
    });

    candidates.sort((a, b) => b._temp_score - a._temp_score);
    return candidates[0];
}

function generateReport(allEvents, globalUsage) {
    const total = allEvents.length;
    const seenCount = globalUsage.size;
    const neverSeen = total - seenCount;
    const usageCounts = Array.from(globalUsage.values());
    const avgUsage = usageCounts.length > 0 ? usageCounts.reduce((a, b) => a + b, 0) / seenCount : 0;
    const dist = { once: 0, rare: 0, common: 0, overUsed: 0 };
    globalUsage.forEach(count => {
        if (count === 1) dist.once++;
        else if (count <= 5) dist.rare++;
        else if (count <= 20) dist.common++;
        else dist.overUsed++;
    });

    const tierStats = { 1: { total: 0, seen: 0 }, 2: { total: 0, seen: 0 }, 3: { total: 0, seen: 0 } };
    allEvents.forEach(e => {
        tierStats[e.tier].total++;
        if (globalUsage.has(e.id)) tierStats[e.tier].seen++;
    });

    console.log("\n" + "=".repeat(60));
    console.log("📊 RAPPORT DE SIMULATION DE COUVERTURE DU CATALOGUE");
    console.log("=".repeat(60));
    console.log(`Catalogue total         : ${total} événements`);
    console.log(`Événements découverts   : ${seenCount} (${((seenCount / total) * 100).toFixed(1)}%)`);
    console.log(`Événements ignorés      : ${neverSeen} (${((neverSeen / total) * 100).toFixed(1)}%)`);
    console.log(`Usage moyen / évent vu  : ${avgUsage.toFixed(1)} fois`);
    console.log("\n🌟 PERFORMANCE PAR TIER :");
    [1, 2, 3].forEach(t => {
        const s = tierStats[t];
        const name = t === 1 ? "STAR (T1)   " : t === 2 ? "CLASSIC (T2)" : "EXPERT (T3) ";
        console.log(`- ${name} : ${s.seen}/${s.total} (${((s.seen / s.total) * 100).toFixed(1)}%)`);
    });
    console.log("\n⚠️ Top 10 des événements les plus vus :");
    const sortedUsage = Array.from(globalUsage.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    sortedUsage.forEach(([id, count]) => {
        const event = allEvents.find(e => e.id === id);
        console.log(`- ${event.titre.padEnd(45)} | ${event.year.toString().padStart(5)} | ${count} fois`);
    });
    console.log("=".repeat(60) + "\n");
}

runSimulation();
