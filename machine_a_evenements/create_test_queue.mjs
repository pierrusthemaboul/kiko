import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Créer la table queue_sevent si elle n'existe pas
console.log('Création de la table queue_sevent...');

// Insérer un événement de test
console.log('Insertion d\'un événement de test...');

const { data, error } = await supabase
  .from('queue_sevent')
  .insert([
    {
      titre: 'Découverte de l\'Amérique',
      year: 1492,
      type: 'Exploration',
      region: 'Amérique',
      description: 'Christophe Colomb débarque aux Bahamas le 12 octobre 1492',
      specific_location: 'Bahamas',
      notoriete: 5,
      status: 'pending',
      created_at: new Date().toISOString()
    }
  ])
  .select();

if (error) {
  console.log('Erreur:', error.message);
  console.log('La table n\'existe probablement pas. Créez-la d\'abord dans Supabase.');
} else {
  console.log('✅ Événement inséré:', data);
}
