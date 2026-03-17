import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 VÉRIFICATION TABLE LABO (LOCAL)');

async function checkLaboTable() {
  try {
    // Vérifier si la table labo existe
    const { data: laboData, error: laboError } = await supabase
      .from('labo')
      .select('count', { count: 'exact', head: true });
    
    if (laboError) {
      console.log('❌ Table labo inaccessible:', laboError.message);
      console.log('🔍 Tentative connexion locale...');
      
      // Essayer avec l'URL locale
      const localSupabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY);
      
      const { data: localLabo, error: localError } = await localSupabase
        .from('labo')
        .select('count', { count: 'exact', head: true });
      
      if (localError) {
        console.log('❌ Table labo locale inaccessible:', localError.message);
        console.log('📋 La table labo n\'existe probablement que dans votre environnement local');
      } else {
        console.log(`✅ Table labo locale: ${localLabo || 0} records`);
        
        // Vérifier les embeddings locaux
        const { data: localEmbeds } = await localSupabase
          .from('labo_embeddings')
          .select('count', { count: 'exact', head: true });
        
        console.log(`📊 Embeddings locaux: ${localEmbeds || 0}`);
      }
    } else {
      console.log(`✅ Table labo production: ${laboData || 0} records`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkLaboTable();

