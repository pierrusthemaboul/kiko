import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function crossScan() {
    console.log("🕵️ SCAN DE COLLISION GLOBALE (Table: evenements)...");

    // 1. Charger toute la base
    let from = 0;
    let allEvents = [];
    while (true) {
        const { data, error } = await supabase.from('evenements').select('id, titre, date').range(from, from + 999);
        if (error || !data) break;
        allEvents = allEvents.concat(data);
        if (data.length < 1000) break;
        from += 1000;
    }

    console.log(`📊 ${allEvents.length} événements chargés.`);

    const normalizedMap = new Map();
    const collisions = [];

    // Normalisation agressive pour attraper les doublons "cachés"
    const normalize = (t) => {
        return t.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Supprimer accents
            .replace(/[^a-z0-9]/g, '') // Garder uniquement l'alphanumérique
            .replace(/^(le|la|les|l|un|une|du|des|debute|fin|creation|fondation)+/g, '') // Supprimer préfixes communs (normalisés)
            .trim();
    };

    for (const e of allEvents) {
        const norm = normalize(e.titre);
        if (norm.length < 5) continue;

        if (normalizedMap.has(norm)) {
            const collision = normalizedMap.get(norm);
            const y1 = new Date(collision.date).getFullYear();
            const y2 = new Date(e.date).getFullYear();
            collisions.push({
                norm,
                e1: collision,
                e2: e,
                diffYears: Math.abs(y1 - y2)
            });
        } else {
            normalizedMap.set(norm, e);
        }
    }

    console.log(`🧐 ${collisions.length} collisions trouvées après normalisation.`);

    // On ne garde que les collisions sérieuses (même événement suspecté)
    const serious = collisions.filter(c => c.diffYears < 50);

    fs.writeFileSync('global_collision_report.json', JSON.stringify(serious, null, 2));

    console.log("\n⚠️ TOP COLLISIONS SUSPECTES (À VÉRIFIER) :");
    serious.slice(0, 15).forEach(c => {
        console.log(`- [${c.e1.date}] ${c.e1.titre}`);
        console.log(`  [${c.e2.date}] ${c.e2.titre} (Δ ${c.diffYears} ans)`);
        console.log("---");
    });
}

crossScan();
