
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function doubleAudit() {
    const localSupabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);
    const prodSupabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

    console.log("🛠️ Comparaison des environnements...");

    // 1. Audit Local
    const { count: countLocal } = await localSupabase.from('evenements').select('*', { count: 'exact', head: true });
    const { count: seenLocal } = await localSupabase.from('user_event_usage').select('*', { count: 'exact', head: true });

    // 2. Audit Prod
    const { count: countProd } = await prodSupabase.from('evenements').select('*', { count: 'exact', head: true });
    const { count: seenProd } = await prodSupabase.from('user_event_usage').select('*', { count: 'exact', head: true });

    console.log("\n📍 LOCAL (127.0.0.1)");
    console.log(`- Événements : ${countLocal}`);
    console.log(`- Déjà vus   : ${seenLocal}`);

    console.log("\n🌐 PRODUCTION (Supabase Cloud)");
    console.log(`- Événements : ${countProd}`);
    console.log(`- Déjà vus   : ${seenProd}`);
}

doubleAudit();
