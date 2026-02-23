import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseLocalUrl = 'http://127.0.0.1:54321';
const supabaseLocalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseLocalUrl, supabaseLocalKey);

async function auditLocal() {
    console.log("--- AUDIT LOCAL ---");
    const fridayNight = new Date('2026-01-30T18:00:00Z').toISOString();

    console.log(`\n1. Événements créés en LOCAL (goju2) depuis Vendredi soir :`);
    try {
        const { count, error } = await supabase
            .from('goju2')
            .select('*', { count: 'exact', head: true })
            .gt('created_at', fridayNight);

        if (error) console.error("Erreur local goju2:", error);
        else console.log(`   Count: ${count}`);
    } catch (e) {
        console.error("Local DB might be down or unreachable.");
    }

    console.log(`\n2. Événements créés en LOCAL (evenements) depuis Vendredi soir :`);
    try {
        const { count, error } = await supabase
            .from('evenements')
            .select('*', { count: 'exact', head: true })
            .gt('created_at', fridayNight);

        if (error) console.error("Erreur local evenements:", error);
        else console.log(`   Count: ${count}`);
    } catch (e) {
        console.error("Local DB might be down or unreachable.");
    }
}

auditLocal();
