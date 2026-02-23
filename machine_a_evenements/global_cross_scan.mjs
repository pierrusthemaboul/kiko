import { getSupabase } from './machine_a_evenements/AGENTS/shared_utils.mjs';
import fs from 'fs';

const supabase = getSupabase('prod');

async function crossScan() {
    console.log("🕵️ SCAN DE COLLISION GLOBALE (Ignorant les dates)...");

    // 1. Charger tout le lexique des titres
    const { data: allEvents, error } = await supabase.from('evenements').select('id, titre, date');
    if (error) {
        console.error("❌ Erreur chargement:", error.message);
        return;
    }

    console.log(`📊 Analyse de ${allEvents.length} titres...`);

    const suspects = [];
    const normalizedMap = new Map();

    // Fonction de nettoyage poussée
    const normalize = (t) => {
        return t.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Supprimer accents
            .replace(/^(le |la |les |l'|un |une |du |des |début de la |début du |fin de la |fin du |création de l'|création de la |création du |fondation de l'|fondation de la |fondation du )+/g, '')
            .replace(/[^a-z0-9]/g, '') // Garder uniquement l'essentiel
            .trim();
    };

    for (const e of allEvents) {
        const norm = normalize(e.titre);
        if (norm.length < 5) continue; // Trop court pour être pertinent

        if (normalizedMap.has(norm)) {
            const collision = normalizedMap.get(norm);
            suspects.push({
                norm,
                e1: collision,
                e2: e,
                diffYears: Math.abs(new Date(collision.date).getFullYear() - new Date(e.date).getFullYear())
            });
        } else {
            normalizedMap.set(norm, e);
        }
    }

    console.log(`🧐 ${suspects.length} collisions de titres (normalisées) trouvées.`);

    // On trie par proximité de titre mais on regarde aussi les grands écarts de date
    const seriousSuspects = suspects.filter(s => s.diffYears < 100); // Au-delà de 100 ans c'est suspect mais peut-être homonyme

    fs.writeFileSync('global_collision_report.json', JSON.stringify(seriousSuspects, null, 2));

    console.log("\nTop 10 des collisions les plus suspectes :");
    seriousSuspects.slice(0, 10).forEach(s => {
        console.log(`- [${s.e1.date}] ${s.e1.titre}  VS  [${s.e2.date}] ${s.e2.titre} (Δ ${s.diffYears} ans)`);
    });

}

crossScan();
