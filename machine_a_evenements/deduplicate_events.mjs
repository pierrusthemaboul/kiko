import { getSupabase } from './AGENTS/shared_utils.mjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = getSupabase('prod');

function normalize(str) {
    return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }
    return matrix[str2.length][str1.length];
}

function similarity(s1, s2) {
    const l1 = s1.length;
    const l2 = s2.length;
    const max = Math.max(l1, l2);
    if (max === 0) return 1;
    return (max - levenshteinDistance(s1, s2)) / max;
}

async function run() {
    console.log("🧹 Détection des doublons (même année + titre similaire)...");

    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, date, illustration_url, description_detaillee, notoriete_fr')
        .order('date', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    const duplicatesToRemove = [];
    const processedIds = new Set();

    for (let i = 0; i < events.length; i++) {
        if (processedIds.has(events[i].id)) continue;

        const group = [events[i]];
        const year = new Date(events[i].date).getFullYear();
        const normTitle = normalize(events[i].titre);

        for (let j = i + 1; j < events.length; j++) {
            if (processedIds.has(events[j].id)) continue;

            const otherYear = new Date(events[j].date).getFullYear();
            if (year !== otherYear) break; // Trié par date, donc on peut stopper

            const otherNormTitle = normalize(events[j].titre);
            const sim = similarity(normTitle, otherNormTitle);

            if (sim > 0.75) {
                group.push(events[j]);
            }
        }

        if (group.length > 1) {
            // On a des doublons !
            // On trie pour garder le meilleur :
            // 1. Image présente
            // 2. Notoriété_fr présente
            // 3. Description la plus longue
            group.sort((a, b) => {
                const scoreA = (a.illustration_url ? 1000 : 0) + (a.notoriete_fr ? 500 : 0) + (a.description_detaillee?.length || 0);
                const scoreB = (b.illustration_url ? 1000 : 0) + (b.notoriete_fr ? 500 : 0) + (b.description_detaillee?.length || 0);
                return scoreB - scoreA;
            });

            const winner = group[0];
            const losers = group.slice(1);

            console.log(`👯 Doublon trouvé pour "${winner.titre}" (${year}) :`);
            losers.forEach(l => {
                console.log(`   ❌ Suppression de: "${l.titre}" (ID: ${l.id})`);
                duplicatesToRemove.push(l.id);
                processedIds.add(l.id);
            });
        }
        processedIds.add(events[i].id);
    }

    if (duplicatesToRemove.length > 0) {
        console.log(`\n🚀 Suppression de ${duplicatesToRemove.length} doublons...`);
        // On supprime par petits paquets de 20
        for (let i = 0; i < duplicatesToRemove.length; i += 20) {
            const batch = duplicatesToRemove.slice(i, i + 20);
            const { error: delError } = await supabase
                .from('evenements')
                .delete()
                .in('id', batch);
            if (delError) console.error("Erreur suppression batch:", delError.message);
        }
        console.log("✅ Doublons nettoyés.");
    } else {
        console.log("✅ Aucun doublon détecté.");
    }
}

run();
