import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function start() {
    const gems = JSON.parse(fs.readFileSync('audit_data.json', 'utf8'));
    console.log(`🚀 Application des corrections sur ${gems.length} événements...`);

    let count = 0;
    const batchSize = 20;

    for (let i = 0; i < gems.length; i += batchSize) {
        const batch = gems.slice(i, i + batchSize);
        
        const updates = batch.map(async (gem) => {
            const updateData = {
                notoriete_fr: gem.suggested_notoriety,
                updated_at: new Date().toISOString()
            };
            
            if (gem.suggested_title && gem.suggested_title !== "" && gem.suggested_title !== "Identique") {
                updateData.titre = gem.suggested_title;
            }

            const { error } = await supabase
                .from('evenements')
                .update(updateData)
                .eq('id', gem.id);

            if (error) {
                console.error(`❌ Erreur sur l'ID ${gem.id}:`, error.message);
            } else {
                count++;
            }
        });

        await Promise.all(updates);
        if (i % 100 === 0) {
            console.log(`⏳ Progression : ${i}/${gems.length} traités...`);
        }
    }

    console.log(`✅ Terminé ! ${count} événements ont été mis à jour avec succès.`);
}

start();
