import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.log('\nNote: Ce script nécessite SUPABASE_SERVICE_ROLE_KEY ou au minimum EXPO_PUBLIC_SUPABASE_ANON_KEY');
  console.log('Pour ajouter les colonnes, utilisez le SQL Editor de Supabase:\n');

  const sql = readFileSync('./scripts/add-quest-columns.sql', 'utf8');
  console.log(sql);
  console.log('\nCopiez ce SQL dans le SQL Editor de Supabase Dashboard.\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('📝 Application de la migration SQL...\n');

const sql = readFileSync('./scripts/add-quest-columns.sql', 'utf8');

console.log('SQL à exécuter:');
console.log('═══════════════════════════════════════════════════════════════');
console.log(sql);
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('⚠️  Impossible d\'exécuter du SQL brut via l\'API Supabase JS.\n');
console.log('Pour appliquer cette migration:\n');
console.log('1. Allez sur https://supabase.com/dashboard');
console.log('2. Sélectionnez votre projet');
console.log('3. Allez dans "SQL Editor"');
console.log('4. Collez le SQL ci-dessus');
console.log('5. Cliquez sur "Run"\n');
console.log('Ou copiez le contenu de: scripts/add-quest-columns.sql\n');

process.exit(0);
