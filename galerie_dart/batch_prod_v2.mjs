import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { orchestrateIllustration } from './orchestrateur_images.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const TARGETS_FILE = path.join(__dirname, 'bureaucratic_targets.json');
const REFUSALS_FILE = path.join(__dirname, 'refusals_log.json');
const BATCH_SIZE = 100;
const START_INDEX = 100; 

async function runProductionBatch() {
    console.log(`🎬 Démarrage du Batch Production (Index ${START_INDEX} à ${START_INDEX + BATCH_SIZE})...`);
    
    const data = JSON.parse(await fs.readFile(TARGETS_FILE, 'utf-8'));
    const slice = data.targets.slice(START_INDEX, START_INDEX + BATCH_SIZE);
    
    let refusals = [];
    try {
        const existingRefusals = await fs.readFile(REFUSALS_FILE, 'utf-8');
        refusals = JSON.parse(existingRefusals);
    } catch (e) {}

    const tempDir = path.join(__dirname, 'temp_batch');
    await fs.mkdir(tempDir, { recursive: true });

    for (const event of slice) {
        console.log(`\n--- 🔄 Traitement de : ${event.titre} ---`);
        
        try {
            const generation = await orchestrateIllustration(event.titre, event.id, tempDir);
            
            if (!generation) {
                console.log(`⚠️ REJET : L'orchestrateur n'a pas pu créer de prompt pour "${event.titre}".`);
                refusals.push({ id: event.id, titre: event.titre, date: new Date().toISOString(), reason: "Prompt failure" });
                await fs.writeFile(REFUSALS_FILE, JSON.stringify(refusals, null, 2));
                continue;
            }

            const fileBuffer = await fs.readFile(generation.local_path);
            const fileName = `migrated_${event.titre.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.webp`;

            const { error: uploadError } = await supabase.storage
                .from('evenements-image')
                .upload(fileName, fileBuffer, { contentType: 'image/png', upsert: true });

            if (uploadError) throw uploadError;

            const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

            const { error: updateError } = await supabase
                .from('evenements')
                .update({ illustration_url: publicUrl, updated_at: new Date().toISOString() })
                .eq('id', event.id);

            if (updateError) throw updateError;

            console.log(`✅ SUCCÈS : ${publicUrl}`);
        } catch (error) {
            console.error(`❌ ÉCHEC pour ${event.titre}:`, error.message);
        }
    }

    console.log(`\n🎉 Batch terminé. Les refus sont notés dans ${REFUSALS_FILE}.`);
}

runProductionBatch().catch(console.error);
