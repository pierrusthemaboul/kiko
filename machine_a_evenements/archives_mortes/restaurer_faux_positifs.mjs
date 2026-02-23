import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function restoreFalsePositives() {
    console.log("🚀 Restauration des 58 faux positifs...");

    // 1. Charger segmentation
    const segment = JSON.parse(fs.readFileSync('honor_segmentation.json', 'utf8'));

    // 2. Charger backup
    const backup = JSON.parse(fs.readFileSync('titles_report_prod.json', 'utf8'));
    const backupMap = new Map(backup.evenements.map(e => [e.id, e.illustration_url]));

    const victims = segment.false_positives;
    let count = 0;

    for (const v of victims) {
        const originalUrl = backupMap.get(v.id);
        if (originalUrl) {
            console.log(`✅ Restauration: ${v.titre}`);
            await supabase.from('evenements').update({ illustration_url: originalUrl, donnee_corrigee: false }).eq('id', v.id);
            count++;
        } else {
            console.log(`❌ Pas de backup pour: ${v.titre}`);
        }
    }

    console.log(`\n✨ Terminé: ${count} évènements restaurés.`);
}

restoreFalsePositives();
