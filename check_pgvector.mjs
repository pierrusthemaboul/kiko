import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function checkPgvector() {
  try {
    // Vérifier si l'extension pgvector est installée
    const { data, error } = await supabase
      .rpc('exec_sql', { 
        sql: "SELECT 1 FROM pg_extension WHERE extname = 'vector';" 
      });
    
    if (error) {
      console.log('Erreur:', error.message);
      
      // Essayer une requête directe avec vector
      try {
        const { data: test, error: testErr } = await supabase
          .from('evenements')
          .select('id, titre')
          .limit(1);
          
        if (testErr) throw testErr;
        
        console.log('Test requête simple OK');
        
        // Essayer une requête avec distance cosine (embedding_vocal est un vector)
        const { data: vectorTest, error: vectorErr } = await supabase
          .from('evenements')
          .select('id, titre, embedding_vocal')
          .limit(1);
          
        if (vectorErr) throw vectorErr;
        console.log('embedding_vocal accessible:', vectorTest[0]?.embedding_vocal?.length || 'null');
        
      } catch (e) {
        console.log('Erreur test vector:', e.message);
      }
    } else {
      console.log('pgvector installé:', data);
    }
    
  } catch (err) {
    console.error('Erreur:', err.message);
  }
}

checkPgvector();
