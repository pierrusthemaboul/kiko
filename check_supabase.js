
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    const sqlPath = path.join(__dirname, 'scripts', 'create_remote_logs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('--- Application de la migration SQL ---');

    // Supabase JS ne permet pas de courir du SQL brut directement via 'from' 
    // Il faut utiliser l'API rpc ou une astuce. Mais on peut tenter de vérifier si 
    // la table existe déjà en faisant un select.

    // Note: La meilleure façon de courir du SQL brut est via le dashboard ou via 
    // des outils de migration, mais je vais tenter d'insérer un log test pour vérifier.

    const { error } = await supabase.from('remote_debug_logs').select('count', { count: 'exact', head: true });

    if (error && error.code === 'PGRST116' || error && error.message.includes('relation "public.remote_debug_logs" does not exist')) {
        console.log('La table n\'existe pas encore. Merci de l\'appliquer manuellement via le SQL Editor de Supabase pour le moment.');
        console.log('Voici le code SQL à copier :');
        console.log(sql);
    } else if (error) {
        console.error('Erreur lors de la vérification de la table:', error);
    } else {
        console.log('✅ La table remote_debug_logs existe déjà et est prête !');
    }
}

applyMigration();
