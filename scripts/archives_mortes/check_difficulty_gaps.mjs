
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkDifficultyGaps() {
    console.log("🔍 Analyse de la structure de difficulté (Production)...");

    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, niveau_difficulte, notoriete');

    if (error) {
        console.error(error);
        return;
    }

    const dist = {};
    events.forEach(e => {
        const d = e.niveau_difficulte || 'null';
        dist[d] = (dist[d] || 0) + 1;
    });

    console.log("\n📊 Nombre d'événements par 'niveau_difficulte' :");
    Object.keys(dist).sort().forEach(d => {
        console.log(`- Difficulté ${d} : ${dist[d]} événements`);
    });

    console.log("\n⚙️ Rappel de ta config (levelConfigs.ts) :");
    console.log("- Niveau 1-2   : Difficulté 1-2");
    console.log("- Niveau 3-5   : Difficulté 1-4");
    console.log("- Niveau 6-12  : Difficulté 3-7");
    console.log("- Niveau 13-20 : Difficulté 5-7");
}

checkDifficultyGaps();
