import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  console.log('\n🔧 === MIGRATION: Ajouter "precision" au mode runs ===\n');

  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'add-precision-mode-to-runs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 SQL à exécuter:');
    console.log('---');
    console.log(sql);
    console.log('---\n');

    // Note: L'API Supabase avec la clé anon ne permet pas d'exécuter du DDL
    // Il faut utiliser le dashboard Supabase ou une clé service_role
    console.log('⚠️  ATTENTION:');
    console.log('La clé anon ne permet pas d\'exécuter des migrations DDL.');
    console.log('Vous devez exécuter cette migration via:');
    console.log('  1. Le SQL Editor du dashboard Supabase');
    console.log('  2. Ou en utilisant une clé service_role\n');

    console.log('📋 Étapes à suivre:');
    console.log('  1. Ouvrir https://supabase.com/dashboard/project/ppxmtnuewcixbbmhnzzc/sql/new');
    console.log('  2. Copier le contenu du fichier: scripts/add-precision-mode-to-runs.sql');
    console.log('  3. Coller dans le SQL Editor');
    console.log('  4. Cliquer sur "Run"');
    console.log('  5. Vérifier que la contrainte a été mise à jour\n');

    console.log('✅ Fichier de migration créé: scripts/add-precision-mode-to-runs.sql\n');
  } catch (error) {
    console.error('❌ Erreur lors de la préparation de la migration:', error);
    process.exit(1);
  }
}

applyMigration().catch(console.error);

