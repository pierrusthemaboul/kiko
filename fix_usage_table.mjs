import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function fixTable() {
    console.log("Tentative d'ajout du support app_version dans user_event_usage...");

    const sql = "ALTER TABLE public.user_event_usage ADD COLUMN IF NOT EXISTS app_version text;";

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error("Erreur SQL:", error);
    } else {
        console.log("✅ Table user_event_usage mise à jour avec succès !");
    }
}
fixTable();
