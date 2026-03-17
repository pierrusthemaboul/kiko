import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le .env
dotenv.config({ path: path.join(__dirname, '.env') });

// URL de production (à adapter selon votre projet)
const PRODUCTION_URL = 'https://pierrusthemaboul.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ Clé SUPABASE_SERVICE_ROLE_KEY non trouvée dans .env');
  process.exit(1);
}

const supabase = createClient(PRODUCTION_URL, supabaseKey);

async function checkProductionStorage() {
  console.log('🔍 Vérification du storage PRODUCTION Supabase...');
  console.log(`🌐 URL: ${PRODUCTION_URL}`);
  
  try {
    // Lister tous les fichiers dans le bucket evenements-image
    const { data: files, error } = await supabase.storage
      .from('evenements-image')
      .list('', { limit: 5000 });
    
    if (error) throw error;
    
    console.log(`📁 ${files.length} fichiers trouvés dans evenements-image (PRODUCTION)`);
    
    // Compter les fichiers .webp
    const webpFiles = files.filter(f => f.name.endsWith('.webp'));
    console.log(`🖼️  ${webpFiles.length} fichiers .webp (illustrations)`);
    
    // Estimer la valeur
    const estimatedValue = webpFiles.length * 0.75;
    console.log(`💰 VALEUR ESTIMÉE: ${webpFiles.length} × 0.75€ = ${estimatedValue.toFixed(2)}€`);
    
    // Vérifier la taille totale
    const totalSize = webpFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`💾 Taille totale: ${sizeMB} MB`);
    
    // Afficher les 15 premiers
    console.log('\n📋 EXEMPLES D\'ILLUSTRATIONS TROUVÉES:');
    webpFiles.slice(0, 15).forEach((file, index) => {
      const size = file.size ? `${(file.size / 1024).toFixed(1)}KB` : 'unknown';
      const publicUrl = `${PRODUCTION_URL}/storage/v1/object/public/evenements-image/${file.name}`;
      console.log(`   ${index + 1}. ${file.name} (${size})`);
      console.log(`      ${publicUrl}`);
    });
    
    // Vérifier les événements avec IMAGE_DONE dans le CSV
    const fs = await import('fs');
    const csvContent = fs.readFileSync('labo_rows.csv', 'utf8');
    const imageDoneLines = csvContent.split('\n').filter(line => line.includes('IMAGE_DONE'));
    
    console.log(`\n📊 Événements avec IMAGE_DONE dans votre CSV: ${imageDoneLines.length}`);
    
    // Extraire les noms de fichiers du CSV
    const urls = csvContent.match(/http:\/\/127\.0\.0\.1:54321\/storage\/v1\/object\/public\/evenements-image\/[^,\n]+/g) || [];
    const csvFilenames = [...new Set(urls.map(url => url.split('/').pop()))];
    
    console.log(`🔗 Noms de fichiers dans CSV: ${csvFilenames.length}`);
    
    // Comparer avec les fichiers de production
    const storageFilenames = webpFiles.map(f => f.name);
    const presentInBoth = csvFilenames.filter(name => storageFilenames.includes(name));
    
    console.log(`\n✅ Illustrations correspondantes: ${presentInBoth.length}`);
    console.log(`🎯 ILLUSTRATIONS À RÉCUPÉRER: ${webpFiles.length - presentInBoth.length}`);
    
    if (webpFiles.length > 100) {
      console.log(`\n🎉 EXCELLENT ! Vos ${webpFiles.length} illustrations sont sur Supabase Production !`);
      console.log(`💰 Valeur totale: ${estimatedValue.toFixed(2)}€`);
      console.log(`\n💡 ACTION IMMÉDIATE: Téléchargez-les avec:`);
      console.log(`   node download_production_images.mjs`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.message.includes('Invalid JWT')) {
      console.log('💡 Vérifiez que votre clé SUPABASE_SERVICE_ROLE_KEY est correcte');
    }
  }
}

checkProductionStorage();

