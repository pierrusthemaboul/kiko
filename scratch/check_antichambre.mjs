import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAntichambre() {
  const { count, error } = await supabase
    .from('antichambre')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Nombre d\'événements dans antichambre:', count);

  const { data: sample, error: sError } = await supabase
    .from('antichambre')
    .select('*')
    .limit(1);

  if (sError) {
    console.error('Error sample:', sError);
  } else {
    console.log('Exemple d\'événement:', sample[0]);
  }
}

checkAntichambre();
