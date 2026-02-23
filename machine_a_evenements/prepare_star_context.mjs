import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function prepareStarContext() {
    console.log("🌟 Préparation du contexte pour la génération 'STAR' (75-85)...");

    // 1. Récupérer les titres existants dans la tranche 70-90 (pour élargir un peu le champ d'évitement)
    const { data: events, error } = await supabase
        .from('evenements')
        .select('titre')
        .gte('notoriete_fr', 70)
        .lte('notoriete_fr', 90);

    if (error) {
        console.error("❌ Erreur Supabase:", error.message);
        return;
    }

    const titles = events.map(e => e.titre);
    console.log(`🔍 ${titles.length} événements 'Star' déjà présents en base.`);

    // 2. Écrire dans seed_context.md
    const contextPath = path.join(__dirname, 'AGENTS/GENESIS/STORAGE/INPUT/seed_context.md');
    const content = `LISTE DES ÉVÉNEMENTS DÉJÀ PRÉSENTS (NE PAS LES REPRODUIRE) :\n\n- ${titles.join('\n- ')}`;

    fs.writeFileSync(contextPath, content);
    console.log(`✅ Contexte mis à jour dans GENESIS/STORAGE/INPUT/seed_context.md`);
    console.log(`\n👉 Tu peux maintenant lancer :\nnpm run bureau 10 "Événements de culture générale majeure (notoriété 75-85)"`);
}

prepareStarContext();
