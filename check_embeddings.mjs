import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function checkEmbeddings() {
  try {
    // Vérifier si la colonne embedding existe
    const { data: columns, error: colError } = await supabase
      .from('evenements')
      .select('*')
      .limit(1);
    
    if (colError) throw colError;
    
    console.log('Colonnes disponibles:', Object.keys(columns[0] || {}));
    
    // Compter les événements avec embedding
    const { data: withEmbedding, error: embError } = await supabase
      .from('evenements')
      .select('id, titre')
      .not('embedding', 'is', null)
      .limit(5);
    
    if (embError) throw embError;
    
    console.log('\nÉvénements avec embedding (sample):', withEmbedding?.length || 0);
    withEmbedding?.forEach(e => console.log(`- ${e.titre}`));
    
    // Compter le total
    const { count } = await supabase
      .from('evenements')
      .select('*', { count: 'exact', head: true });
    
    console.log('\nTotal événements:', count);
    
    // Compter ceux sans embedding
    const { count: countWithout } = await supabase
      .from('evenements')
      .select('*', { count: 'exact', head: true })
      .is('embedding', null);
    
    console.log('Événements sans embedding:', countWithout);
    console.log('Pourcentage avec embedding:', count ? (((count - (countWithout || 0)) / count) * 100).toFixed(2) + '%' : 'N/A');
    
  } catch (err) {
    console.error('Erreur:', err.message);
  }
}

checkEmbeddings();
