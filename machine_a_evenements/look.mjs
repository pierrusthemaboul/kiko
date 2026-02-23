
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function look() {
    const query = process.argv.slice(2).join(' ');
    if (!query) {
        console.log('Usage: node look.mjs <sujet>');
        return;
    }

    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, date, illustration_url, notoriete_fr, description_detaillee')
        .ilike('titre', `%${query}%`)
        .limit(5);

    if (error) {
        console.error('❌ Erreur:', error.message);
        return;
    }

    if (!events || events.length === 0) {
        console.log(`🔍 Aucun événement trouvé pour : "${query}"`);
        return;
    }

    events.forEach(ev => {
        console.log('='.repeat(50));
        console.log(`🆔 UUID    : ${ev.id}`);
        console.log(`📌 TITRE   : ${ev.titre}`);
        console.log(`📅 DATE    : ${ev.date}`);
        console.log(`⭐ NOTO FR : ${ev.notoriete_fr}`);
        console.log(`🖼️  URL     : ${ev.illustration_url}`);
        console.log(`📝 DESC    : ${ev.description_detaillee?.substring(0, 200)}...`);
    });
    console.log('='.repeat(50));
}

look();
