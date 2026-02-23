
import { getSupabase } from '../shared_utils.mjs';
import fs from 'fs';
import path from 'path';

const supabase = getSupabase('prod');

async function runAudit() {
    console.log("🔍 [AUDITEUR] Analyse de la base de données de production...");

    try {
        // 1. Récupération progressive de TOUS les événements (pagination Supabase)
        let allEvents = [];
        let from = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data: events, error } = await supabase
                .from('evenements')
                .select('epoque, region, notoriete, notoriete_fr, titre, date')
                .range(from, from + limit - 1);

            if (error) throw error;
            allEvents = allEvents.concat(events);

            if (events.length < limit) {
                hasMore = false;
            } else {
                from += limit;
            }
            process.stdout.write("."); // Indicateur de progression
        }
        console.log(`\n[AUDITEUR] ${allEvents.length} événements récupérés.`);

        const stats = {
            total: allEvents.length,
            epoque: {},
            region: {},
            notoriete_avg: 0,
            samples: []
        };

        let notorietySum = 0;

        allEvents.forEach(e => {
            // Epoque
            stats.epoque[e.epoque] = (stats.epoque[e.epoque] || 0) + 1;
            // Region
            stats.region[e.region] = (stats.region[e.region] || 0) + 1;
            // Notoriété (Priorité à la notoriété FR pour le conseil)
            const n = e.notoriete_fr || e.notoriete || 0;
            notorietySum += n;
        });

        stats.notoriete_avg = Math.round(notorietySum / allEvents.length);

        // Prendre 50 titres au hasard
        stats.samples = allEvents
            .sort(() => 0.5 - Math.random())
            .slice(0, 50)
            .map(e => `${e.titre} (${new Date(e.date).getFullYear()})`);

        const outputDir = path.resolve(process.cwd(), 'STORAGE/INPUT');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputPath = path.join(outputDir, 'audit_report.json');
        fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));

        console.log(`✅ [AUDITEUR] Audit terminé. ${allEvents.length} événements analysés.`);
        console.log(`📊 Notoriété moyenne: ${stats.notoriete_avg}/100.`);

    } catch (err) {
        console.error("❌ [AUDITEUR] Erreur lors de l'audit:", err.message);
        process.exit(1);
    }
}

runAudit();
