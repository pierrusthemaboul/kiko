import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getSupabase } from './AGENTS/shared_utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = getSupabase('prod');

async function applyFixes() {
    const reportPath = path.join(__dirname, 'expert_sanctification_report.json');
    if (!fs.existsSync(reportPath)) {
        console.error("❌ Rapport d'expertise introuvable. Lance d'abord claude_expert.mjs");
        return;
    }

    const expertResults = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    console.log(`🚀 Application de la SANCTIFICATION sur la base de données...`);

    let fixesCount = 0;
    let rejectsCount = 0;

    for (const res of expertResults) {
        if (res.verdict === 'fix') {
            console.log(`🔧 Correction de l'ID ${res.id} : Nouvelle année ${res.correct_year} (${res.explanation})`);
            const newDate = `${res.correct_year}-01-01`; // On simplifie au 1er janvier pour les corrections d'année

            const { error } = await supabase
                .from('evenements')
                .update({
                    date: newDate,
                    donnee_corrigee: true
                    // On pourrait aussi ajouter une note d'audit si on avait la colonne
                })
                .eq('id', res.id);

            if (error) console.error(`   ❌ Échec correction ID ${res.id}:`, error.message);
            else fixesCount++;
        }
        else if (res.verdict === 'reject') {
            console.log(`🚫 Suppression de l'ID ${res.id} : ${res.explanation}`);

            const { error } = await supabase
                .from('evenements')
                .delete()
                .eq('id', res.id);

            if (error) console.error(`   ❌ Échec suppression ID ${res.id}:`, error.message);
            else rejectsCount++;
        }
    }

    console.log("\n" + "=".repeat(40));
    console.log(`✨ OPÉRATION TERMINÉE`);
    console.log(`✅ Événements corrigés : ${fixesCount}`);
    console.log(`🚫 Événements écartés (notoriété -1) : ${rejectsCount}`);
    console.log("=".repeat(40));
}

applyFixes();
