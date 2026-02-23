import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function auditProd() {
    console.log("=== AUDIT PRODUCTION APPROFONDI ===");

    // 1. Total events
    const { count: total, error: errTotal } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true });

    console.log(`Nombre total d'événements en PROD : ${total}`);

    // 2. Derniers événements insérés (par created_at)
    console.log("\nLes 20 derniers événements insérés (par created_at) :");
    const { data: latestInsert, error: errInsert } = await supabase
        .from('evenements')
        .select('titre, created_at, date')
        .order('created_at', { ascending: false })
        .limit(20);

    if (latestInsert) {
        latestInsert.forEach((e, i) => {
            console.log(`${i + 1}. [${e.created_at}] ${e.titre} (${e.date})`);
        });
    }

    // 3. Vérifier les types d'événements qui sortent (pour voir s'il y a un biais)
    // Par exemple, est-ce que les nouveaux événements ont un flag spécial ?
}

auditProd();
