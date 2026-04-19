import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('credentials/.env', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_PROD_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function checkTriggers() {
    console.log("🔍 Recherche des triggers sur la table 'evenements'...");
    
    // On tente de lister les triggers via une requête sur information_schema
    // Note: On ne peut pas faire de SELECT direct sur information_schema via Supabase JS sans RPC
    // On va donc essayer de voir si on a un trigger qui génère l'erreur net.http_post
    
    console.log("⚠️ Impossible de lister les triggers directement via JS sans RPC execute_sql.");
    console.log("💡 Je vais essayer de désactiver TOUS les triggers sur la table 'evenements' via une commande SQL que tu devras copier-coller.");
}

checkTriggers();
