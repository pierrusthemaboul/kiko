import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testEmbeddingSearch() {
  try {
    // Test avec embedding_vocal
    console.log('Test recherche avec embedding_vocal...');
    
    // Chercher un événement spécifique
    const { data: testEvent, error: testError } = await supabase
      .from('evenements')
      .select('id, titre, embedding_vocal')
      .ilike('titre', 'traité de maastricht')
      .single();
    
    if (testError) {
      console.log('Événement non trouvé ou erreur:', testError.message);
      
      // Prendre le premier événement avec embedding_vocal
      const { data: firstEvent } = await supabase
        .from('evenements')
        .select('id, titre, embedding_vocal')
        .not('embedding_vocal', 'is', null)
        .limit(1)
        .single();
      
      if (firstEvent) {
        console.log(`\nTest avec l'événement: "${firstEvent.titre}"`);
        
        // Utiliser son embedding pour chercher des similarités
        const { data: matches, error: matchError } = await supabase
          .rpc('match_evenements', {
            query_embedding: firstEvent.embedding_vocal,
            match_threshold: 0.9,
            match_count: 5
          });
        
        if (matchError) {
          console.log('Erreur fonction match_evenements:', matchError.message);
        } else {
          console.log('Résultats de recherche similaire:', matches?.length || 0);
          matches?.forEach(m => console.log(`- ${m.titre} (score: ${m.similarity?.toFixed(4)})`));
        }
      }
    } else {
      console.log('Événement trouvé:', testEvent);
    }
    
    // Vérifier combien ont embedding_vocal
    const { count: countWithVocal } = await supabase
      .from('evenements')
      .select('*', { count: 'exact', head: true })
      .not('embedding_vocal', 'is', null);
    
    const { count: totalCount } = await supabase
      .from('evenements')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\nÉvénements avec embedding_vocal: ${countWithVocal}/${totalCount} (${((countWithVocal/totalCount)*100).toFixed(1)}%)`);
    
  } catch (err) {
    console.error('Erreur:', err.message);
  }
}

testEmbeddingSearch();
