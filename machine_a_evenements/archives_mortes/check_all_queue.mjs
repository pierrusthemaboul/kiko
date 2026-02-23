import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Tous les événements, peu importe le status
const { data, error, count } = await supabase
  .from('queue_sevent')
  .select('*', { count: 'exact' })
  .limit(10);

if (error) {
  console.log('Erreur:', error.message);
} else {
  console.log(`Total d'événements dans queue_sevent: ${count}`);
  if (data && data.length > 0) {
    console.log('\nPremiers événements:');
    data.forEach((e, i) => {
      console.log(`${i+1}. "${e.titre}" (${e.year}) - status: ${e.status || 'null'}`);
    });
  } else {
    console.log('La table queue_sevent est complètement vide.');
  }
}
