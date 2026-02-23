import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugSchema() {
    console.log("🔍 Vérification de la structure de base...");

    const { data: tables, error: tablesError } = await supabase.rpc('get_tables'); // Si RPC existe, sinon sql direct

    // Tentative de select simple sur une table connue
    const { count, error: evError } = await supabase.from('evenements').select('*', { count: 'exact', head: true });
    console.log(`Table 'evenements' : ${evError ? '❌ Erreur: ' + evError.message : '✅ ' + count + ' lignes'}`);

    const { error: usageError } = await supabase.from('user_event_usage').select('*', { count: 'exact', head: true });
    console.log(`Table 'user_event_usage' : ${usageError ? '❌ Erreur: ' + usageError.message : '✅ Existe'}`);
}

debugSchema();
