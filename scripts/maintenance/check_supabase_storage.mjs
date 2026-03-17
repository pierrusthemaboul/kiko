import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Lire les clés depuis le fichier .env
const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Clés Supabase non trouvées dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  console.log('🔍 Vérification du storage Supabase...');
  
  try {
    // Lister tous les fichiers dans le bucket evenements-image
    const { data: files, error } = await supabase.storage
      .from('evenements-image')
      .list('', { limit: 3000 });
    
    if (error) throw error;
    
    console.log(`📁 ${files.length} fichiers trouvés dans evenements-image`);
    
    // Compter les fichiers .webp
    const webpFiles = files.filter(f => f.name.endsWith('.webp'));
    console.log(`🖼️  ${webpFiles.length} fichiers .webp (illustrations)`);
    
    // Afficher les 10 premiers
    console.log('\n📋 Exemples de fichiers:');
    webpFiles.slice(0, 10).forEach(file => {
      console.log(`   - ${file.name} (${file.size || 'unknown'} bytes)`);
    });
    
    // Vérifier les URLs dans le CSV
    const csvContent = fs.readFileSync('labo_rows.csv', 'utf8');
    const urls = csvContent.match(/http:\/\/127\.0\.0\.1:54321\/storage\/v1\/object\/public\/evenements-image\/[^,\n]+/g) || [];
    const uniqueUrls = [...new Set(urls)];
    
    console.log(`\n🔗 URLs dans le CSV: ${uniqueUrls.length}`);
    
    // Comparer
    const csvFilenames = uniqueUrls.map(url => url.split('/').pop());
    const storageFilenames = webpFiles.map(f => f.name);
    
    const missingInStorage = csvFilenames.filter(name => !storageFilenames.includes(name));
    const missingInCsv = storageFilenames.filter(name => !csvFilenames.includes(name));
    
    console.log(`\n❌ Manquants dans storage: ${missingInStorage.length}`);
    if (missingInStorage.length > 0) {
      console.log('   Exemples:', missingInStorage.slice(0, 5));
    }
    
    console.log(`\n❓ Manquants dans CSV: ${missingInCsv.length}`);
    if (missingInCsv.length > 0) {
      console.log('   Exemples:', missingInCsv.slice(0, 5));
    }
    
    console.log(`\n💰 Estimation: ${webpFiles.length} illustrations × ~0.75€ = ${(webpFiles.length * 0.75).toFixed(2)}€`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkStorage();

