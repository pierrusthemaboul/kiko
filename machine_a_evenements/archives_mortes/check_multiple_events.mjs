
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEvents() {
    const terms = ['Varennes', 'Collier', 'Eiffel', 'Castillon', 'Pasteur'];
    const { data, error } = await supabase
        .from('evenements')
        .select('titre, date_formatee');

    if (error) {
        console.error("Erreur :", error.message);
        return;
    }

    const found = (data || []).filter(e =>
        terms.some(t => e.titre.toLowerCase().includes(t.toLowerCase()))
    );

    console.log("🔍 Événements existants correspondants :");
    found.forEach(e => console.log(`- ${e.titre} (${e.date_formatee})`));
}

checkEvents();
