// Test simple avec curl-like approach
import https from 'https';
import http from 'http';

const PRODUCTION_URL = 'https://pierrusthemaboul.supabase.co';

async function testConnection() {
  console.log('🔍 Test simple de connexion...');
  
  // Test 1: Vérifier si le domaine répond
  try {
    const response = await fetch(`${PRODUCTION_URL}/rest/v1/`);
    console.log('✅ Connexion HTTP réussie');
    
    // Test 2: Essayer de lister les fichiers via l'API REST
    const listResponse = await fetch(`${PRODUCTION_URL}/storage/v1/bucket/evenements-image/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-key',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-key'}`
      },
      body: JSON.stringify({
        prefix: '',
        limit: 100
      })
    });
    
    if (listResponse.ok) {
      const data = await listResponse.json();
      console.log(`📁 ${data.length} fichiers trouvés`);
      
      const webpFiles = data.filter(f => f.name.endsWith('.webp'));
      console.log(`🖼️  ${webpFiles.length} illustrations .webp`);
      
      if (webpFiles.length > 0) {
        console.log('\n🎉 VOS ILLUSTRATIONS SONT ACCESSIBLES !');
        console.log(`💰 Valeur: ${(webpFiles.length * 0.75).toFixed(2)}€`);
        
        webpFiles.slice(0, 5).forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.name}`);
        });
      }
    } else {
      console.log(`❌ Erreur API: ${listResponse.status}`);
      console.log('Message:', await listResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    
    // Alternative: Essayer avec une requête plus simple
    console.log('\n🔄 Test alternatif...');
    
    try {
      const simpleResponse = await fetch(`${PRODUCTION_URL}/functions/v1/`, {
        method: 'GET',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        }
      });
      
      console.log(`Status: ${simpleResponse.status}`);
      
      if (simpleResponse.ok) {
        console.log('✅ Le domaine est accessible');
        console.log('💡 Le problème vient probablement des permissions ou de l\'API Storage');
      }
      
    } catch (altError) {
      console.error('❌ Erreur alternative:', altError.message);
      console.log('\n🔧 SOLUTIONS POSSIBLES:');
      console.log('1. Vérifiez votre clé SUPABASE_SERVICE_ROLE_KEY dans .env');
      console.log('2. Allez sur dashboard.supabase.com manuellement');
      console.log('3. Vérifiez le bucket "evenements-image" dans Storage');
    }
  }
}

testConnection();

