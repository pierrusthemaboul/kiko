
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// On utilise les credentials locaux si on est en local, sinon le .env
// En local, l'URL est généralement http://127.0.0.1:54321
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
    console.log("🚀 Création de la table queue_sevent sur Supabase Local...");

    const { error } = await supabase.rpc('admin_run_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS public.queue_sevent (
                id bigserial PRIMARY KEY,
                titre text NOT NULL,
                year integer NOT NULL,
                type text,
                region text,
                description text,
                specific_location text,
                notoriete integer,
                status text DEFAULT 'pending',
                created_at timestamptz DEFAULT now(),
                processed_at timestamptz,
                error_log text,
                validation_notes jsonb
            );
            COMMENT ON TABLE public.queue_sevent IS 'File d''attente pour la génération d''images par la machine sevent3';
        `
    });

    if (error) {
        // Si RPC n'est pas dispo, on essaie une autre méthode via le SQL Editor si possible, 
        // mais ici on va tenter une insertion directe pour voir si la table existe déjà
        console.error("❌ Erreur via RPC (possible que admin_run_sql ne soit pas activé) :", error.message);
        console.log("Tentative alternative via CLI...");
    } else {
        console.log("✅ Table queue_sevent créée avec succès !");
    }
}

createTable();
