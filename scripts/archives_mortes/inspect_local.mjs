import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// On cible DIRECTEMENT le local
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(LOCAL_URL, LOCAL_KEY);

async function inspectLocalData() {
    console.log('🔍 Inspection des données LOCALES...');

    // 1. Chercher les événements avec "EMPTY" ou sans URL
    const { data: emptyUrls, error: err1 } = await supabase
        .from('evenements')
        .select('id, titre, date_formatee, illustration_url')
        .or('illustration_url.eq.EMPTY,illustration_url.is.null')
        .limit(10);

    console.log('\n🖼️ Exemples d\'événements sans image (URL vide ou EMPTY) :');
    console.table(emptyUrls);

    // 2. Chercher les titres suspects (ceux qui contiennent une virgule comme "13 - 17 janvier, ...")
    const { data: suspectTitles, error: err2 } = await supabase
        .from('evenements')
        .select('id, titre, date_formatee')
        .ilike('titre', '%,%')
        .limit(10);

    console.log('\n✍️ Exemples de titres suspects (avec virgule) :');
    console.table(suspectTitles);
}

inspectLocalData();
