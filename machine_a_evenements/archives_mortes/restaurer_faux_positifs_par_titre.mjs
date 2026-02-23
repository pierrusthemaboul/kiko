import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function restoreFalsePositives() {
    console.log("🚀 Restauration par titre des faux positifs...");

    const segment = JSON.parse(fs.readFileSync('honor_segmentation.json', 'utf8'));
    const backup = JSON.parse(fs.readFileSync('titles_report_prod.json', 'utf8'));

    // Créer une map par TITRE (en minuscule pour plus de flexibilité)
    const backupTitleMap = new Map(backup.evenements.map(e => [e.titre.toLowerCase(), e.illustration_url]));

    const victims = segment.false_positives;
    let count = 0;

    for (const v of victims) {
        const originalUrl = backupTitleMap.get(v.titre.toLowerCase());
        if (originalUrl) {
            console.log(`✅ Restauration: ${v.titre}`);
            await supabase.from('evenements').update({ illustration_url: originalUrl }).eq('id', v.id);
            count++;
        } else {
            console.log(`❌ Toujours pas de backup pour: ${v.titre}`);
        }
    }

    console.log(`\n✨ Terminé: ${count} évènements restaurés.`);
}

restoreFalsePositives();
