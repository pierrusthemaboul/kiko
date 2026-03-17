import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le .env
dotenv.config({ path: path.join(__dirname, '.env') });

// URL de production
const PRODUCTION_URL = 'https://pierrusthemaboul.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Test de connexion à Supabase Production...');
console.log(`🌐 URL: ${PRODUCTION_URL}`);
console.log(`🔑 Clé: ${supabaseKey ? 'présente' : 'absente'}`);

if (!supabaseKey) {
  console.error('❌ Clé SUPABASE_SERVICE_ROLE_KEY requise');
  process.exit(1);
}

// Créer le client avec options CORS
const supabase = createClient(PRODUCTION_URL, supabaseKey, {
  global: {
    fetch: async (url, options = {}) => {
      // Ajouter headers pour CORS
      const headers = {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        ...options.headers
      };
      
      return fetch(url, { ...options, headers });
    }
  }
});

async function checkStorage() {
  try {
    console.log('\n📡 Test de connexion...');
    
    // Test simple: lister les buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Erreur buckets:', bucketError.message);
      return;
    }
    
    console.log(`✅ ${buckets.length} buckets trouvés`);
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name}`);
    });
    
    // Vérifier le bucket evenements-image
    const evenementsBucket = buckets.find(b => b.name === 'evenements-image');
    
    if (evenementsBucket) {
      console.log('\n🔍 Vérification du bucket evenements-image...');
      
      // Lister les fichiers (avec pagination)
      let allFiles = [];
      let hasMore = true;
      let page = 0;
      
      while (hasMore && page < 10) { // Limiter à 10 pages pour éviter l'infini
        const { data: files, error } = await supabase.storage
          .from('evenements-image')
          .list('', { 
            limit: 100,
            offset: page * 100 
          });
        
        if (error) {
          console.error('❌ Erreur listage:', error.message);
          break;
        }
        
        if (files.length === 0) {
          hasMore = false;
        } else {
          allFiles = allFiles.concat(files);
          console.log(`📄 Page ${page + 1}: ${files.length} fichiers`);
          page++;
        }
      }
      
      // Compter les .webp
      const webpFiles = allFiles.filter(f => f.name.endsWith('.webp'));
      
      console.log(`\n🎉 RÉSULTATS:`);
      console.log(`📁 Total fichiers: ${allFiles.length}`);
      console.log(`🖼️  Illustrations .webp: ${webpFiles.length}`);
      
      const estimatedValue = webpFiles.length * 0.75;
      console.log(`💰 VALEUR ESTIMÉE: ${estimatedValue.toFixed(2)}€`);
      
      if (webpFiles.length > 0) {
        console.log(`\n📋 EXEMPLES:`);
        webpFiles.slice(0, 10).forEach((file, index) => {
          const size = file.size ? `${(file.size / 1024).toFixed(1)}KB` : 'unknown';
          console.log(`   ${index + 1}. ${file.name} (${size})`);
        });
        
        console.log(`\n🎯 VOS ILLUSTRATIONS SONT SUR PRODUCTION !`);
        console.log(`💡 Pour les télécharger: node download_production_images.mjs`);
      }
      
    } else {
      console.log('❌ Bucket evenements-image non trouvé');
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

checkStorage();

