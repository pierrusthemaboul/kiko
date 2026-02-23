import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Réinitialiser un événement à 'pending' pour le test
const { data, error } = await supabase
  .from('queue_sevent')
  .update({ status: 'pending', processed_at: null, error_log: null })
  .eq('titre', 'Bataille d\'Austerlitz')
  .select();

if (error) {
  console.log('Erreur:', error.message);
} else {
  console.log('✅ Événement réinitialisé à pending:', data);
}
