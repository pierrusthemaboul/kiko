
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAusterlitz() {
    const { data, error } = await supabase
        .from('goju2')
        .select('*')
        .ilike('titre', '%Austerlitz%')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error("Erreur :", error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log("🔍 Événement trouvé dans goju2 :");
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log("❌ Aucun événement trouvé avec 'Austerlitz' dans goju2.");
    }
}

checkAusterlitz();
