import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function applyMigration() {
  try {
    console.log('Application de la migration pour ajouter la colonne mode à game_scores...');

    // Lire le fichier SQL
    const sqlContent = readFileSync(join(__dirname, 'add-mode-to-game-scores.sql'), 'utf-8');

    // Séparer les commandes SQL (ignorer les commentaires et les lignes vides)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    // Exécuter chaque commande
    for (const command of commands) {
      if (command.includes('SELECT')) {
        // Pour les SELECT, on utilise rpc ou from
        continue; // On skip la vérification pour l'instant
      }

      console.log('\nExécution de:', command.substring(0, 100) + '...');

      const { error } = await supabase.rpc('exec_sql', { sql: command });

      if (error) {
        console.error('Erreur lors de l\'exécution:', error);
        // On continue quand même pour voir toutes les erreurs
      } else {
        console.log('✓ Commande exécutée avec succès');
      }
    }

    // Vérifier que la colonne a bien été ajoutée
    console.log('\n\nVérification de la structure...');
    const { data, error } = await supabase
      .from('game_scores')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Erreur lors de la vérification:', error);
    } else if (data && data.length > 0) {
      console.log('Colonnes disponibles:', Object.keys(data[0]));
      console.log('Exemple de données:', JSON.stringify(data[0], null, 2));
    }

    console.log('\n✅ Migration terminée!');
  } catch (error) {
    console.error('Erreur:', error);
  }
}

applyMigration();
