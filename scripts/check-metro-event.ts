import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ppxmtnuewcixbbmhnzzc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkMetroEvent() {
  // Rechercher l'événement de la ligne 1 du métro
  const { data, error } = await supabase
    .from('evenements')
    .select('id, titre, date, illustration_url, notoriete')
    .or('titre.ilike.%métro%,titre.ilike.%metro%,titre.ilike.%ligne 1%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== ÉVÉNEMENTS MÉTRO TROUVÉS ===');
  console.log('Total:', data?.length || 0);

  data?.forEach((event, index) => {
    console.log(`\n--- Événement ${index + 1} ---`);
    console.log('ID:', event.id);
    console.log('Titre:', event.titre);
    console.log('Date:', event.date);
    console.log('Illustration URL:', event.illustration_url || 'NULL/MANQUANTE');
    console.log('Notoriété:', event.notoriete);
  });
}

checkMetroEvent();
