import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import 'dotenv/config';

const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runAudit() {
    console.log("🕵️ Audit de la notoriété en cours...");

    const { data, error } = await supabase
        .from('evenements')
        .select('id, titre, date, notoriete, description_detaillee')
        .gte('notoriete', 70)
        .order('date', { ascending: true });

    if (error) {
        console.error("❌ Erreur:", error);
        return;
    }

    let report = "# Rapport d'audit Notoriété (Stars > 70)\n\n";
    report += `Total d'événements analysés : ${data.length}\n\n`;

    const byCentury = {};
    data.forEach(e => {
        const year = new Date(e.date).getFullYear();
        const century = Math.floor(year / 100) * 100;
        if (!byCentury[century]) byCentury[century] = [];
        byCentury[century].push(e);
    });

    Object.keys(byCentury).sort((a, b) => a - b).forEach(century => {
        report += `## Siècle commençant en ${century}\n`;
        report += "| Notoriété | Année | Titre | ID |\n";
        report += "| :--- | :--- | :--- | :--- |\n";

        // Trier par notoriété décroissante dans le siècle
        byCentury[century].sort((a, b) => b.notoriete - a.notoriete).forEach(e => {
            const year = new Date(e.date).getFullYear();
            report += `| **${e.notoriete}** | ${year} | ${e.titre} | \`${e.id}\` |\n`;
        });
        report += "\n";
    });

    fs.writeFileSync('./machine_a_evenements/RAPPORT_NOTORIETE.md', report);
    console.log("✅ Rapport généré : RAPPORT_NOTORIETE.md");
}

runAudit();
