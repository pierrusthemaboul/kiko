import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('credentials/.env', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_PROD_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
    // On tente de lister les extensions via une vue système accessible
    const { data, error } = await supabase.from('pg_extension').select('extname').catch(() => ({error: {message: 'Accès direct pg_extension refusé'}}));
    
    if (error) {
        console.log("❌ Impossible de lister les extensions directement : " + error.message);
    } else {
        console.log("✅ Extensions installées :", data.map(e => e.extname));
    }
    
    // Test direct de la fonction incriminée
    const { error: err2 } = await supabase.rpc('net.http_post', { url: 'https://google.com', body: '{}' }).catch(e => ({error: e}));
    console.log("🔍 Test net.http_post :", err2 ? err2.message : "Fonctionne !");
}

check();
