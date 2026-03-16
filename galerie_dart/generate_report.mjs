import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function generateFullReport() {
    console.log("📊 Génération du rapport complet des 178 événements...");
    
    const targetsData = JSON.parse(await fs.readFile(path.join(__dirname, 'bureaucratic_targets.json'), 'utf-8'));
    const targets = targetsData.targets;
    const ids = targets.map(t => t.id);

    // Récupération en masse depuis Supabase
    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, date, illustration_url')
        .in('id', ids);

    if (error) throw error;

    // Récupération des refus
    let refusals = [];
    try {
        refusals = JSON.parse(await fs.readFile(path.join(__dirname, 'refusals_log.json'), 'utf-8'));
    } catch (e) {}

    const refusalIds = new Set(refusals.map(r => r.id));

    let report = "# Rapport de Nettoyage des Images Bureaucratiques\n\n";
    report += "| Titre | Date | Statut | Lien Image |\n";
    report += "| :--- | :--- | :--- | :--- |\n";

    // On suit l'ordre des targets d'origine
    for (const target of targets) {
        const event = events.find(e => e.id === target.id);
        if (!event) continue;

        const isRefused = refusalIds.has(event.id);
        const status = isRefused ? "❌ REFUSÉ (IA)" : "✅ REMPLACÉ";
        const url = isRefused ? "---" : `[Lien](${event.illustration_url})`;

        report += `| ${event.titre} | ${event.date} | ${status} | ${url} |\n`;
    }

    await fs.writeFile(path.join(__dirname, 'rapport_nettoyage_complet.md'), report);
    console.log("✅ Rapport généré : rapport_nettoyage_complet.md");
}

generateFullReport().catch(console.error);
