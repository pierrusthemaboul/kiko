import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('queue_sevent')
  .select('id, titre, year, status')
  .eq('status', 'pending')
  .limit(5);

if (error) {
  console.log('Erreur:', error.message);
} else if (!data || data.length === 0) {
  console.log('Aucun événement en attente dans queue_sevent');
} else {
  console.log(`${data.length} événement(s) en attente:`);
  data.forEach((e, i) => console.log(`${i+1}. ${e.titre} (${e.year})`));
}
