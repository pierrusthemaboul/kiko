import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

async function checkProfile() {
  console.log('\n🔍 === VÉRIFICATION PROFIL (sans RLS) ===\n');

  // Essayer avec maybeSingle pour éviter l'erreur
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  console.log('Résultat:');
  console.log('  - Erreur:', profileError);
  console.log('  - Profil trouvé:', profile ? 'OUI' : 'NON');

  if (profile) {
    console.log('\nDétails du profil:');
    console.log(JSON.stringify(profile, null, 2));
  }

  // Essayer aussi de compter
  const { count, error: countError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('id', userId);

  console.log('\nComptage:');
  console.log('  - Erreur:', countError);
  console.log('  - Nombre de profils:', count);
}

checkProfile().catch(console.error);
